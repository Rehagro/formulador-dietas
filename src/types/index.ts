export interface Alimento {
  nome: string;
  custo: number | null;
  classificacao: string;
  tipo: 'C' | 'F' | 'M';
  ms: number;
  pb: number;
  pdr: number | null;
  pndr: number | null;
  fdn: number | null;
  efdn: number | null;
  mn8: number | null;
  mn19: number | null;
  fdnf: number | null;
  fda: number | null;
  nel: number | null;
  ndt: number | null;
  ee: number | null;
  ee_insat: number | null;
  cinza: number | null;
  cnf: number | null;
  amido: number | null;
  kd_amido: number | null;
  met: number | null;
  lys: number | null;
  ca: number | null;
  p: number | null;
  mg: number | null;
  k: number | null;
  s: number | null;
  na: number | null;
  cl: number | null;
  co: number | null;
  cu: number | null;
  mn_min: number | null;
  zn: number | null;
  se: number | null;
  i: number | null;
  fe: number | null;
  vit_a: number | null;
  vit_d3: number | null;
  vit_e: number | null;
  biotina: number | null;
  monensina: number | null;
  cr: number | null;
  levedura: number | null;
  prot_a: number | null;
  prot_b: number | null;
  prot_c: number | null;
  kd_prot: number | null;
  rup_digest: number | null;
  cp_digest: number | null;
  ndf_digest: number | null;
  fat_digest: number | null;
  lisina_pct: number | null;
  met_pct: number | null;
}

export interface AnimalLactacao {
  ecc: number;
  paridade: 0 | 1;
  peso: number;
  del: number;
  leite: number;
  gordura: number;
  proteina: number;
  lactose: number;
  precoLeite: number;
}

export interface SlotIngrediente {
  id: string;
  alimentoNome: string | null;
  kgMN: number;
}

export interface Dieta {
  id: string;
  nome: string;
  criadaEm: string;
  animal: AnimalLactacao;
  slots: SlotIngrediente[];
}

export type StatusNutriente = 'ok' | 'alto' | 'baixo' | 'critico_alto' | 'critico_baixo' | 'sem_ref';

export interface Referencia {
  label: string;
  unidade: string;
  min?: number;
  max?: number;
  tipo?: string;
  ref?: string;
}

export interface ResultadoDieta {
  totalKgMN: number;
  totalKgMS: number;
  cmsExigida: number;
  // nutrientes como % MS ou mg/kg
  pb: number;
  pdr: number;
  pndr: number;
  fdn: number;
  efdn: number;
  fdnf: number;
  fda: number;
  nel: number;
  ndt: number;
  ee: number;
  ee_insat: number;
  cnf: number;
  amido: number;
  amido_deg: number;
  met: number;
  lys: number;
  ca: number;
  p: number;
  mg: number;
  k: number;
  s: number;
  na: number;
  cl: number;
  co: number;
  cu: number;
  mn_min: number;
  zn: number;
  se: number;
  i: number;
  fe: number;
  vit_a: number;
  vit_d3: number;
  vit_e: number;
  biotina: number;
  monensina: number;
  cr: number;
  levedura: number;
  // indicadores
  fdnf_kg_pv: number;
  pct_forragem_ms: number;
  fdn8_amido_deg: number;
  lis_met: number;
  ca_p: number;
  dcad: number;
  kPf: number;
  kPc: number;
  kPl: number;
  leite_potencial_nel: number;
  leite_potencial_prot: number;
  // custo
  custoTotal: number;
  custoKgMS: number;
  custoLitro: number;
}
