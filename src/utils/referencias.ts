import type { Referencia } from '../types';

/**
 * REFERÊNCIAS DE FORMULAÇÃO PARA VACAS EM LACTAÇÃO
 *
 * IMPORTANTE — origem das faixas (didático):
 * O NASEM 2021 ("Nutrient Requirements of Dairy Cattle, 8th ed.") NÃO publica
 * faixas-alvo de "% MS" como referência direta de formulação. Ele calcula
 * REQUERIMENTOS DINÂMICOS por animal (energia, MP, minerais em g/d ou mg/d) e
 * deixa o nutricionista converter em % MS conforme a CMS prevista.
 *
 * Assim, a maioria das faixas neste arquivo são heurísticas práticas
 * (NRC 2001 7th ed. + ajustes de campo Rehagro). Para nutrientes em que o
 * motor calcula o requerimento dinâmico via NASEM 2021 (PB, PDR/RDP, PNDR/RUP,
 * MP, Met, Lys, NEL), a faixa serve como CHECAGEM PEDAGÓGICA — o resultado
 * "ok" da dieta vem do cálculo dinâmico do motor (PainelResultados), não desta
 * faixa.
 *
 * Cada entrada carrega o campo `fonte` para o aluno saber a origem do número.
 */

// Tags de fonte (padronizadas para facilitar busca/edição):
const F_NASEM_DIN  = 'NASEM 2021 — cálculo dinâmico no motor';
const F_NRC_REHA   = 'NRC 2001 / Rehagro';
const F_NASEM_C11  = 'NASEM 2021 Cap. 11 (Minerais)';
const F_NASEM_C12  = 'NASEM 2021 Cap. 12 (Vitaminas)';
const F_REHA_EMP   = 'Empírico Rehagro';

export const REFERENCIAS_LACTACAO: Record<string, Referencia> = {
  cms:        { label: 'CMS',           unidade: 'kg/d',    tipo: 'calculada' },

  // ── Proteína (motor calcula dinâmico via Eq. 6-1; faixas = checagem prática)
  pb:         { label: 'PB',            unidade: '% MS',    min: 0.14,   max: 0.17,   fonte: F_NASEM_DIN },
  pdr:        { label: 'PDR',           unidade: '% MS',    min: 0.10,   max: 0.11,   fonte: F_NASEM_DIN },
  pndr:       { label: 'PNDR',          unidade: '% MS',    min: 0.04,   max: 0.07,   fonte: F_NASEM_DIN },

  // ── Carboidratos (heurísticas práticas; motor usa NDF dig dinâmica Cap. 4)
  fdn:        { label: 'FDN',           unidade: '% MS',    min: 0.18,                fonte: F_NRC_REHA },
  efdn:       { label: 'eFDN',          unidade: '% MS',    min: 0.15,   max: 0.18,   fonte: F_NRC_REHA },
  fdnf:       { label: 'FDNF',          unidade: '% MS',    min: 0.19,                fonte: F_NRC_REHA },
  cnf:        { label: 'CNF',           unidade: '% MS',    min: 0.20,   max: 0.45,   fonte: F_NRC_REHA },
  amido:      { label: 'Amido',         unidade: '% MS',    min: 0.20,   max: 0.30,   fonte: F_NRC_REHA },
  amido_deg:  { label: 'Amido Deg',     unidade: '% MS',    min: 0.15,   max: 0.20,   fonte: F_REHA_EMP },

  // ── Energia (motor calcula cadeia DE → ME → NEL via Cap. 20 NASEM 2021)
  nel:        { label: 'NEl',           unidade: 'Mcal/kg', tipo: 'calculada' },
  ndt:        { label: 'NDT',           unidade: '% MS',    tipo: 'calculada' },

  // ── Lipídios
  ee:         { label: 'EE',            unidade: '% MS',                 max: 0.05,   fonte: F_NRC_REHA },
  ee_insat:   { label: 'EE Insat',      unidade: '% MS',                 max: 0.03,   fonte: F_REHA_EMP },

  // ── Aminoácidos (motor calcula dinâmico)
  met:        { label: 'Met',           unidade: '% MS',    tipo: 'calculada' },
  lys:        { label: 'Lis',           unidade: '% MS',    tipo: 'calculada' },

  // ── Macrominerais (NASEM 2021 Cap. 11 — requerimento dinâmico; faixa = %MS prática)
  ca:         { label: 'Ca',            unidade: '% MS',    min: 0.006,  max: 0.008,  fonte: F_NASEM_C11 },
  p:          { label: 'P',             unidade: '% MS',    min: 0.0035, max: 0.0040, fonte: F_NASEM_C11 },
  mg:         { label: 'Mg',            unidade: '% MS',    min: 0.0025, max: 0.0035, fonte: F_NASEM_C11 },
  k:          { label: 'K',             unidade: '% MS',    min: 0.009,  max: 0.010,  fonte: F_NASEM_C11 },
  s:          { label: 'S',             unidade: '% MS',    min: 0.002,  max: 0.0025, fonte: F_NASEM_C11 },
  na:         { label: 'Na',            unidade: '% MS',    min: 0.0022,              fonte: F_NASEM_C11 },
  cl:         { label: 'Cl',            unidade: '% MS',    min: 0.0025, max: 0.0030, fonte: F_NASEM_C11 },

  // ── Microminerais (NASEM 2021 Cap. 11)
  co:         { label: 'Co',            unidade: 'mg/kg',   min: 0.2,                 fonte: F_NASEM_C11 },
  cu:         { label: 'Cu',            unidade: 'mg/kg',   min: 10,     max: 15,     fonte: F_NASEM_C11 },
  mn_min:     { label: 'Mn',            unidade: 'mg/kg',   min: 30,     max: 40,     fonte: F_NASEM_C11 },
  zn:         { label: 'Zn',            unidade: 'mg/kg',   min: 50,     max: 60,     fonte: F_NASEM_C11 },
  se:         { label: 'Se',            unidade: 'mg/kg',   min: 0.3,    max: 0.6,    fonte: F_NASEM_C11 },
  i:          { label: 'I',             unidade: 'mg/kg',   min: 0.5,                 fonte: F_NASEM_C11 },
  fe:         { label: 'Fe',            unidade: 'mg/kg',   min: 15,                  fonte: F_NASEM_C11 },

  // ── Vitaminas (NASEM 2021 Cap. 12)
  vit_a:      { label: 'Vit A',         unidade: 'UI/kg',   min: 3000,   max: 4000,   fonte: F_NASEM_C12 },
  vit_d3:     { label: 'Vit D3',        unidade: 'UI/kg',   min: 1500,   max: 2000,   fonte: F_NASEM_C12 },
  vit_e:      { label: 'Vit E',         unidade: 'UI/kg',   min: 25,     max: 30,     fonte: F_NASEM_C12 },

  // ── Aditivos (faixa prática — não há requerimento NASEM)
  biotina:    { label: 'Biotina',       unidade: 'mg/kg',   min: 20,     max: 25,     fonte: F_REHA_EMP },
  monensina:  { label: 'Monensina',     unidade: 'mg/kg',   min: 300,    max: 350,    fonte: F_REHA_EMP },
  cr:         { label: 'Cr',            unidade: 'mg/kg',   min: 5,                   fonte: F_REHA_EMP },
  levedura:   { label: 'Levedura',      unidade: 'UFC/kg',  ref: '1-2×10¹⁰',           fonte: F_REHA_EMP },

  // ── Indicadores compostos (heurísticas práticas Rehagro/literatura)
  fdnf_kg_pv:      { label: 'FDNF/PV',           unidade: '%',      max: 0.009,
                     ref: 'Alta: 0,8–0,9% | Méd: 0,9% | Baixa: 0,9–1,1%',  fonte: F_NRC_REHA },
  pct_forragem_ms: { label: '% Forragem MS',     unidade: '%',      min: 0.40,  max: 0.60,
                     ref: '40–60%',                                        fonte: F_NRC_REHA },
  fdn8_amido_deg:  { label: 'FDN>8 / Amido Deg', unidade: '',       min: 1,
                     ref: '≥ 1',                                           fonte: F_REHA_EMP },
  lis_met:         { label: 'Lis / Met',         unidade: '',
                     ref: '~3',                                            fonte: F_NASEM_DIN },
  ca_p:            { label: 'Ca / P',            unidade: '',       min: 2,     max: 6,
                     ref: '2:1 – 6:1',                                     fonte: F_NRC_REHA },
  dcad:            { label: 'DCAD',              unidade: 'mEq/kg', min: 150,                fonte: F_NASEM_C11 },
};

/**
 * Retorna referências ajustadas dinamicamente pela produção de leite.
 *
 * Faixas escalonadas por produção (PB, PDR, PNDR, CNF):
 *   ≥ 30 L/d         → demanda alta de proteína metabolizável e energia
 *   20–29 L/d        → demanda moderada
 *   <  20 L/d        → demanda baixa
 *
 * Lógica: vaca de alta produção exige mais MP → mais PB total, com aumento
 * proporcional em PDR (síntese microbiana) e PNDR (escape para MP).
 * Valores tirados de NRC 2001 Tab. 14-1 + ajustes Rehagro.
 */
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

  // PDR: dinâmico por faixa de produção (mais síntese microbiana com mais leite)
  if (leite >= 30) {
    refs.pdr = { ...refs.pdr, min: 0.10, max: 0.11 };
  } else if (leite >= 20) {
    refs.pdr = { ...refs.pdr, min: 0.09, max: 0.10 };
  } else {
    refs.pdr = { ...refs.pdr, min: 0.08, max: 0.09 };
  }

  // PNDR: dinâmico por faixa de produção (mais escape → mais MP para o leite)
  if (leite >= 30) {
    refs.pndr = { ...refs.pndr, min: 0.05, max: 0.07 };
  } else if (leite >= 20) {
    refs.pndr = { ...refs.pndr, min: 0.04, max: 0.06 };
  } else {
    refs.pndr = { ...refs.pndr, min: 0.03, max: 0.05 };
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
