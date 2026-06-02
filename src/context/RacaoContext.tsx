import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { IngredienteRacao, OrigemRacao } from '../types';

/**
 * Estado para passar a "ração em construção" entre rotas (Dieta → Formulador
 * Ração) e para reabrir uma ração salva da biblioteca no Formulador.
 *
 * Persiste em `sessionStorage` apenas — sobrevive a F5/refresh enquanto a
 * aba estiver aberta, mas não vaza entre sessões/usuários. NÃO persiste em
 * `localStorage` nem Supabase. A ração só vira Alimento quando o aluno clica
 * "Salvar na biblioteca" (via DietaContext.adicionarAlimento).
 */
export interface RacaoEmConstrucao {
  nome?: string;
  fazenda?: string;
  capacidade_misturador_kg: number;
  ingredientes: IngredienteRacao[];
  /** Se vier de uma ração existente da biblioteca, guarda o nome para
   *  exibir "Editando: Ração X" e oferecer atualização. */
  editando_nome?: string;
}

interface RacaoContextType {
  racao: RacaoEmConstrucao | null;
  /** Inicializa nova ração com ingredientes pré-selecionados da dieta. */
  iniciarComIngredientes: (ingredientes: IngredienteRacao[]) => void;
  /** Inicializa a partir de uma ração salva da biblioteca (modo edição). */
  iniciarEdicao: (alimento_nome: string, origem: OrigemRacao) => void;
  /** Limpa o estado (após salvar ou cancelar). */
  limpar: () => void;
  /** Atualiza o estado durante a edição na tela. */
  atualizar: (r: Partial<RacaoEmConstrucao>) => void;
}

const RacaoContext = createContext<RacaoContextType | null>(null);

const SS_KEY = 'racao-em-construcao';

function carregarDoSession(): RacaoEmConstrucao | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RacaoEmConstrucao;
    if (!parsed || typeof parsed.capacidade_misturador_kg !== 'number') return null;
    if (!Array.isArray(parsed.ingredientes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function RacaoProvider({ children }: { children: ReactNode }) {
  const [racao, setRacao] = useState<RacaoEmConstrucao | null>(() => carregarDoSession());

  // Persiste em sessionStorage a cada mudança (sobrevive F5, não vaza entre sessões).
  useEffect(() => {
    try {
      if (racao) sessionStorage.setItem(SS_KEY, JSON.stringify(racao));
      else sessionStorage.removeItem(SS_KEY);
    } catch {
      /* sessionStorage indisponível (modo privado etc) — ignora */
    }
  }, [racao]);

  const iniciarComIngredientes = (ingredientes: IngredienteRacao[]) => {
    setRacao(prev => {
      // Sem ração em construção → inicia nova.
      if (!prev) return { capacidade_misturador_kg: 1000, ingredientes };
      // Já existe ração → MESCLA os novos insumos (sem duplicar por nome),
      // preservando o que já estava na tela (não apaga o trabalho do usuário).
      const existentes = new Set(prev.ingredientes.map(i => i.alimento_nome));
      const novos = ingredientes.filter(i => !existentes.has(i.alimento_nome));
      return { ...prev, ingredientes: [...prev.ingredientes, ...novos] };
    });
  };

  const iniciarEdicao = (alimento_nome: string, origem: OrigemRacao) => {
    setRacao({
      nome: alimento_nome,
      fazenda: origem.fazenda,
      capacidade_misturador_kg: origem.capacidade_misturador_kg,
      ingredientes: origem.receita,
      editando_nome: alimento_nome,
    });
  };

  const limpar = () => setRacao(null);

  const atualizar = (r: Partial<RacaoEmConstrucao>) => {
    setRacao(prev => (prev ? { ...prev, ...r } : { capacidade_misturador_kg: 1000, ingredientes: [], ...r }));
  };

  return (
    <RacaoContext.Provider value={{ racao, iniciarComIngredientes, iniciarEdicao, limpar, atualizar }}>
      {children}
    </RacaoContext.Provider>
  );
}

export function useRacao() {
  const ctx = useContext(RacaoContext);
  if (!ctx) throw new Error('useRacao deve ser usado dentro de RacaoProvider');
  return ctx;
}
