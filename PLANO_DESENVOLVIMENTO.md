# Plano de Desenvolvimento — Formulador de Dietas
**Rehagro · NASEM 2021 · Atualizado em: 2026-05-18**

---

## Visão Geral

Expandir o formulador de vaca em lactação para uma plataforma multi-categoria de nutrição animal baseada no NRC 2021, com workspace de abas simultâneas, comparação avançada de formulações e otimização de custo.

**Público-alvo:** Alunos em aula, consultores em fazenda e técnicos em casa.
**Deploy:** formulador-dietas.vercel.app
**Repositório:** github.com/Rehagro/formulador-dietas

---

## Decisões Arquiteturais Consolidadas

### Sistema de Abas de Trabalho
- Cada aba = uma dieta em formulação para uma categoria específica
- O usuário abre abas sob demanda (não aparecem todas por padrão)
- Ao trocar de aba: painel do animal + tabela de ingredientes + resultados mudam completamente
- Cada aba mantém seu estado independente até ser salva
- Ao salvar, a dieta recebe um **badge de categoria** na tela "Minhas Dietas"
- Banco de alimentos é **compartilhado** entre todas as categorias

### Organização das Dietas Salvas
- Todas as categorias convivem na mesma tela "Minhas Dietas"
- Identificação visual por badge/tag de categoria
- Comparação avançada acessível a partir dessa tela (Fase 7)

---

## Categorias Planejadas

| # | Categoria | Fase | Descrição |
|---|---|---|---|
| 1 | Vaca em Lactação | ✅ Concluído | Motor NRC 2021 completo e verificado |
| 2 | Vaca Seca (far-off) | Fase 1 | ~45–60 dias antes do parto |
| 3 | Pré-parto (close-up) | Fase 2 | Últimas 3 semanas. DCAD crítico |
| 4 | Pós-parto / Transição | Fase 3 | Primeiras 3–4 semanas. Balanço energético negativo |
| 5 | Novilhas em crescimento | Fase 4 | Reposição leiteira. Meta: GDP e idade ao 1º parto |
| 6 | Bezerros | Fase 5 | Pré-ruminante: dieta líquida + iniciador sólido |

---

## Fases de Desenvolvimento

---

### Fase 0 — Refatoração Arquitetural
**Pré-requisito de todas as outras fases.**

**Objetivo:** Criar o esqueleto que suporta múltiplas categorias sem quebrar o que já existe.

**Mudanças técnicas:**
- Novo tipo `CategoriaAnimal = 'lactacao' | 'vaca_seca' | 'pre_parto' | 'pos_parto' | 'novilha' | 'bezerro'`
- Nova interface `AbaFormulacao { id, categoria, animal, slots }`
- `DietaContext`: substituir dieta única por `abas[]` + `abaAtiva`
- Interface `Dieta` ganha campo `categoriaAnimal`
- Componente de abas no topo do formulador (usuário adiciona abas sob demanda)
- `PainelAnimal` vira condicional — renderiza campos diferentes por categoria
- `PainelResultados` vira condicional — referências e indicadores por categoria
- `calculos.ts` ganha dispatcher que roteia para a função correta por categoria

**Entregável:** Formulador funciona exatamente como hoje, mas com infraestrutura preparada para novas categorias. Aba "Lactação" aparece aberta por padrão.

**Status:** ⬜ Não iniciado

---

### Fase 1 — Vaca Seca (far-off)
**Depende de:** Fase 0

**Objetivo:** Primeira categoria nova de ponta a ponta — valida a nova arquitetura.

**Parâmetros do animal:** peso vivo, ECC, dias de gestação

**Cálculos NRC 2021:**
- CMS exigida para vacas secas
- Exigência de energia: manutenção + gestação (far-off)
- Exigência de proteína: manutenção + gestação
- Referências nutricionais específicas para vaca seca

**Entregável:** Aba "Vaca Seca" funcional com painel, cálculos e referências próprios.

**Status:** ⬜ Não iniciado

---

### Fase 2 — Pré-parto / Close-up
**Depende de:** Fase 1 (constrói sobre vaca seca)

**Objetivo:** Cobrir a fase crítica de transição pré-parto.

**Parâmetros do animal:** peso vivo, ECC, dias antes do parto (0–21)

**Diferenciais técnicos:**
- **DCAD** como indicador principal (meta: –100 a –150 mEq/kg MS)
- CMS reduzida próximo ao parto
- Exigência de gestação avançada
- Alertas de risco metabólico (hipocalcemia, cetose)

**Entregável:** Aba "Pré-parto" funcional. DCAD com referência e status visual destacado.

**Status:** ⬜ Não iniciado

---

### Fase 3 — Pós-parto / Transição
**Depende de:** Fase 0

**Objetivo:** Cobrir a janela metabólica mais crítica pós-parto.

**Parâmetros do animal:** dias pós-parto (0–30), produção inicial de leite, ECC

**Diferenciais técnicos:**
- Rastreio de **balanço energético negativo (BEN)**
- Indicadores de risco para cetose e deslocamento de abomaso
- CMS reduzida nos primeiros dias (curva de recuperação)
- Transição gradual dos parâmetros em direção à Lactação plena

**Entregável:** Aba "Pós-parto" com indicadores de BEN e alertas de transição metabólica.

**Status:** ⬜ Não iniciado

---

### Fase 4 — Novilhas em Crescimento
**Depende de:** Fase 0

**Objetivo:** Formulação para reposição leiteira com base em GDP e metas de desenvolvimento.

**Parâmetros do animal:** raça/porte, peso atual, peso-alvo, GDP desejado, idade atual

**Cálculos NRC 2021:**
- NEm (manutenção) + NEg (crescimento)
- PM manutenção + PM crescimento
- Composição do ganho (proteína vs gordura) por porte e GDP

**Entregável:** Aba "Novilhas" com avaliação de GDP real vs exigido e projeção de idade ao primeiro parto.

**Status:** ⬜ Não iniciado

---

### Fase 5 — Bezerros
**Depende de:** Fase 0

**Objetivo:** Formulação para a fase pré-ruminante com dieta mista líquida + sólida.

**Parâmetros do animal:** peso ao nascer, peso atual, GDP desejado, volume de leite/sucedâneo ofertado

**Diferenciais técnicos:**
- Dieta dividida em **fração líquida** (leite ou sucedâneo) e **fração sólida** (iniciador)
- Equações de crescimento para pré-ruminantes (NRC 2021)
- Indicador de prontidão para desmame (CMS sólida mínima ~1 kg/d)

**Entregável:** Aba "Bezerros" com suporte a dieta mista e indicadores de desmame.

**Status:** ⬜ Não iniciado

---

### Fase 6 — Otimização de Custo
**Depende de:** Fase 0 + pelo menos uma categoria completa
**Feature transversal** — funciona para qualquer categoria implementada.

**Objetivo:** Dado um conjunto de alimentos disponíveis e as exigências nutricionais, sugerir a combinação de menor custo que atende todos os requisitos.

**Técnica:** Programação linear (simplex) — nutrientes como restrições, custo como função objetivo.

**Fluxo do usuário:**
1. Seleciona os alimentos disponíveis na fazenda
2. Define limites de inclusão (mín/máx por ingrediente)
3. Clica "Otimizar dieta"
4. Recebe a combinação de menor custo que atende todas as exigências nutricionais

**Entregável:** Botão "Otimizar dieta" no formulador com sugestão de quantidades ideais.

**Status:** ⬜ Não iniciado

---

### Fase 7 — Comparação Avançada de Formulações
**Depende de:** Fase 0 + pelo menos uma categoria completa
**Melhoria da tela "Minhas Dietas".**

**Objetivo:** Comparar 2 ou mais formulações em uma visão única, nutricional e econômica.

**Caso de uso típico:** Formulador faz uma dieta com farelo de soja, depois outra com farelo de soja + caroço de algodão, e compara as duas lado a lado.

**Funcionalidades:**
- Selecionar 2–3 dietas salvas (mesma categoria ou categorias diferentes)
- Visão lado a lado: todos os nutrientes, custos e leite/ganho potencial
- Delta entre as dietas (diferença absoluta e percentual destacada)
- Destaque visual do fator limitante em cada formulação
- Comparação econômica: R$/dia, R$/kg MS, R$/litro ou R$/kg de ganho

**Entregável:** Tela de comparação expandida acessível a partir de "Minhas Dietas".

**Status:** ⬜ Não iniciado

---

## Ordem de Execução

```
Fase 0 (base)
   ├── Fase 1 → Fase 2 → Fase 3   (vaca adulta: seca → pré-parto → pós-parto)
   ├── Fase 4                      (novilhas — independente)
   ├── Fase 5                      (bezerros — independente)
   ├── Fase 6                      (otimização — transversal, após 1 categoria nova)
   └── Fase 7                      (comparação — transversal, após 1 categoria nova)
```

---

## Tabela de Status (atualizar a cada sessão)

| Fase | Descrição | Status | Última atualização |
|---|---|---|---|
| Lactação | Motor NASEM 2021 (PM + Gestação + Energia completos) | 🟢 100% conforme (resta só Body_MPuse, prioridade baixa) | 2026-05-18 |
| Fase 0 | Refatoração arquitetural (abas) | ⬜ Não iniciado | — |
| Fase 1 | Vaca Seca | ⬜ Não iniciado | — |
| Fase 2 | Pré-parto / Close-up | ⬜ Não iniciado | — |
| Fase 3 | Pós-parto / Transição | ⬜ Não iniciado | — |
| Fase 4 | Novilhas em crescimento | ⬜ Não iniciado | — |
| Fase 5 | Bezerros | ⬜ Não iniciado | — |
| Fase 6 | Otimização de custo | ⬜ Não iniciado | — |
| Fase 7 | Comparação avançada | ⬜ Não iniciado | — |

### Lactação — Pendências para 100% NASEM 2021
Ver `GAP_ANALYSIS_NASEM2021.md` para detalhamento completo equação-por-equação.

**Implementado (2026-05-18):**
- ✅ CMS (Eq. 20-21), RUP/RDP (Eq. 6-1), Proteína microbiana (Eq. 20-52/53/74), MP (Eq. 20-136), Manutenção (Eq. 20-283 a 20-306)
- ✅ Gestação proteica (Eq. 20-225 a 20-239)
- ✅ Leite PM (Eq. 20-339 derivada de 20-212)
- ✅ **Cadeia de Energia DE → ME → NEL (Eq. 20-111/115/84/182/307/308/311/3-9/20-223 + Tabelas 4-1 e 20-9)**

**Pendência única restante — prioridade baixa:**

1. **Body_MPuse (ganho/perda corporal proteico)**
   - Eq. 20-247/258/270 — requer ECC alvo + dias para alvo
   - Impacto: superestima ~2–4 kg/d para vaca em ganho ativo
   - Para vaca em ECC estável (DEL ≥ 60d), impacto = 0
   - Esforço estimado: 1 dia

---

## Notas Técnicas para Referência Futura

### Estado atual do motor de cálculo (Lactação)
- Todas as equações NRC 2021 verificadas e corrigidas em 2026-05-11
- `calculos.ts`: CMS (Eq. 20-21), NEL (Eq. 3-13/3-14a), PM (Eq. 20-127/135/214/283/295/300)
- Coeficientes corretos: NEm=0,10×PV^0,75; KlMP=0,69; PBM digestibilidade=0,80×0,824
- Valores de referência: 680^0,75=133,2; 680^0,60=50,1

### Valores de potências para referência rápida
| PV (kg) | PV^0,75 | PV^0,60 |
|---|---|---|
| 500 | 105,7 | 43,1 |
| 600 | 120,0 | 47,6 |
| 650 | 127,0 | 49,4 |
| 680 | 133,2 | 50,1 |
| 700 | 135,8 | 51,8 |
| 750 | 143,0 | 53,6 |

### Bibliotecas disponíveis no projeto
- React 19 + TypeScript 5.7 + Vite 6
- Tailwind CSS 4.0
- Supabase 2.103 (auth + banco)
- ExcelJS + jsPDF (exportações)
- Lucide React (ícones)
- React Router 7
