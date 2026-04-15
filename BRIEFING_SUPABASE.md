# Briefing: Migração para Supabase + Autenticação

## Contexto

O formulador de dietas para vacas leiteiras está funcionando com todas as funcionalidades core implementadas. O problema atual é que usa **localStorage** para persistência — isso funciona apenas para um usuário em um dispositivo. Precisamos suportar:

- 50 alunos simultâneos em sala de aula
- Cada aluno com login próprio (e-mail + senha)
- Dados salvos na nuvem (aluno continua em casa)
- Banco de alimentos genérico compartilhado + banco pessoal por usuário
- Custo zero de infraestrutura (Supabase free tier)

---

## O que NÃO mudar

Todo o código de cálculo está perfeito e não deve ser tocado:
- `src/utils/calculos.ts` — fórmulas NRC 2021, taxas de passagem, DCAD, leite potencial
- `src/utils/referencias.ts` — referências nutricionais e funções de status
- `src/utils/exportar.ts` — exportação XLSX
- Todos os componentes visuais (PainelAnimal, PainelResultados, TabelaIngredientes, Indicadores)
- As páginas Formulador.tsx e Dietas.tsx (apenas pequenos ajustes de loading state)

---

## O que mudar

### 1. `src/utils/storage.ts` → substituir completamente por `src/lib/supabase.ts`

O arquivo `storage.ts` atual usa localStorage. Criar `src/lib/supabase.ts` com cliente Supabase e todas as operações de banco.

### 2. `src/context/DietaContext.tsx` → adicionar estados de auth + loading

Adicionar suporte a usuário autenticado, loading states e operações assíncronas.

### 3. Novas páginas: `src/pages/Login.tsx` e `src/pages/Cadastro.tsx`

### 4. `src/App.tsx` → adicionar rotas protegidas

---

## Setup Supabase

### Instalar dependência:
```bash
npm install @supabase/supabase-js
```

### Variáveis de ambiente (criar `.env.local`):
```
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

### Cliente Supabase (`src/lib/supabase.ts`):
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

---

## Schema do Banco de Dados Supabase

Executar no SQL Editor do Supabase:

```sql
-- Tabela de perfis de usuário
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT,
  tipo TEXT DEFAULT 'aluno' CHECK (tipo IN ('aluno', 'professor', 'nutricionista')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para criar perfil automaticamente no cadastro
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nome)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nome');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Tabela de alimentos customizados por usuário
CREATE TABLE alimentos_custom (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dados JSONB NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de dietas por usuário
CREATE TABLE dietas (
  id TEXT PRIMARY KEY, -- mantém o id gerado no frontend
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dados JSONB NOT NULL, -- objeto Dieta completo serializado
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security — cada usuário só vê seus próprios dados
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alimentos_custom ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê só seu perfil"
  ON profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Usuário vê só seus alimentos"
  ON alimentos_custom FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Usuário vê só suas dietas"
  ON dietas FOR ALL USING (auth.uid() = user_id);
```

---

## Novo `src/lib/supabase.ts` — operações completas

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Dieta, Alimento } from '../types';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── AUTH ───────────────────────────────────────────────

export async function signUp(email: string, senha: string, nome: string) {
  return supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } }
  });
}

export async function signIn(email: string, senha: string) {
  return supabase.auth.signInWithPassword({ email, password: senha });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── DIETAS ─────────────────────────────────────────────

export async function getDietas(): Promise<Dieta[]> {
  const { data, error } = await supabase
    .from('dietas')
    .select('dados')
    .order('atualizado_em', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(row => row.dados as Dieta);
}

export async function saveDieta(dieta: Dieta): Promise<void> {
  const user = await getUser();
  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('dietas')
    .upsert({
      id: dieta.id,
      user_id: user.id,
      dados: dieta,
      atualizado_em: new Date().toISOString()
    });

  if (error) throw error;
}

export async function deleteDieta(id: string): Promise<void> {
  const { error } = await supabase
    .from('dietas')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── ALIMENTOS CUSTOM ───────────────────────────────────

export async function getAlimentosCustom(): Promise<Alimento[]> {
  const { data, error } = await supabase
    .from('alimentos_custom')
    .select('dados')
    .order('criado_em', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(row => row.dados as Alimento);
}

export async function saveAlimentoCustom(alimento: Alimento): Promise<void> {
  const user = await getUser();
  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('alimentos_custom')
    .upsert({
      id: alimento.id ?? crypto.randomUUID(),
      user_id: user.id,
      dados: alimento,
      atualizado_em: new Date().toISOString()
    });

  if (error) throw error;
}

export async function deleteAlimentoCustom(id: string): Promise<void> {
  const { error } = await supabase
    .from('alimentos_custom')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
```

---

## Atualização do `DietaContext.tsx`

O contexto precisa:
1. Verificar se usuário está logado ao iniciar
2. Carregar dietas e alimentos do Supabase (async)
3. Salvar no Supabase em vez de localStorage
4. Expor `usuario`, `carregando` e `logout`

```typescript
// Adicionar ao contexto existente:

interface DietaContextType {
  // ... tudo que já existe ...
  usuario: User | null;
  carregando: boolean;
  logout: () => Promise<void>;
}

// No Provider, substituir:
// getDietas() → await getDietasSupabase()
// saveDietas() → await saveDieta(dieta)
// getAlimentosCustom() → await getAlimentosCustom()
// saveAlimentosCustom() → await saveAlimentoCustom(alimento)
```

---

## Nova página `src/pages/Login.tsx`

```typescript
// Formulário simples com:
// - Campo e-mail
// - Campo senha
// - Botão "Entrar"
// - Link "Criar conta"
// - Tratamento de erro (e-mail/senha incorretos)
// - Loading state durante autenticação
// Ao fazer login com sucesso → navigate('/')
```

---

## Nova página `src/pages/Cadastro.tsx`

```typescript
// Formulário com:
// - Campo nome
// - Campo e-mail
// - Campo senha
// - Campo confirmar senha
// - Botão "Criar conta"
// - Link "Já tenho conta"
// Ao cadastrar com sucesso → navigate('/') ou mostrar mensagem de confirmação de e-mail
```

---

## Atualização do `src/App.tsx`

```typescript
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Formulador from './pages/Formulador';
import Dietas from './pages/Dietas';
import Alimentos from './pages/Alimentos';
import Layout from './components/Layout';

export default function App() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAutenticado(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAutenticado(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Loading inicial
  if (autenticado === null) return <div className="flex items-center justify-center h-screen">Carregando...</div>;

  return (
    <Routes>
      <Route path="/login" element={!autenticado ? <Login /> : <Navigate to="/" />} />
      <Route path="/cadastro" element={!autenticado ? <Cadastro /> : <Navigate to="/" />} />
      {/* Rotas protegidas */}
      <Route path="/" element={autenticado ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={<Formulador />} />
        <Route path="alimentos" element={<Alimentos />} />
        <Route path="dietas" element={<Dietas />} />
      </Route>
    </Routes>
  );
}
```

---

## Checklist de implementação

### Passo 1 — Setup
- [ ] `npm install @supabase/supabase-js`
- [ ] Criar projeto no supabase.com
- [ ] Executar SQL do schema no SQL Editor
- [ ] Criar `.env.local` com as credenciais
- [ ] Criar `src/lib/supabase.ts`

### Passo 2 — Autenticação
- [ ] Criar `src/pages/Login.tsx`
- [ ] Criar `src/pages/Cadastro.tsx`
- [ ] Atualizar `src/App.tsx` com rotas protegidas

### Passo 3 — Migrar storage
- [ ] Atualizar `DietaContext.tsx` para usar Supabase
- [ ] Remover dependências do `storage.ts` (localStorage)
- [ ] Adicionar loading states nas páginas

### Passo 4 — Navbar
- [ ] Adicionar nome do usuário logado na navbar
- [ ] Adicionar botão "Sair"

### Passo 5 — Teste
- [ ] Criar 2 contas de teste
- [ ] Verificar que dados são isolados por usuário
- [ ] Testar com múltiplas abas simultâneas

---

## Observações importantes

1. **Não apagar o `storage.ts`** ainda — manter como fallback durante transição
2. **O banco de alimentos genérico** (os 96 do `alimentos.json`) continua sendo carregado do arquivo local — apenas os alimentos customizados vão para o Supabase
3. **Supabase free tier** suporta até 500MB de banco e conexões ilimitadas — suficiente para centenas de alunos
4. **Confirmação de e-mail**: por padrão o Supabase exige confirmar e-mail. Para testes em sala de aula, desabilitar em: Supabase Dashboard → Authentication → Settings → "Enable email confirmations" → desligar
5. **Confirmação de e-mail para produção**: quando for ao ar para usuários reais, reativar a confirmação de e-mail no Supabase Dashboard.

---

## Deploy na Web (Vercel) — Passo a Passo Completo

Após a integração com Supabase estar funcionando localmente, seguir estes passos para colocar a aplicação na internet para qualquer pessoa acessar.

### Pré-requisito: projeto no GitHub
O código precisa estar em um repositório GitHub. Se ainda não estiver:
```bash
git init
git add .
git commit -m "feat: integração Supabase"
git remote add origin https://github.com/seu-usuario/formulador-dietas.git
git push -u origin main
```

### Passo 1 — Criar conta no Vercel
1. Acesse **vercel.com**
2. Clique em "Sign Up" → "Continue with GitHub"
3. Autorize o Vercel a acessar seus repositórios

### Passo 2 — Importar o projeto
1. No dashboard do Vercel, clique em **"Add New Project"**
2. Selecione o repositório `formulador-dietas`
3. O Vercel detecta automaticamente que é Vite — não precisa configurar nada de build
4. **Antes de clicar em Deploy**, adicionar as variáveis de ambiente (próximo passo)

### Passo 3 — Adicionar variáveis de ambiente
Ainda na tela de configuração do projeto no Vercel, na seção **"Environment Variables"**:

| Nome | Valor |
|------|-------|
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase (ex: https://xyzxyz.supabase.co) |
| `VITE_SUPABASE_ANON_KEY` | Chave anon/public do Supabase |

Onde encontrar esses valores: Supabase Dashboard → Settings → API → "Project URL" e "anon public"

### Passo 4 — Deploy
1. Clique em **"Deploy"**
2. Aguarde ~2 minutos
3. O Vercel gera um link público: `formulador-dietas.vercel.app`

### Passo 5 — Domínio personalizado (opcional)
Se quiser um endereço mais profissional (ex: `formulador.rehagro.com.br`):
1. No projeto no Vercel → "Settings" → "Domains"
2. Adicionar o domínio desejado
3. Seguir as instruções para configurar o DNS

### Atualizações automáticas
A partir de agora, o fluxo é:
```
Claude Code (edita) → git push → GitHub → Vercel publica automaticamente
```
Qualquer `git push` no branch `main` atualiza o site em ~1 minuto, sem nenhuma ação manual.

### Configurar Supabase para aceitar o domínio de produção
No Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://formulador-dietas.vercel.app` (ou seu domínio personalizado)
- **Redirect URLs**: adicionar `https://formulador-dietas.vercel.app/**`

Isso é necessário para o login/cadastro funcionar corretamente em produção.

### Resumo da infraestrutura em produção
```
Usuário (navegador)
      ↓
   Vercel
(hospeda o React — gratuito)
      ↓
  Supabase
(banco de dados + autenticação — gratuito até 500MB)
```
Custo total: R$ 0,00/mês para até centenas de usuários simultâneos.

---

## Exportação de Dietas em PDF

### Contexto
Nutricionistas precisam entregar um relatório profissional ao produtor com a dieta formulada. O PDF deve ser gerado direto no navegador, sem servidor, com visual moderno e identificação clara da dieta pelo nome.

### Biblioteca recomendada
Usar **@react-pdf/renderer** — permite desenhar o PDF como componentes React, resultando em layouts muito mais profissionais e controlados que o jsPDF.

```bash
npm install @react-pdf/renderer
```

### Identificação da dieta
O nome da dieta (que o nutricionista já define, ex: "Lote A - Alta Produção - Abril 2026") aparece com destaque no cabeçalho do PDF. Não é necessário campo adicional — o nome já cumpre essa função.

### Layout do PDF

```
┌─────────────────────────────────────────────────────┐
│  🐄 FORMULADOR DE DIETAS — NRC 2021                 │
│  Nome da dieta: Lote A - Alta Produção - Abril 2026 │
│  Data de geração: 15/04/2026                        │
├─────────────────────────────────────────────────────┤
│  DADOS DO ANIMAL                                    │
│  Peso: 600 kg  |  DEL: 100 d  |  Leite: 30 kg/d   │
│  Gordura: 3,8%  |  Proteína: 3,2%  |  ECC: 3       │
│  Paridade: Vaca adulta                              │
│                                                     │
│  CMS Exigida: 21,4 kg/d   CMS Real: 21,1 kg/d ✅  │
├─────────────────────────────────────────────────────┤
│  INGREDIENTES DA DIETA                              │
│  Alimento            kg MN    kg MS    % MS         │
│  Silagem de Milho    12,0     4,2      19,9%        │
│  Farelo de Soja       2,5     2,2      10,6%        │
│  Milho Moído Fino     4,0     3,5      16,6%        │
│  ...                                                │
│  TOTAL               28,3    21,1     100%          │
├─────────────────────────────────────────────────────┤
│  RESULTADOS NUTRICIONAIS                            │
│  Nutriente   Valor    Meta         Status           │
│  PB          16,2%    14–17%       🟢 OK            │
│  FDN         19,8%    ≥ 18%        🟢 OK            │
│  CNF         38,1%    20–45%       🟢 OK            │
│  NEl         1,68     calculada    —                │
│  Ca           0,4%    0,6–0,8%     🔴 Baixo         │
│  P            0,35%   0,35–0,40%   🟢 OK            │
│  ...                                                │
├─────────────────────────────────────────────────────┤
│  INDICADORES                                        │
│  FDNF/PV: 0,8%  |  % Forragem: 48%  |  Ca/P: 1,1  │
│  Lis/Met: 2,8   |  DCAD: 180 mEq/kg               │
│                                                     │
│  Leite potencial NEl:   32,1 kg/d                  │
│  Leite potencial Prot:  29,8 kg/d                  │
├─────────────────────────────────────────────────────┤
│  CUSTOS                                             │
│  R$ 18,50/dia  |  R$ 0,87/kg MS  |  R$ 0,62/litro │
└─────────────────────────────────────────────────────┘
```

### Onde adicionar o botão
- Na página **Formulador** — botão "Exportar PDF" ao lado do "Exportar XLSX" já existente
- Na página **Dietas** — ícone de PDF em cada card de dieta salva, ao lado do ícone de XLSX

### Checklist de implementação
- [ ] `npm install @react-pdf/renderer`
- [ ] Criar `src/utils/exportarPDF.tsx` com o componente do documento
- [ ] Adicionar botão "Exportar PDF" no Formulador.tsx
- [ ] Adicionar ícone PDF nos cards da página Dietas.tsx

### Custo
Zero — biblioteca open source, geração 100% no navegador sem servidor.
