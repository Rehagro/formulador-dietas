import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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
  const [dieta, setDieta] = useState<Dieta>(dietaNova);

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

        // Mescla alimentos base + custom (custom sobrescreve base por nome)
        const base = alimentosBase as Alimento[];
        const customNomes = new Set(customArr.map(a => a.nome));
        const merged = [...base.filter(a => !customNomes.has(a.nome)), ...customArr]
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        setAlimentos(merged);

        // Backfill defaults nos campos novos do animal (compat com dietas antigas)
        const dietasNormalizadas = dietasDB.map(d => ({
          ...d,
          animal: normalizarAnimal(d.animal),
        }));
        setDietas(dietasNormalizadas);
        if (dietasNormalizadas.length > 0) {
          setDieta({ ...dietasNormalizadas[0], slots: normalizarSlots(dietasNormalizadas[0].slots) });
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
    setDieta(d => ({ ...d, animal }));
  }, []);

  const setSlot = useCallback((idx: number, partial: Partial<SlotIngrediente>) => {
    setDieta(d => {
      const slots = [...d.slots];
      slots[idx] = { ...slots[idx], ...partial };
      return { ...d, slots };
    });
  }, []);

  const salvarDieta = useCallback(async (nome: string) => {
    const atualizada = { ...dieta, nome };
    setDieta(atualizada);
    setDietas(prev => [atualizada, ...prev.filter(x => x.id !== atualizada.id)]);
    await saveDietaSupabase(atualizada);
  }, [dieta]);

  const carregarDieta = useCallback((id: string) => {
    setDietas(prev => {
      const d = prev.find(x => x.id === id);
      if (d) setDieta({ ...d, animal: normalizarAnimal(d.animal), slots: normalizarSlots(d.slots) });
      return prev;
    });
  }, []);

  const novaDieta = useCallback(() => {
    setDieta(dietaNova());
  }, []);

  const duplicarDieta = useCallback((id: string) => {
    setDietas(prev => {
      const orig = prev.find(x => x.id === id);
      if (!orig) return prev;
      const copia: Dieta = {
        ...orig,
        id: gerarId(),
        nome: `Cópia de ${orig.nome}`,
        criadaEm: new Date().toISOString(),
        slots: orig.slots.map(s => ({ ...s, id: gerarId() })),
      };
      const nova = [copia, ...prev];
      saveDietaSupabase(copia).catch(console.error);
      setDieta(copia);
      return nova;
    });
  }, []);

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
    setDieta(d => d.id === id ? { ...d, nome } : d);
  }, []);

  const reordenarSlots = useCallback((de: number, para: number) => {
    setDieta(d => {
      const slots = [...d.slots];
      const [item] = slots.splice(de, 1);
      slots.splice(para, 0, item);
      return { ...d, slots };
    });
  }, []);

  const removerSlot = useCallback((idx: number) => {
    setDieta(d => {
      const slots = d.slots.filter((_, i) => i !== idx);
      while (slots.length < 4) {
        slots.push({ id: gerarId(), alimentoNome: null, kgMN: 0 });
      }
      return { ...d, slots };
    });
  }, []);

  const atualizarNomeNosSlots = useCallback((nomeAntigo: string, nomeNovo: string) => {
    setDieta(d => ({
      ...d,
      slots: d.slots.map(s =>
        s.alimentoNome === nomeAntigo ? { ...s, alimentoNome: nomeNovo } : s
      ),
    }));
  }, []);

  const adicionarSlot = useCallback(() => {
    setDieta(d => ({
      ...d,
      slots: [...d.slots, { id: gerarId(), alimentoNome: null, kgMN: 0 }],
    }));
  }, []);

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
      setAnimal, setSlot,
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
