export interface Alimento {
  id?: string;
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
  // Campos NASEM 2021 Tabela 19-1 (opcionais — pedagógicos)
  soluble_protein?: number | null;  // % CP (fração 0-1)
  adip?: number | null;             // % MS — proteína insolúvel em ADF
  ndip?: number | null;             // % MS — proteína insolúvel em NDF
  lignin?: number | null;           // % MS
  wsc?: number | null;              // % MS — carboidratos solúveis em água
  de_base?: number | null;          // Mcal/kg MS — DE base NASEM Tabela 19-1
  mo?: number | null;               // mg/kg MS — Molibdênio
  // Cadeia de energia NASEM 2021 (fix Fase 1)
  fa?: number | null;               // % MS — Fd_FA (ácidos graxos verdadeiros, ≠ EE)
  dc_st?: number | null;            // % — Fd_dcSt (digestibilidade do amido por alimento)
  dc_fa?: number | null;            // % — Fd_dcFA (digestibilidade FA, Tabela 4-1)
  npn_frac?: number | null;         // fração 0-1 do PB que é NPN (Ureia=1, demais ~0)
  // PSPS (Penn State Particle Separator) — não usado no motor NASEM 2021, mas mantido
  // por valor pedagógico (alunos veem em outras referências). Null por padrão.
  mn8?: number | null;              // Fração FDN > 8mm (mn8/mn19 do PSPS)
  mn19?: number | null;             // Fração FDN > 19mm
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
  ivndfd48?: number | null;       // Digestibilidade in vitro FDN 48h, % do FDN — NASEM 2021
  fonte_nasem?: string | null;    // Nome original NASEM (rastreabilidade)
  alimento_base?: string | null;  // Nome PT-BR do alimento clonado como base (rastreabilidade)
  origem_laudo?: LaudoMetadata | null;  // Metadata se importado de XML de laboratório
}

/** Metadata de laudo de análise (importado via XML — schema CVAS/Dairy One/3R Lab) */
export interface LaudoMetadata {
  laboratorio: string;       // ex: "3R Laboratório", "Dairy One"
  numero_laudo: string;      // ex: "3200028117"
  data_analise: string;      // ISO YYYY-MM-DD
  data_chegada?: string;     // ISO
  nome_amostra?: string;     // descrição da amostra
  fazenda?: string;          // ex: "CAMPO RAÇÕES E MINERAIS"
  tipo_codigo?: number;      // CVAS Feed Type code
  importado_em: string;      // ISO timestamp do import
  campos_calculados?: Record<string, string>;  // ex: { ivndfd48: 'calc cinético' }
}

export type Raca = 'Holstein' | 'Jersey' | 'Outra';

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
  // Gestação (NASEM 2021 Eq. 20-225 a 20-239) — campos novos, opcionais para compat
  raca?: Raca;
  dias_gestacao?: number;           // 0 = não prenhe (default 0)
  peso_bezerro_alvo?: number;       // kg ao nascimento (default por raça)
  gestacao_total?: number;          // dias totais de gestação (default 280)
  // Composição corporal (NASEM 2021 Eq. 20-247/258/270 — Fase 5)
  // Necessário para ganho de frame (primípara crescendo) e ECC (reserva).
  peso_maduro?: number;             // kg (default 700 Holstein / 500 Jersey)
  ganho_frame_kg_dia?: number;      // Trg_FrmGain (default 0 — multípara madura)
  ganho_reserva_kg_dia?: number;    // Trg_RsrvGain (default 0 — ECC estável)
  // Método de cálculo de dcNDF (NASEM 2021 Use_DNDF_IV switch — Fase 2.1)
  //   'lignin'    = Eq. 20-112 (lignina, default NASEM oficial)
  //   'iv_forage' = Eq. 20-111 (IVNDFD48) só forragens; lignina nos concentrados
  //   'iv_all'    = Eq. 20-111 (IVNDFD48) para todos os alimentos
  ndf_method?: 'lignin' | 'iv_forage' | 'iv_all';
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
  dt_de?: number;     // Densidade DE da dieta (Mcal/kg MS) — NASEM 2021 Eq. 20-182
  dt_me?: number;     // Densidade ME da dieta (Mcal/kg MS) — NASEM 2021 Eq. 20-307
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
  leite_potencial_final: number;
  fator_limitante: 'energia' | 'proteina';
  // custo
  custoTotal: number;
  custoKgMS: number;
  custoLitro: number;
}
