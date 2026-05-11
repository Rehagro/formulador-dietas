import type { Alimento, AnimalLactacao, SlotIngrediente, ResultadoDieta } from '../types';

export function calcularCMSExigida(animal: AnimalLactacao): number {
  // NRC 2021 Eq. 20-21 (Dt_DMIn_Lact1)
  // Paridade: 0 = primípara, 1 = multípara (equivalente a An_Parity - 1 do NRC)
  const { ecc, paridade, peso, del, leite, gordura, proteina, lactose } = animal;

  // NEL/kg leite: NRC 2021 Eq. 20-217 com PB (Crude Protein) → coeficiente 0.055
  // (NRC 2021: "if milk CP is known, replace 5.85 with 5.5")
  const nel_leite = 0.0929 * gordura + 0.055 * proteina + 0.0395 * lactose;

  // Eq. 20-21: CMS base
  const cms = (
    3.7 +
    (paridade * 5.7) +
    (0.305 * nel_leite * leite) +
    (0.022 * peso) +
    ((-0.689 - 1.87 * paridade) * ecc)
  ) * (1 - (0.212 + paridade * 0.136) * Math.exp(-0.053 * del));

  // Teto biológico: máx 5% do PV
  return Math.max(0, Math.min(cms, peso * 0.05));
}

export function calcularNelAlimento(a: Alimento): number {
  if (a.nel !== null && a.nel > 0) return a.nel;
  if (a.ndt !== null) return (0.0245 * a.ndt * 100) - 0.12;
  return 0;
}

export function calcularCNFAlimento(a: Alimento): number {
  if (a.cnf !== null) return a.cnf;
  const fdn = a.fdn ?? 0;
  const ee = a.ee ?? 0;
  const cinza = a.cinza ?? 0;
  const pb = a.pb ?? 0;
  return Math.max(0, 1 - (fdn + ee + cinza + pb));
}

export function calcularEFDNAlimento(a: Alimento, kgMS: number): number {
  if (a.efdn !== null) return a.efdn * kgMS;
  const fdn = a.fdn ?? 0;
  if (a.tipo === 'F') return fdn * kgMS;
  const mn8 = a.mn8 ?? 0;
  return ((fdn * mn8) + (fdn * (1 - mn8) * 0.33)) * kgMS;
}

export function calcularFDN8(a: Alimento, kgMS: number): number {
  const fdn = a.fdn ?? 0;
  const mn8 = a.mn8 ?? 0;
  if (a.tipo === 'F') return fdn * mn8 * kgMS;
  return 0;
}

export function calcularFDN19(a: Alimento, kgMS: number): number {
  const fdn = a.fdn ?? 0;
  const mn19 = a.mn19 ?? 0;
  if (a.tipo === 'F') return fdn * mn19 * kgMS;
  return 0;
}

interface TaxasPassagem {
  kPf: number;
  kPc: number;
  kPl: number;
}

export function calcularTaxasPassagem(
  slots: SlotIngrediente[],
  alimentos: Alimento[],
  animal: AnimalLactacao
): TaxasPassagem {
  const peso = animal.peso;
  let kgMS_forragem = 0;
  let kgMS_concentrado = 0;

  for (const slot of slots) {
    if (!slot.alimentoNome || slot.kgMN <= 0) continue;
    const a = alimentos.find(x => x.nome === slot.alimentoNome);
    if (!a) continue;
    const kgMS = slot.kgMN * a.ms;
    if (a.tipo === 'F') { kgMS_forragem += kgMS; }
    else { kgMS_concentrado += kgMS; } // C e M tratados como concentrado nas taxas de passagem
  }

  const pctF_PV = (kgMS_forragem / peso) * 100;
  const pctC_PV = (kgMS_concentrado / peso) * 100;

  // kgMS_silagem removido — silagens agora são tipo F
  const kPf = (2.365 + (0.214 * pctF_PV) + (0.734 * pctC_PV)) / 100;
  const kPc = (1.169 + (1.375 * pctF_PV) + (1.721 * pctC_PV)) / 100;
  const kPl = (4.524 + (0.223 * pctF_PV) + (2.046 * pctC_PV)) / 100;

  return { kPf, kPc, kPl };
}

export function calcularResultados(
  slots: SlotIngrediente[],
  alimentos: Alimento[],
  animal: AnimalLactacao
): ResultadoDieta {
  const cmsExigida = calcularCMSExigida(animal);
  const { kPf, kPc, kPl } = calcularTaxasPassagem(slots, alimentos, animal);

  let totalKgMN = 0;
  let totalKgMS = 0;

  // kg absolutos por nutriente
  let kgPB = 0, kgPDR = 0, kgPNDR = 0;
  let kgFDN = 0, kgEFDN = 0, kgFDNF = 0, kgFDA = 0;
  let kgNEL = 0, kgNDT = 0;
  let kgEE = 0, kgEE_INSAT = 0;
  let kgCNF = 0, kgAMIDO = 0, kgAMIDO_DEG = 0;
  let kgMET = 0, kgLYS = 0;
  let kgCA = 0, kgP = 0, kgMG = 0, kgK = 0, kgS = 0, kgNA = 0, kgCL = 0;
  let kgCO = 0, kgCU = 0, kgMnMin = 0, kgZN = 0, kgSE = 0, kgI = 0, kgFE = 0;
  let kgVITA = 0, kgVITD3 = 0, kgVITE = 0;
  let kgBIOTINA = 0, kgMONENSINA = 0, kgCR = 0, kgLEVEDURA = 0;
  let kgFDN8 = 0;
  let kgMS_forragem = 0;
  let custoTotal = 0;

  for (const slot of slots) {
    if (!slot.alimentoNome || slot.kgMN <= 0) continue;
    const a = alimentos.find(x => x.nome === slot.alimentoNome);
    if (!a) continue;

    const kgMN = slot.kgMN;
    const kgMS = kgMN * a.ms;

    totalKgMN += kgMN;
    totalKgMS += kgMS;

    if (a.custo !== null) custoTotal += kgMN * a.custo;

    const nel = calcularNelAlimento(a);
    const cnf = calcularCNFAlimento(a);
    const pndr = a.pndr ?? 0;
    const pdr = a.pb - pndr;

    kgPB += a.pb * kgMS;
    kgPDR += pdr * kgMS;
    kgPNDR += pndr * kgMS;
    kgFDN += (a.fdn ?? 0) * kgMS;
    kgEFDN += calcularEFDNAlimento(a, kgMS);
    kgFDNF += a.tipo === 'F' ? (a.fdn ?? 0) * kgMS : 0;
    kgFDA += (a.fda ?? 0) * kgMS;
    kgNEL += nel * kgMS;
    kgNDT += (a.ndt ?? 0) * kgMS;
    kgEE += (a.ee ?? 0) * kgMS;
    kgEE_INSAT += (a.ee_insat ?? 0) * kgMS;
    kgCNF += cnf * kgMS;

    const amido = a.amido ?? 0;
    const kd_amido = a.kd_amido ?? 0;
    kgAMIDO += amido * kgMS;
    kgAMIDO_DEG += kPc > 0 ? (kd_amido / (kd_amido + kPc)) * amido * kgMS : 0;

    kgMET += (a.met ?? 0) * kgMS;
    kgLYS += (a.lys ?? 0) * kgMS;
    kgCA += (a.ca ?? 0) * kgMS;
    kgP += (a.p ?? 0) * kgMS;
    kgMG += (a.mg ?? 0) * kgMS;
    kgK += (a.k ?? 0) * kgMS;
    kgS += (a.s ?? 0) * kgMS;
    kgNA += (a.na ?? 0) * kgMS;
    kgCL += (a.cl ?? 0) * kgMS;
    kgCO += (a.co ?? 0) * kgMS;
    kgCU += (a.cu ?? 0) * kgMS;
    kgMnMin += (a.mn_min ?? 0) * kgMS;
    kgZN += (a.zn ?? 0) * kgMS;
    kgSE += (a.se ?? 0) * kgMS;
    kgI += (a.i ?? 0) * kgMS;
    kgFE += (a.fe ?? 0) * kgMS;
    kgVITA += (a.vit_a ?? 0) * kgMS;
    kgVITD3 += (a.vit_d3 ?? 0) * kgMS;
    kgVITE += (a.vit_e ?? 0) * kgMS;
    kgBIOTINA += (a.biotina ?? 0) * kgMS;
    kgMONENSINA += (a.monensina ?? 0) * kgMS;
    kgCR += (a.cr ?? 0) * kgMS;
    kgLEVEDURA += (a.levedura ?? 0) * kgMS;
    kgFDN8 += calcularFDN8(a, kgMS);

    if (a.tipo === 'F') kgMS_forragem += kgMS;
  }

  const ms = totalKgMS || 1;

  // conversão para % MS (já em proporção 0-1 para macros, mg/kg para micros)
  const nel_mcal_kg = kgNEL / ms;

  // ── Leite potencial pela energia (NEl) — NRC 2021 ──────────────────────────
  // Mantença: NEm = 0,08 × PV^0,75 Mcal/d
  // NEL/kg leite = 0,0929×gord% + 0,0563×prot% + 0,0395×lact%  (NRC 2021 Eq. 3-14)
  const nelMantenca = 0.08 * Math.pow(animal.peso, 0.75);
  const nelDisponivel = kgNEL - nelMantenca;
  const nel_por_kg_leite = 0.0929 * animal.gordura + 0.0563 * animal.proteina + 0.0395 * animal.lactose;
  const leite_potencial_nel = nel_por_kg_leite > 0 ? Math.max(0, nelDisponivel / nel_por_kg_leite) : 0;

  // ── Leite potencial pela proteína — NRC 2021 (Proteína Metabolizável) ──────
  // MP de PNDR (kg/d): PNDR × 0,80
  // MP microbiana (kg/d): NDT(kg) × 0,13 × 0,64  → unidades consistentes em kg
  // Mantença proteica (kg/d): 3,8 × PV^0,75 g/d ÷ 1000
  // Eficiência de síntese de proteína do leite: 0,67
  const mp_pndr    = kgPNDR * 0.80;
  const mp_mcp     = kgNDT  * 0.13 * 0.64;
  const mp_total   = mp_pndr + mp_mcp;
  const mp_mantenca = 3.8 * Math.pow(animal.peso, 0.75) / 1000;  // g→kg
  const mp_para_leite = Math.max(0, mp_total - mp_mantenca);
  const leite_potencial_prot = animal.proteina > 0
    ? Math.max(0, mp_para_leite / ((animal.proteina / 100) / 0.67))
    : 0;

  // ── Fator limitante — mínimo entre energia e proteína ──────────────────────
  const leite_potencial_final = Math.min(leite_potencial_nel, leite_potencial_prot);
  const fator_limitante: 'energia' | 'proteina' =
    leite_potencial_nel <= leite_potencial_prot ? 'energia' : 'proteina';

  const custoKgMS = totalKgMS > 0 ? custoTotal / totalKgMS : 0;
  const custoLitro = animal.leite > 0 ? custoTotal / animal.leite : 0;

  // DCAD: ((Na/23) + (K/39) - (Cl/35) - (S/32*2)) * 1e6 em mEq/kg MS
  const naKgMS = kgNA / ms;
  const kKgMS = kgK / ms;
  const clKgMS = kgCL / ms;
  const sKgMS = kgS / ms;
  const dcad = ((naKgMS / 23) + (kKgMS / 39) - (clKgMS / 35) - (sKgMS / 16)) * 1e6;

  return {
    totalKgMN,
    totalKgMS,
    cmsExigida,
    pb: kgPB / ms,
    pdr: kgPDR / ms,
    pndr: kgPNDR / ms,
    fdn: kgFDN / ms,
    efdn: kgEFDN / ms,
    fdnf: kgFDNF / ms,
    fda: kgFDA / ms,
    nel: nel_mcal_kg,
    ndt: kgNDT / ms,
    ee: kgEE / ms,
    ee_insat: kgEE_INSAT / ms,
    cnf: kgCNF / ms,
    amido: kgAMIDO / ms,
    amido_deg: kgAMIDO_DEG / ms,
    met: kgMET / ms,
    lys: kgLYS / ms,
    ca: kgCA / ms,
    p: kgP / ms,
    mg: kgMG / ms,
    k: kgK / ms,
    s: kgS / ms,
    na: kgNA / ms,
    cl: kgCL / ms,
    co: kgCO / ms,
    cu: kgCU / ms,
    mn_min: kgMnMin / ms,
    zn: kgZN / ms,
    se: kgSE / ms,
    i: kgI / ms,
    fe: kgFE / ms,
    vit_a: kgVITA / ms,
    vit_d3: kgVITD3 / ms,
    vit_e: kgVITE / ms,
    biotina: kgBIOTINA / ms,
    monensina: kgMONENSINA / ms,
    cr: kgCR / ms,
    levedura: kgLEVEDURA / ms,
    fdnf_kg_pv: animal.peso > 0 ? kgFDNF / animal.peso : 0,
    pct_forragem_ms: ms > 0 ? kgMS_forragem / ms : 0,
    fdn8_amido_deg: kgAMIDO_DEG > 0 ? kgFDN8 / kgAMIDO_DEG : 0,
    lis_met: kgMET > 0 ? kgLYS / kgMET : 0,
    ca_p: kgP > 0 ? kgCA / kgP : 0,
    dcad,
    kPf,
    kPc,
    kPl,
    leite_potencial_nel,
    leite_potencial_prot,
    leite_potencial_final,
    fator_limitante,
    custoTotal,
    custoKgMS,
    custoLitro,
  };
}

export function formatarValor(valor: number, unidade: string): string {
  if (!isFinite(valor) || isNaN(valor)) return '—';
  if (unidade === '% MS' || unidade === '%') return (valor * 100).toFixed(2) + '%';
  if (unidade === 'Mcal/kg') return valor.toFixed(3);
  if (unidade === 'kg/d') return valor.toFixed(1) + ' kg';
  if (unidade === 'UFC/kg') {
    if (valor === 0) return '—';
    return valor.toExponential(1);
  }
  return valor.toFixed(2);
}
