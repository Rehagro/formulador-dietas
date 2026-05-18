import type { Alimento } from '../../types';

/** Campos numéricos guardados como fração (0-1) no JSON mas exibidos como % (0-100) no form. */
export const CAMPOS_FRACAO = new Set<keyof Alimento>([
  'ms', 'pb', 'pdr', 'pndr', 'fdn', 'efdn', 'fdnf', 'fda', 'ndt',
  'ee', 'ee_insat', 'cinza', 'cnf', 'amido', 'mn8', 'mn19',
  'ca', 'p', 'mg', 'k', 's', 'na', 'cl',
  'met', 'lys',
  'rup_digest',
]);

/** Converte de formato de armazenamento (frações 0-1) para exibição (% 0-100). */
export function toDisplay(a: Alimento): Alimento {
  const d = { ...a };
  for (const key of CAMPOS_FRACAO) {
    const v = d[key];
    if (v !== null && v !== undefined && typeof v === 'number') {
      (d as Record<string, unknown>)[key] = parseFloat((v * 100).toFixed(4));
    }
  }
  return d;
}

/** Converte de formato de exibição (% 0-100) para armazenamento (frações 0-1). */
export function toStore(a: Alimento): Alimento {
  const d = { ...a };
  for (const key of CAMPOS_FRACAO) {
    const v = d[key];
    if (v !== null && v !== undefined && typeof v === 'number') {
      (d as Record<string, unknown>)[key] = parseFloat((v / 100).toFixed(6));
    }
  }
  return d;
}

/** Alimento é considerado base (NASEM) se não tem id do Supabase. */
export function isAlimentoBase(a: Alimento): boolean {
  return !a.id;
}

/** Origem para badge de UI. */
export type OrigemAlimento = 'nasem' | 'custom';
export function origemAlimento(a: Alimento): OrigemAlimento {
  return isAlimentoBase(a) ? 'nasem' : 'custom';
}

/** Tipo legível em PT-BR para o filtro/select. */
export const TIPO_LABEL: Record<'F' | 'C' | 'M', string> = {
  F: 'Forragem',
  C: 'Concentrado',
  M: 'Mineral/Aditivo',
};

/** Extrai classificações distintas do banco para alimentar o select dinâmico. */
export function classificacoesDistintas(alimentos: Alimento[]): string[] {
  return [...new Set(alimentos.map(a => a.classificacao).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );
}

/** Formata número para exibição read-only (lock). */
export function fmtLock(v: number | null | undefined, sufixo = ''): string {
  if (v === null || v === undefined) return '—';
  if (typeof v !== 'number' || !isFinite(v)) return '—';
  return v.toFixed(2) + sufixo;
}
