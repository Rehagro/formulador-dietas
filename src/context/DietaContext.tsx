import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Dieta, Alimento, SlotIngrediente, AnimalLactacao } from '../types';
import alimentosBase from '../data/alimentos.json';
import {
  getDietas, saveDietas, getDietaAtiva, setDietaAtiva,
  getAlimentosCustom, saveAlimentosCustom, gerarId
} from '../utils/storage';

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
};

const SLOTS_PADRAO = 8;

function criarSlots(): SlotIngrediente[] {
  return Array.from({ length: SLOTS_PADRAO }, (_, i) => ({
    id: `slot_${i}`,
    alimentoNome: null,
    kgMN: 0,
  }));
}

/** Remove slots vazios no final, mantendo no mínimo SLOTS_PADRAO */
function normalizarSlots(slots: SlotIngrediente[]): SlotIngrediente[] {
  const preenchidos = slots.filter(s => s.alimentoNome !== null || s.kgMN > 0);
  const minTotal = Math.max(preenchidos.length + 1, SLOTS_PADRAO);
  if (slots.length <= minTotal) return slots;
  // Corta o excesso de slots vazios no final
  const trimmed = slots.slice(0, minTotal);
  return trimmed;
}

interface DietaContextType {
  dieta: Dieta;
  alimentos: Alimento[];
  dietas: Dieta[];
  setAnimal: (animal: AnimalLactacao) => void;
  setSlot: (idx: number, slot: Partial<SlotIngrediente>) => void;
  salvarDieta: (nome: string) => void;
  carregarDieta: (id: string) => void;
  novaDieta: () => void;
  duplicarDieta: (id: string) => void;
  excluirDieta: (id: string) => void;
  renomearDieta: (id: string, nome: string) => void;
  adicionarSlot: () => void;
  reordenarSlots: (de: number, para: number) => void;
  adicionarAlimento: (a: Alimento) => void;
  editarAlimento: (nomeOriginal: string, a: Alimento) => void;
  excluirAlimento: (nome: string) => void;
}

const DietaContext = createContext<DietaContextType | null>(null);

export function DietaProvider({ children }: { children: ReactNode }) {
  const [alimentos, setAlimentos] = useState<Alimento[]>(() => {
    const custom = getAlimentosCustom();
    const base = alimentosBase as Alimento[];
    // custom overrides base por nome
    const customNomes = new Set(custom.map(a => a.nome));
    return [...base.filter(a => !customNomes.has(a.nome)), ...custom].sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR')
    );
  });

  const [dietas, setDietas] = useState<Dieta[]>(() => getDietas());

  const [dieta, setDieta] = useState<Dieta>(() => {
    const ativaId = getDietaAtiva();
    if (ativaId) {
      const salva = getDietas().find(d => d.id === ativaId);
      if (salva) return { ...salva, slots: normalizarSlots(salva.slots) };
    }
    return {
      id: gerarId(),
      nome: 'Nova Dieta',
      criadaEm: new Date().toISOString(),
      animal: ANIMAL_PADRAO,
      slots: criarSlots(),
    };
  });

  useEffect(() => {
    setDietaAtiva(dieta.id);
  }, [dieta.id]);

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

  const salvarDieta = useCallback((nome: string) => {
    setDieta(d => {
      const atualizada = { ...d, nome };
      setDietas(prev => {
        const semAtual = prev.filter(x => x.id !== atualizada.id);
        const nova = [atualizada, ...semAtual];
        saveDietas(nova);
        return nova;
      });
      return atualizada;
    });
  }, []);

  const carregarDieta = useCallback((id: string) => {
    const d = getDietas().find(x => x.id === id);
    if (d) setDieta({ ...d, slots: normalizarSlots(d.slots) });
  }, []);

  const novaDieta = useCallback(() => {
    setDieta({
      id: gerarId(),
      nome: 'Nova Dieta',
      criadaEm: new Date().toISOString(),
      animal: ANIMAL_PADRAO,
      slots: criarSlots(),
    });
  }, []);

  const duplicarDieta = useCallback((id: string) => {
    const orig = getDietas().find(x => x.id === id);
    if (!orig) return;
    const copia: Dieta = {
      ...orig,
      id: gerarId(),
      nome: `Cópia de ${orig.nome}`,
      criadaEm: new Date().toISOString(),
      slots: orig.slots.map(s => ({ ...s, id: gerarId() })),
    };
    setDietas(prev => {
      const nova = [copia, ...prev];
      saveDietas(nova);
      return nova;
    });
    setDieta(copia);
  }, []);

  const excluirDieta = useCallback((id: string) => {
    setDietas(prev => {
      const nova = prev.filter(x => x.id !== id);
      saveDietas(nova);
      return nova;
    });
  }, []);

  const renomearDieta = useCallback((id: string, nome: string) => {
    setDietas(prev => {
      const nova = prev.map(d => d.id === id ? { ...d, nome } : d);
      saveDietas(nova);
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

  const adicionarSlot = useCallback(() => {
    setDieta(d => ({
      ...d,
      slots: [...d.slots, { id: gerarId(), alimentoNome: null, kgMN: 0 }],
    }));
  }, []);

  const adicionarAlimento = useCallback((a: Alimento) => {
    setAlimentos(prev => {
      const novo = [...prev.filter(x => x.nome !== a.nome), a].sort((x, y) =>
        x.nome.localeCompare(y.nome, 'pt-BR')
      );
      saveAlimentosCustom(novo.filter(x => !(alimentosBase as Alimento[]).some(b => b.nome === x.nome)));
      return novo;
    });
  }, []);

  const editarAlimento = useCallback((nomeOriginal: string, a: Alimento) => {
    setAlimentos(prev => {
      const novo = prev.map(x => x.nome === nomeOriginal ? a : x).sort((x, y) =>
        x.nome.localeCompare(y.nome, 'pt-BR')
      );
      saveAlimentosCustom(novo.filter(x => !(alimentosBase as Alimento[]).some(b => b.nome === x.nome)));
      return novo;
    });
  }, []);

  const excluirAlimento = useCallback((nome: string) => {
    setAlimentos(prev => {
      const novo = prev.filter(x => x.nome !== nome);
      saveAlimentosCustom(novo.filter(x => !(alimentosBase as Alimento[]).some(b => b.nome === x.nome)));
      return novo;
    });
  }, []);

  return (
    <DietaContext.Provider value={{
      dieta, alimentos, dietas,
      setAnimal, setSlot,
      salvarDieta, carregarDieta, novaDieta, duplicarDieta, excluirDieta, renomearDieta,
      adicionarSlot,
      reordenarSlots,
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
