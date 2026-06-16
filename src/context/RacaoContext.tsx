import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
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
  /** Ids dos slots da dieta que originaram esta ração. Ao "Aplicar na dieta",
   *  esses slots são colapsados numa única linha de ração (racaoOverride).
   *  Vazio/ausente quando a ração foi aberta fora de uma dieta (ex: biblioteca). */
  origem_slot_ids?: string[];
}

interface RacaoContextType {
  racao: RacaoEmConstrucao | null;
  /** Inicializa nova ração com ingredientes pré-selecionados da dieta.
   *  `origemSlotIds` = slots de onde vieram (para colapsar ao aplicar). */
  iniciarComIngredientes: (ingredientes: IngredienteRacao[], origemSlotIds?: string[]) => void;
  /** Inicializa a partir de uma ração salva da biblioteca (modo edição).
   *  `origemSlotId` opcional: quando aberta de um slot de dieta, habilita
   *  "Aplicar na dieta". */
  iniciarEdicao: (alimento_nome: string, origem: OrigemRacao, origemSlotId?: string) => void;
  /** Limpa o estado (após salvar ou cancelar). */
  limpar: () => void;
  /** Atualiza o estado durante a edição na tela. `coalesceKey` agrupa edições
   *  consecutivas no mesmo campo num único passo de desfazer. */
  atualizar: (r: Partial<RacaoEmConstrucao>, coalesceKey?: string) => void;
  /** Desfazer / refazer (mesma mecânica do DietaContext). */
  undo: () => void;
  redo: () => void;
  podeDesfazer: boolean;
  podeRefazer: boolean;
}

const RacaoContext = createContext<RacaoContextType | null>(null);

const SS_KEY = 'racao-em-construcao';
const HIST_MAX = 50;

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
  // Histórico para Desfazer/Refazer. `present` é a ração atual (pode ser null
  // quando não há ração em construção). Edições passam por `aplicarEdicao`;
  // iniciar/limpar são checkpoints que zeram o histórico.
  const [hist, setHist] = useState<{
    present: RacaoEmConstrucao | null;
    past: (RacaoEmConstrucao | null)[];
    future: (RacaoEmConstrucao | null)[];
  }>(() => ({ present: carregarDoSession(), past: [], future: [] }));
  const racao = hist.present;
  const lastCoalesceKey = useRef<string | null>(null);

  // Persiste só o `present` em sessionStorage (sobrevive F5, não vaza entre sessões).
  useEffect(() => {
    try {
      if (racao) sessionStorage.setItem(SS_KEY, JSON.stringify(racao));
      else sessionStorage.removeItem(SS_KEY);
    } catch {
      /* sessionStorage indisponível (modo privado etc) — ignora */
    }
  }, [racao]);

  const aplicarEdicao = useCallback((
    updater: (r: RacaoEmConstrucao | null) => RacaoEmConstrucao | null,
    coalesceKey?: string,
  ) => {
    const coalesce = !!coalesceKey && coalesceKey === lastCoalesceKey.current;
    lastCoalesceKey.current = coalesceKey ?? null;
    setHist(h => {
      const present = updater(h.present);
      return coalesce
        ? { present, past: h.past, future: [] }
        : { present, past: [...h.past, h.present].slice(-HIST_MAX), future: [] };
    });
  }, []);

  const resetHistorico = useCallback((novo: RacaoEmConstrucao | null) => {
    lastCoalesceKey.current = null;
    setHist({ present: novo, past: [], future: [] });
  }, []);

  const undo = useCallback(() => {
    lastCoalesceKey.current = null;
    setHist(h => {
      if (h.past.length === 0) return h;
      const present = h.past[h.past.length - 1];
      return { present, past: h.past.slice(0, -1), future: [h.present, ...h.future].slice(0, HIST_MAX) };
    });
  }, []);

  const redo = useCallback(() => {
    lastCoalesceKey.current = null;
    setHist(h => {
      if (h.future.length === 0) return h;
      const present = h.future[0];
      return { present, past: [...h.past, h.present].slice(-HIST_MAX), future: h.future.slice(1) };
    });
  }, []);

  const iniciarComIngredientes = useCallback((ingredientes: IngredienteRacao[], origemSlotIds?: string[]) => {
    setHist(h => {
      const prev = h.present;
      // Sem ração em construção → inicia nova (checkpoint, zera histórico).
      if (!prev) {
        lastCoalesceKey.current = null;
        return { present: { capacidade_misturador_kg: 1000, ingredientes, origem_slot_ids: origemSlotIds }, past: [], future: [] };
      }
      // Já existe ração → MESCLA os novos insumos (sem duplicar por nome),
      // preservando o trabalho na tela. União dos slots de origem.
      const existentes = new Set(prev.ingredientes.map(i => i.alimento_nome));
      const novos = ingredientes.filter(i => !existentes.has(i.alimento_nome));
      const ids = [...new Set([...(prev.origem_slot_ids ?? []), ...(origemSlotIds ?? [])])];
      lastCoalesceKey.current = null;
      const present = { ...prev, ingredientes: [...prev.ingredientes, ...novos], origem_slot_ids: ids.length ? ids : undefined };
      return { present, past: [...h.past, prev].slice(-HIST_MAX), future: [] };
    });
  }, []);

  const iniciarEdicao = useCallback((alimento_nome: string, origem: OrigemRacao, origemSlotId?: string) => {
    resetHistorico({
      nome: alimento_nome,
      fazenda: origem.fazenda,
      capacidade_misturador_kg: origem.capacidade_misturador_kg,
      ingredientes: origem.receita,
      editando_nome: alimento_nome,
      origem_slot_ids: origemSlotId ? [origemSlotId] : undefined,
    });
  }, [resetHistorico]);

  const limpar = useCallback(() => resetHistorico(null), [resetHistorico]);

  const atualizar = useCallback((r: Partial<RacaoEmConstrucao>, coalesceKey?: string) => {
    aplicarEdicao(
      prev => (prev ? { ...prev, ...r } : { capacidade_misturador_kg: 1000, ingredientes: [], ...r }),
      coalesceKey,
    );
  }, [aplicarEdicao]);

  return (
    <RacaoContext.Provider value={{
      racao, iniciarComIngredientes, iniciarEdicao, limpar, atualizar,
      undo, redo, podeDesfazer: hist.past.length > 0, podeRefazer: hist.future.length > 0,
    }}>
      {children}
    </RacaoContext.Provider>
  );
}

export function useRacao() {
  const ctx = useContext(RacaoContext);
  if (!ctx) throw new Error('useRacao deve ser usado dentro de RacaoProvider');
  return ctx;
}
