import type { Referencia } from '../types';

export const REFERENCIAS_LACTACAO: Record<string, Referencia> = {
  cms:        { label: 'CMS',           unidade: 'kg/d',    tipo: 'calculada' },
  pb:         { label: 'PB',            unidade: '% MS',    min: 0.14,   max: 0.17 },
  pdr:        { label: 'PDR',           unidade: '% MS',    min: 0.10,   max: 0.11 },
  pndr:       { label: 'PNDR',          unidade: '% MS',    min: 0.04,   max: 0.07 },
  fdn:        { label: 'FDN',           unidade: '% MS',    min: 0.18 },
  efdn:       { label: 'eFDN',          unidade: '% MS',    min: 0.15,   max: 0.18 },
  fdnf:       { label: 'FDNF',          unidade: '% MS',    min: 0.19 },
  nel:        { label: 'NEl',           unidade: 'Mcal/kg', tipo: 'calculada' },
  ndt:        { label: 'NDT',           unidade: '% MS',    tipo: 'calculada' },
  ee:         { label: 'EE',            unidade: '% MS',    max: 0.05 },
  ee_insat:   { label: 'EE Insat',      unidade: '% MS',    max: 0.03 },
  cnf:        { label: 'CNF',           unidade: '% MS',    min: 0.20,   max: 0.45 },
  amido:      { label: 'Amido',         unidade: '% MS',    min: 0.20,   max: 0.30 },
  amido_deg:  { label: 'Amido Deg',     unidade: '% MS',    min: 0.15,   max: 0.20 },
  met:        { label: 'Met',           unidade: '% MS',    tipo: 'calculada' },
  lys:        { label: 'Lis',           unidade: '% MS',    tipo: 'calculada' },
  ca:         { label: 'Ca',            unidade: '% MS',    min: 0.006,  max: 0.008 },
  p:          { label: 'P',             unidade: '% MS',    min: 0.0035, max: 0.0040 },
  mg:         { label: 'Mg',            unidade: '% MS',    min: 0.0025, max: 0.0035 },
  k:          { label: 'K',             unidade: '% MS',    min: 0.009,  max: 0.010 },
  s:          { label: 'S',             unidade: '% MS',    min: 0.002,  max: 0.0025 },
  na:         { label: 'Na',            unidade: '% MS',    min: 0.0022 },
  cl:         { label: 'Cl',            unidade: '% MS',    min: 0.0025, max: 0.0030 },
  co:         { label: 'Co',            unidade: 'mg/kg',   min: 0.2 },
  cu:         { label: 'Cu',            unidade: 'mg/kg',   min: 10,     max: 15 },
  mn_min:     { label: 'Mn',            unidade: 'mg/kg',   min: 30,     max: 40 },
  zn:         { label: 'Zn',            unidade: 'mg/kg',   min: 50,     max: 60 },
  se:         { label: 'Se',            unidade: 'mg/kg',   min: 0.3,    max: 0.6 },
  i:          { label: 'I',             unidade: 'mg/kg',   min: 0.5 },
  fe:         { label: 'Fe',            unidade: 'mg/kg',   min: 15 },
  vit_a:      { label: 'Vit A',         unidade: 'UI/kg',   min: 3000,   max: 4000 },
  vit_d3:     { label: 'Vit D3',        unidade: 'UI/kg',   min: 1500,   max: 2000 },
  vit_e:      { label: 'Vit E',         unidade: 'UI/kg',   min: 25,     max: 30 },
  biotina:    { label: 'Biotina',       unidade: 'mg/kg',   min: 20,     max: 25 },
  monensina:  { label: 'Monensina',     unidade: 'mg/kg',   min: 300,    max: 350 },
  cr:         { label: 'Cr',            unidade: 'mg/kg',   min: 5 },
  levedura:   { label: 'Levedura',      unidade: 'UFC/kg',  ref: '1-2×10¹⁰' },
  // indicadores
  fdnf_kg_pv:      { label: 'FDNF/PV',           unidade: '%', max: 0.009, ref: 'Alta: 0,8–0,9% | Méd: 0,9% | Baixa: 0,9–1,1%' },
  pct_forragem_ms: { label: '% Forragem MS',      unidade: '%',      min: 0.40,  max: 0.60, ref: '40–60%' },
  fdn8_amido_deg:  { label: 'FDN>8 / Amido Deg',  unidade: '',       min: 1,                ref: '≥ 1' },
  lis_met:         { label: 'Lis / Met',           unidade: '',       ref: '~3' },
  ca_p:            { label: 'Ca / P',              unidade: '',       min: 2,     max: 6,    ref: '2:1 – 6:1' },
  dcad:            { label: 'DCAD',                unidade: 'mEq/kg', min: 150 },
};

/** Retorna referências ajustadas dinamicamente pela produção de leite (PB e CNF) */
export function getReferenciasLactacao(leite: number): Record<string, Referencia> {
  const refs = { ...REFERENCIAS_LACTACAO };

  // PB: dinâmico por faixa de produção
  if (leite >= 30) {
    refs.pb = { ...refs.pb, min: 0.16, max: 0.17 };
  } else if (leite >= 20) {
    refs.pb = { ...refs.pb, min: 0.15, max: 0.16 };
  } else {
    refs.pb = { ...refs.pb, min: 0.14, max: 0.15 };
  }

  // CNF: dinâmico por faixa de produção
  if (leite >= 30) {
    refs.cnf = { ...refs.cnf, min: 0.35, max: 0.45 };
  } else if (leite >= 20) {
    refs.cnf = { ...refs.cnf, min: 0.30, max: 0.35 };
  } else {
    refs.cnf = { ...refs.cnf, min: 0.20, max: 0.30 };
  }

  return refs;
}

export type StatusNutriente = 'ok' | 'alto' | 'baixo' | 'critico_alto' | 'critico_baixo' | 'sem_ref';

export function getStatus(valor: number, ref: Referencia): StatusNutriente {
  if (ref.tipo === 'calculada') return 'sem_ref';
  if (ref.ref !== undefined && ref.min === undefined && ref.max === undefined) return 'sem_ref';

  const min = ref.min ?? -Infinity;
  const max = ref.max ?? Infinity;
  const tolerance = 0.10;

  if (valor >= min && valor <= max) return 'ok';
  if (ref.min !== undefined && valor < min * (1 - tolerance)) return 'critico_baixo';
  if (ref.max !== undefined && valor > max * (1 + tolerance)) return 'critico_alto';
  if (ref.min !== undefined && valor < min) return 'baixo';
  if (ref.max !== undefined && valor > max) return 'alto';
  return 'sem_ref';
}

export function statusColor(status: StatusNutriente): string {
  switch (status) {
    case 'ok':            return 'bg-emerald-50 text-emerald-800 border border-emerald-100';
    case 'baixo':         return 'bg-amber-50 text-amber-800 border border-amber-100';
    case 'alto':          return 'bg-amber-50 text-amber-800 border border-amber-100';
    case 'critico_baixo': return 'bg-red-50 text-red-800 border border-red-100';
    case 'critico_alto':  return 'bg-red-50 text-red-800 border border-red-100';
    default:              return 'bg-gray-50 text-gray-600 border border-gray-100';
  }
}

export function statusDot(status: StatusNutriente): string {
  switch (status) {
    case 'ok':            return '🟢';
    case 'baixo':         return '🟡';
    case 'alto':          return '🟡';
    case 'critico_baixo': return '🔴';
    case 'critico_alto':  return '🔴';
    default:              return '⚪';
  }
}
