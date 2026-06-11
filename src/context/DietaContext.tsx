import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Dieta, Alimento, SlotIngrediente, AnimalLactacao } from '../types';
import alimentosBase from '../data/alimentos.json';
import {
  supabase,
  getDietasSupabase, saveDietaSupabase, deleteDietaSupabase,
  getAlimentosCustomSupabase, saveAlimentoCustomSupabase, deleteAlimentoCustomSupabase,
  signOut,
} from '../lib/supabase';
import { gerarId } from '../utils/storage';
import { migrarRupDigest } from '../utils/migracoes';

const ANIMAL_PADRAO: AnimalLactacao = {
  ecc: 3.0,
  paridade: 1,
  peso: 550,
  del: 90,
  leite: 30,
  gordura: 3.5,
  proteina: 3.2,
  lactose: 4.7,
  precoLeite: 2.20,
  raca: 'Holstein',
  dias_gestacao: 0,
  peso_bezerro_alvo: 45,
  gestacao_total: 280,
};

/** Preenche valores default em animais carregados de dietas antigas (legacy). */
function normalizarAnimal(a: AnimalLactacao): AnimalLactacao {
  return {
    ...a,
    raca: a.raca ?? 'Holstein',
    dias_gestacao: a.dias_gestacao ?? 0,
    peso_bezerro_alvo: a.peso_bezerro_alvo ?? (a.raca === 'Jersey' ? 28 : 45),
    gestacao_total: a.gestacao_total ?? 280,
  };
}

const SLOTS_PADRAO = 8;

function criarSlots(): SlotIngrediente[] {
  return Array.from({ length: SLOTS_PADRAO }, (_, i) => ({
    id: `slot_${i}`,
    alimentoNome: null,
    kgMN: 0,
  }));
}

function normalizarSlots(slots: SlotIngrediente[]): SlotIngrediente[] {
  const preenchidos = slots.filter(s => s.alimentoNome !== null || s.kgMN > 0);
  const minTotal = Math.max(preenchidos.length + 1, SLOTS_PADRAO);
  if (slots.length <= minTotal) return slots;
  return slots.slice(0, minTotal);
}

function dietaNova(): Dieta {
  return {
    id: gerarId(),
    nome: 'Nova Dieta',
    criadaEm: new Date().toISOString(),
    animal: { ...ANIMAL_PADRAO },
    slots: criarSlots(),
  };
}

interface DietaContextType {
  dieta: Dieta;
  alimentos: Alimento[];
  dietas: Dieta[];
  carregando: boolean;
  usuario: User | null;
  logout: () => Promise<void>;
  setAnimal: (animal: AnimalLactacao) => void;
  setSlot: (idx: number, slot: Partial<SlotIngrediente>) => void;
  escalarKgMN: (fator: number) => void;
  setNome: (nome: string) => void;
  undo: () => void;
  redo: () => void;
  podeDesfazer: boolean;
  podeRefazer: boolean;
  salvarDieta: (nome: string) => Promise<void>;
  carregarDieta: (id: string) => void;
  novaDieta: () => void;
  duplicarDieta: (id: string) => void;
  excluirDieta: (id: string) => Promise<void>;
  renomearDieta: (id: string, nome: string) => Promise<void>;
  adicionarSlot: () => void;
  reordenarSlots: (de: number, para: number) => void;
  removerSlot: (idx: number) => void;
  atualizarNomeNosSlots: (nomeAntigo: string, nomeNovo: string) => void;
  adicionarAlimento: (a: Alimento) => Promise<void>;
  editarAlimento: (nomeOriginal: string, a: Alimento) => Promise<void>;
  excluirAlimento: (nome: string) => Promise<void>;
}

const DietaContext = createContext<DietaContextType | null>(null);

export function DietaProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [alimentos, setAlimentos] = useState<Alimento[]>(alimentosBase as Alimento[]);
  const [dietas, setDietas] = useState<Dieta[]>([]);

  // Histórico para Desfazer/Refazer. `present` é a dieta atual; `past`/`future`
  // guardam snapshots imutáveis (cap HIST_MAX). Edições do usuário passam por
  // `aplicarEdicao`; carregar/nova/duplicar zeram o histórico (checkpoints).
  const HIST_MAX = 50;
  const [hist, setHist] = useState<{ present: Dieta; past: Dieta[]; future: Dieta[] }>(
    () => ({ present: dietaNova(), past: [], future: [] })
  );
  const dieta = hist.present;
  // Chave de coalescência: edições consecutivas com a mesma chave (ex: digitar
  // dígito a dígito no mesmo campo) viram UM passo de undo, não um por tecla.
  const lastCoalesceKey = useRef<string | null>(null);

  const aplicarEdicao = useCallback((updater: (d: Dieta) => Dieta, coalesceKey?: string) => {
    // Decide coalescência e atualiza o ref FORA do updater (updater puro — seguro
    // sob StrictMode, que invoca o updater duas vezes).
    const coalesce = !!coalesceKey && coalesceKey === lastCoalesceKey.current;
    lastCoalesceKey.current = coalesceKey ?? null;
    setHist(h => {
      const present = updater(h.present);
      return coalesce
        ? { present, past: h.past, future: [] }                          // mesma edição → substitui
        : { present, past: [...h.past, h.present].slice(-HIST_MAX), future: [] };
    });
  }, []);

  const resetHistorico = useCallback((nova: Dieta) => {
    lastCoalesceKey.current = null;
    setHist({ present: nova, past: [], future: [] });
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

  // Carrega dados do Supabase na inicialização
  useEffect(() => {
    async function inicializar() {
      setCarregando(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUsuario(user);

        const [dietasDB, customDB] = await Promise.all([
          getDietasSupabase(),
          getAlimentosCustomSupabase(),
        ]);

        // Deduplica por nome (mantém o mais recente — último no array por criado_em asc)
        const customMap = new Map<string, Alimento>();
        for (const a of customDB) customMap.set(a.nome, a);
        const customArr = Array.from(customMap.values());

        // Migração: corrige rup_digest gravado errado (~100× menor) em alimentos
        // custom antigos e repersiste os que mudaram. Idempotente.
        const base = alimentosBase as Alimento[];
        const { corrigidos: customArrCorrigido, alterados } =
          migrarRupDigest(customArr, base);
        if (alterados.length > 0) {
          Promise.all(alterados.map(a => saveAlimentoCustomSupabase(a)))
            .then(() => console.info(
              `[migração rup_digest] ${alterados.length} alimento(s) corrigido(s)`))
            .catch(err => console.error('[migração rup_digest] falha ao repersistir:', err));
        }

        // Mescla alimentos base + custom (custom sobrescreve base por nome)
        const customNomes = new Set(customArrCorrigido.map(a => a.nome));
        const merged = [...base.filter(a => !customNomes.has(a.nome)), ...customArrCorrigido]
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        setAlimentos(merged);

        // Backfill defaults nos campos novos do animal (compat com dietas antigas)
        const dietasNormalizadas = dietasDB.map(d => ({
          ...d,
          animal: normalizarAnimal(d.animal),
        }));
        setDietas(dietasNormalizadas);
        if (dietasNormalizadas.length > 0) {
          setHist({
            present: { ...dietasNormalizadas[0], slots: normalizarSlots(dietasNormalizadas[0].slots) },
            past: [], future: [],
          });
        }
      } catch (err) {
        console.error('Erro ao inicializar dados:', err);
      } finally {
        setCarregando(false);
      }
    }
    inicializar();
  }, []);

  const logout = useCallback(async () => {
    await signOut();
  }, []);

  const setAnimal = useCallback((animal: AnimalLactacao) => {
    aplicarEdicao(d => ({ ...d, animal }), 'animal');
  }, [aplicarEdicao]);

  const setSlot = useCallback((idx: number, partial: Partial<SlotIngrediente>) => {
    aplicarEdicao(
      d => {
        const slots = [...d.slots];
        slots[idx] = { ...slots[idx], ...partial };
        return { ...d, slots };
      },
      `slot:${idx}:${Object.keys(partial).sort().join(',')}`
    );
  }, [aplicarEdicao]);

  const setNome = useCallback((nome: string) => {
    aplicarEdicao(d => ({ ...d, nome }), 'nome');
  }, [aplicarEdicao]);

  /** Escala o kgMN de todos os insumos preenchidos por um fator (ajuste único do
   *  total de MS). Mantém proporção entre ingredientes. No-op se fator inválido.
   *  Sem chave de coalescência → cada escalonamento é um passo de undo próprio. */
  const escalarKgMN = useCallback((fator: number) => {
    if (!isFinite(fator) || fator <= 0) return;
    aplicarEdicao(d => ({
      ...d,
      slots: d.slots.map(s =>
        s.alimentoNome && s.kgMN > 0 ? { ...s, kgMN: s.kgMN * fator } : s
      ),
    }));
  }, [aplicarEdicao]);

  const salvarDieta = useCallback(async (nome: string) => {
    const atualizada = { ...dieta, nome };
    // Atualiza só o `present` (salvar é checkpoint, não cria passo de undo).
    setHist(h => ({ ...h, present: atualizada }));
    setDietas(prev => [atualizada, ...prev.filter(x => x.id !== atualizada.id)]);
    await saveDietaSupabase(atualizada);
  }, [dieta]);

  const carregarDieta = useCallback((id: string) => {
    const d = dietas.find(x => x.id === id);
    if (d) resetHistorico({ ...d, animal: normalizarAnimal(d.animal), slots: normalizarSlots(d.slots) });
  }, [dietas, resetHistorico]);

  const novaDieta = useCallback(() => {
    resetHistorico(dietaNova());
  }, [resetHistorico]);

  const duplicarDieta = useCallback((id: string) => {
    const orig = dietas.find(x => x.id === id);
    if (!orig) return;
    const copia: Dieta = {
      ...orig,
      id: gerarId(),
      nome: `Cópia de ${orig.nome}`,
      criadaEm: new Date().toISOString(),
      slots: orig.slots.map(s => ({ ...s, id: gerarId() })),
    };
    setDietas(prev => [copia, ...prev]);
    saveDietaSupabase(copia).catch(console.error);
    resetHistorico(copia);
  }, [dietas, resetHistorico]);

  const excluirDieta = useCallback(async (id: string) => {
    await deleteDietaSupabase(id);
    setDietas(prev => prev.filter(x => x.id !== id));
  }, []);

  const renomearDieta = useCallback(async (id: string, nome: string) => {
    setDietas(prev => {
      const nova = prev.map(d => d.id === id ? { ...d, nome } : d);
      const dietaAtualizada = nova.find(d => d.id === id);
      if (dietaAtualizada) saveDietaSupabase(dietaAtualizada).catch(console.error);
      return nova;
    });
    setHist(h => h.present.id === id ? { ...h, present: { ...h.present, nome } } : h);
  }, []);

  const reordenarSlots = useCallback((de: number, para: number) => {
    aplicarEdicao(d => {
      const slots = [...d.slots];
      const [item] = slots.splice(de, 1);
      slots.splice(para, 0, item);
      return { ...d, slots };
    });
  }, [aplicarEdicao]);

  const removerSlot = useCallback((idx: number) => {
    aplicarEdicao(d => {
      const slots = d.slots.filter((_, i) => i !== idx);
      while (slots.length < 4) {
        slots.push({ id: gerarId(), alimentoNome: null, kgMN: 0 });
      }
      return { ...d, slots };
    });
  }, [aplicarEdicao]);

  const atualizarNomeNosSlots = useCallback((nomeAntigo: string, nomeNovo: string) => {
    // Sincroniza renome vindo da biblioteca; não é uma edição "desfazível" da dieta.
    setHist(h => ({
      ...h,
      present: {
        ...h.present,
        slots: h.present.slots.map(s =>
          s.alimentoNome === nomeAntigo ? { ...s, alimentoNome: nomeNovo } : s
        ),
      },
    }));
  }, []);

  const adicionarSlot = useCallback(() => {
    aplicarEdicao(d => ({
      ...d,
      slots: [...d.slots, { id: gerarId(), alimentoNome: null, kgMN: 0 }],
    }));
  }, [aplicarEdicao]);

  const adicionarAlimento = useCallback(async (a: Alimento) => {
    const id = await saveAlimentoCustomSupabase(a);
    const comId = { ...a, id };
    setAlimentos(prev => {
      const base = alimentosBase as Alimento[];
      const isBase = base.some(b => b.nome === comId.nome);
      if (isBase) return prev; // alimentos base não sobrescrevem via custom
      return [...prev.filter(x => x.nome !== comId.nome), comId]
        .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
    });
  }, []);

  const editarAlimento = useCallback(async (nomeOriginal: string, a: Alimento) => {
    // Reutiliza o ID existente para evitar criar linhas duplicadas no Supabase
    const existing = alimentos.find(x => x.nome === nomeOriginal);
    const aComId = { ...a, id: a.id ?? existing?.id };
    const id = await saveAlimentoCustomSupabase(aComId);
    const comId = { ...aComId, id };
    setAlimentos(prev =>
      prev.map(x => x.nome === nomeOriginal ? comId : x)
        .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'))
    );
  }, [alimentos]);

  const excluirAlimento = useCallback(async (nome: string) => {
    const alimentoCustom = alimentos.find(x => x.nome === nome && x.id);
    if (alimentoCustom?.id) {
      await deleteAlimentoCustomSupabase(alimentoCustom.id);
    }
    setAlimentos(prev => prev.filter(x => x.nome !== nome));
  }, [alimentos]);

  return (
    <DietaContext.Provider value={{
      dieta, alimentos, dietas, carregando, usuario, logout,
      setAnimal, setSlot, escalarKgMN, setNome,
      undo, redo, podeDesfazer: hist.past.length > 0, podeRefazer: hist.future.length > 0,
      salvarDieta, carregarDieta, novaDieta, duplicarDieta, excluirDieta, renomearDieta,
      adicionarSlot, reordenarSlots, removerSlot, atualizarNomeNosSlots,
      adicionarAlimento, editarAlimento, excluirAlimento,
    }}>
      {children}
    </DietaContext.Provider>
  );
}

export function useDieta() {
  const ctx = useContext(DietaContext);
  if (!ctx) throw new Error('useDieta must be inside DietaProvider');
  return ctx;
}
