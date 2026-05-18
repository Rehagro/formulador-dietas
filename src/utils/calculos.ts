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
  let kgMN_forragem = 0;   // necessário para Dt_ForWet (Eq. 20-52/53)
  let custoTotal = 0;

  // NASEM 2021 — Frações proteicas (Eq. 6-1) e Michaelis-Menten (Eq. 20-74)
  let An_idRUPIn = 0;  // kg/d — RUP digerível (entra na MP)
  let An_RDPIn   = 0;  // kg/d — proteína degradada no rúmen

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

    // ── NASEM 2021 — RUP/RDP via frações proteicas (Eq. 6-1) ──────────────
    // ATENÇÃO: calcularTaxasPassagem retorna kPx em DECIMAL/h (ex.: 0.031 = 3.1%/h)
    // Mas a.kd_prot está em %/h. Para o competidor de Eq. 6-1 dar valores corretos
    // ambos precisam estar em %/h → multiplicar kP por 100.
    const kP_pct = (a.tipo === 'F' ? kPf : kPc) * 100;  // %/h
    let kgRUP_f = 0;
    let kgRDP_f = 0;
    let idRUP_f = 0;

    if (a.prot_a !== null && a.prot_b !== null && a.prot_c !== null && a.kd_prot !== null) {
      const fracA = a.prot_a / 100;
      const fracB = a.prot_b / 100;
      const fracC = a.prot_c / 100;
      const kd    = a.kd_prot;  // %/h

      // Fração B compete entre degradação (kd) e passagem (kP), ambos em %/h
      const rupB = fracB * (kP_pct / (kd + kP_pct));
      const rupC = fracC;        // 100% escapa (ligada à FDA, indegradável)
      const rdpA = fracA;        // 100% degrada
      const rdpB = fracB * (kd / (kd + kP_pct));

      kgRUP_f = a.pb * kgMS * (rupB + rupC);
      kgRDP_f = a.pb * kgMS * (rdpA + rdpB);

      // Digestibilidade intestinal do RUP (Eq. 20-123/124) — fallback 0,80
      const dcRUP = a.rup_digest !== null
        ? a.rup_digest
        : (() => { console.warn(`[NASEM] rup_digest ausente para "${a.nome}". Usando fallback 0.80.`); return 0.80; })();

      idRUP_f = kgRUP_f * dcRUP;
    } else if (a.pb > 0) {
      console.warn(`[NASEM] Frações proteicas ausentes para "${a.nome}". RUP/RDP não calculados.`);
    }

    An_idRUPIn += idRUP_f;
    An_RDPIn   += kgRDP_f;

    kgPB += a.pb * kgMS;
    kgPDR += kgRDP_f;
    kgPNDR += kgRUP_f;
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
    const kd_amido = a.kd_amido ?? 0;  // %/h (mesma unidade que kP_pct)
    const kPc_pct = kPc * 100;          // converte decimal/h → %/h
    kgAMIDO += amido * kgMS;
    kgAMIDO_DEG += kPc_pct > 0 && kd_amido > 0
      ? (kd_amido / (kd_amido + kPc_pct)) * amido * kgMS
      : 0;

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

    if (a.tipo === 'F') {
      kgMS_forragem += kgMS;
      kgMN_forragem += kgMN;
    }
  }

  const ms = totalKgMS || 1;

  // conversão para % MS (já em proporção 0-1 para macros, mg/kg para micros)
  const nel_mcal_kg = kgNEL / ms;

  // ── Leite potencial pela energia (NEl) — NRC 2021 ──────────────────────────
  // Mantença: NEm = 0,10 × PV^0,75 Mcal/d (NRC 2021 Eq. 3-13; era 0,08 no NRC 2001)
  // NEL/kg leite = 0,0929×gord% + 0,055×prot% + 0,0395×lact%  (NRC 2021 Eq. 3-14a)
  const nelMantenca = 0.10 * Math.pow(animal.peso, 0.75);
  const nelDisponivel = kgNEL - nelMantenca;
  const nel_por_kg_leite = 0.0929 * animal.gordura + 0.055 * animal.proteina + 0.0395 * animal.lactose;
  const leite_potencial_nel = nel_por_kg_leite > 0 ? Math.max(0, nelDisponivel / nel_por_kg_leite) : 0;

  // ── Proteína Microbiana — Michaelis-Menten (NASEM 2021 Eq. 20-74/75/76) ─────
  // Parâmetros fixos (Eq. 20-75)
  const MiN_VmInt    = 100.8;   // g/d — intercepto
  const MiN_VmRDPSlp = 81.56;   // g/d por kg de RDP
  const MiN_KmrdNDF  = 0.0939;  // constante MM para NDF ruminal
  const MiN_KmrdSt   = 0.0274;  // constante MM para amido ruminal

  // RDP cap em 12% da MS (NASEM 2021, Cap. 6)
  const rdp_pct_dieta = totalKgMS > 0 ? (An_RDPIn / totalKgMS) * 100 : 0;
  const An_RDPIn_efetivo = rdp_pct_dieta > 12 ? 0.12 * totalKgMS : An_RDPIn;

  // Vm de síntese microbiana (Eq. 20-75)
  const MiN_Vm = MiN_VmInt + MiN_VmRDPSlp * An_RDPIn_efetivo;

  // ── NASEM 2021 — Rum_dcNDF e Rum_dcSt (Eq. 20-52, 20-53) ────────────────
  // Equações diet-level oficiais para digestibilidade ruminal de NDF e amido.
  // Substituem a aproximação anterior (ivndfd48 ajustado direto + kd/(kd+kP)).
  // ivndfd48 NÃO é input destas equações — entra apenas em Total Tract NDF
  // (Eq. 20-115), que não é usado na Michaelis-Menten.
  let Rum_DigNDFIn = 0;
  let Rum_DigStIn  = 0;
  if (totalKgMS > 0) {
    const NDF_pct = (kgFDN / totalKgMS) * 100;     // % MS
    const St_pct  = (kgAMIDO / totalKgMS) * 100;
    const CP_pct  = (kgPB / totalKgMS) * 100;
    const ForNDF_pct = (kgFDNF / totalKgMS) * 100; // % FDN forragem na MS
    const ForWet_pct = totalKgMN > 0 ? (kgMN_forragem / totalKgMN) * 100 : 0;
    const ADF_div_NDF_pct = kgFDN > 0 ? (kgFDA / kgFDN) * 100 : 0;

    // Eq. 20-52 — Rum_dcNDF em %
    const Rum_dcNDF = -31.9
      + 0.721  * NDF_pct
      - 0.247  * St_pct
      + 6.63   * CP_pct
      - 0.211  * CP_pct * CP_pct
      - 0.387  * ADF_div_NDF_pct
      - 0.121  * ForWet_pct
      + 1.51   * totalKgMS;

    // Eq. 20-53 — Rum_dcSt em %
    const Rum_dcSt = 70.6
      - 1.45   * totalKgMS
      + 0.424  * ForNDF_pct
      + 1.39   * St_pct
      - 0.0219 * St_pct * St_pct
      - 0.154  * ForWet_pct;

    // Eq. 20-54 e 20-55 — bounded em [0, 100] para consistência biológica
    const Rum_dcNDF_bound = Math.min(100, Math.max(0, Rum_dcNDF));
    const Rum_dcSt_bound  = Math.min(100, Math.max(0, Rum_dcSt));

    Rum_DigNDFIn = (Rum_dcNDF_bound / 100) * kgFDN;
    Rum_DigStIn  = (Rum_dcSt_bound  / 100) * kgAMIDO;
  }

  // Equação de Michaelis-Menten (Eq. 20-74) com proteção contra divisão por zero
  let Du_MiCP   = 0;
  let Du_idMiTP = 0;
  if (Rum_DigNDFIn > 0 || Rum_DigStIn > 0) {
    const denom = 1
      + (Rum_DigNDFIn > 0 ? MiN_KmrdNDF / Rum_DigNDFIn : 0)
      + (Rum_DigStIn  > 0 ? MiN_KmrdSt  / Rum_DigStIn  : 0);
    const Du_MiN_g = MiN_Vm / denom;                  // g N/d
    Du_MiCP        = Du_MiN_g * 6.25 / 1000;          // kg/d (Eq. 20-76)
    const Du_idMiCP = Du_MiCP * 0.80;                  // kg/d (Eq. 20-126)
    Du_idMiTP       = Du_idMiCP * 0.824;               // kg/d (Eq. 20-127)
  }

  // MP total disponível (Eq. 20-136): MP = idRUP + idMiTP
  const An_MPIn = An_idRUPIn + Du_idMiTP;

  // ── Manutenção proteica (NASEM 2021 Eq. 20-283 a 20-305) ─────────────────
  // Scurf (Eq. 20-283/284/285)
  const Scrf_NP  = (0.20 * Math.pow(animal.peso, 0.60) * 0.86) / 1000;     // kg/d
  // Urinária endógena (Eq. 20-294/295/296) — já em MP equivalente (eff = 1)
  const Ur_NPend = (0.053 * animal.peso * 6.25) / 1000;                    // kg/d
  // Fecal endógena (Eq. 20-300/302)
  const fdn_pct  = totalKgMS > 0 ? (kgFDN / totalKgMS) * 100 : 0;
  const Fe_CPend = (12.0 + 0.12 * fdn_pct) * totalKgMS / 1000;             // kg/d
  const Fe_NPend = Fe_CPend * 0.73;                                         // 73% TP (Eq. 20-302)

  // Conversão NP→MP: Scurf e fecal usam KmMP_NP = 0.69 (Eq. 20-305/306)
  // Urinária é direta (eff = 1)
  const KmMP_NP = 0.69;
  const mp_mantenca = (Scrf_NP + Fe_NPend) / KmMP_NP + Ur_NPend;          // kg/d

  // ── Gestação proteica — Gest_MPuse (NASEM 2021 Eq. 20-225 a 20-239) ──────
  // Calcula MP consumida pelo crescimento do útero grávido. Subtrai de
  // An_MPavailMilk junto com a manutenção.
  //
  // Parâmetros do modelo exponencial Koong (1975), Tabela 20-10:
  //   K_GrUterSyn     = 2,43×10⁻²
  //   K_GrUterSynDecay = 2,45×10⁻⁵
  //   GrUter:Fetus ratio (parto) = 1,816 kg/kg (gestação de 280 d)
  //
  // Modelo: GrUter_Wt(t) = GrUter_Wt_parto × exp(−(Ks − Kd × t) × (T − t))
  // Derivada: GrUter_WtGain = GrUter_Wt × (Ks + Kd × T − 2 × Kd × t)
  const dias_gest    = animal.dias_gestacao ?? 0;
  const peso_bez     = animal.peso_bezerro_alvo ?? (animal.raca === 'Jersey' ? 28 : 45);
  const T_gest       = animal.gestacao_total ?? 280;
  let Gest_MPuse = 0;
  if (dias_gest > 0 && dias_gest <= T_gest) {
    const K_GrUterSyn      = 2.43e-2;
    const K_GrUterSynDecay = 2.45e-5;
    const fGrUter_Fetus    = 1.816;       // Eq. 20-225 (LengthGest = 280)
    const GrUter_Wt_parto  = peso_bez * fGrUter_Fetus;

    // Eq. 20-227 — peso do útero grávido no dia DayGest
    const expoente = -(K_GrUterSyn - K_GrUterSynDecay * dias_gest) * (T_gest - dias_gest);
    const GrUter_Wt = GrUter_Wt_parto * Math.exp(expoente);

    // Derivada analítica → ganho diário (Eq. 20-233)
    const GrUter_WtGain = GrUter_Wt
      * (K_GrUterSyn + K_GrUterSynDecay * T_gest - 2 * K_GrUterSynDecay * dias_gest);

    // Eq. 20-235 — Gest_NPgain (g/d), com 123 g NP/kg e fator escala 0,86
    const Gest_NPgain_g = GrUter_WtGain * 123 * 0.86;

    // Eq. 20-238/239 — KyMP_NP = 0,33 (gestação positiva)
    const KyMP_NP = 0.33;
    Gest_MPuse = (Gest_NPgain_g / KyMP_NP) / 1000;   // converte g → kg
  }

  // ── Leite potencial pela proteína (NASEM 2021 Eq. 20-339 derivada) ───────
  // A Eq. 20-339 do PDF está impressa como divisão por KlMP, mas a derivação
  // da Eq. 20-212 (Mlk_MPuse = Mlk_NP / KlMP) e a validação da Tabela 20-16
  // (observado 30.9 vs previsto 32.6 kg/d) indicam que KlMP deve estar no
  // numerador. Logo: leite = An_MPavailMilk × KlMP / (Trg_MilkTPp/100)
  //
  // OMISSÃO INTENCIONAL restante (vs Eq. 20-337 NASEM completa):
  //   - Body_MPuse  (Eq. 20-270): requer An_NPgain (ECC alvo vs atual). Para
  //     vacas em ECC estável (foco do app), ≈ 0. Documentado em /calculos.
  const An_MPavailMilk = Math.max(0, An_MPIn - mp_mantenca - Gest_MPuse);
  const KlMP_NP_Trg    = 0.69;
  const Trg_MilkTPp    = animal.proteina * 0.94;  // CP%→TP% (NASEM Cap. 3)
  const leite_potencial_prot = Trg_MilkTPp > 0
    ? Math.max(0, An_MPavailMilk * KlMP_NP_Trg / (Trg_MilkTPp / 100))
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
