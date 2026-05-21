import { createContext, useContext, useState, type ReactNode } from 'react';
import type { IngredienteRacao, OrigemRacao } from '../types';

/**
 * Estado leve para passar a "ração em construção" entre rotas (Dieta → Formulador
 * Ração) ou para reabrir uma ração salva da biblioteca de alimentos no Formulador.
 *
 * Não persiste em Supabase nem localStorage — é volátil, só serve para o handoff
 * de navegação. A ração só é persistida quando o aluno clica "Salvar na biblioteca"
 * (e aí vira um Alimento via DietaContext.adicionarAlimento).
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

export function RacaoProvider({ children }: { children: ReactNode }) {
  const [racao, setRacao] = useState<RacaoEmConstrucao | null>(null);

  const iniciarComIngredientes = (ingredientes: IngredienteRacao[]) => {
    setRacao({
      capacidade_misturador_kg: 1000,
      ingredientes,
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
