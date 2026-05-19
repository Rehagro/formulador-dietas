import type { Alimento, AnimalLactacao, SlotIngrediente, ResultadoDieta } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// PARÂMETROS RUMINAIS — NASEM 2021 por categoria animal
//
// Cada categoria (lactação, vaca seca, pré-parto, recria, bezerro) tem seus
// próprios coeficientes ruminais. Hoje o motor só atende lactação; quando
// outras categorias forem implementadas, basta:
//   1. Adicionar entrada nova em RUMEN_PARAMS (ex: VACA_SECA, RECRIA)
//   2. Criar `calcularResultadosVacaSeca(...)` análoga que selecione o bloco
//   3. Manter `calcularResultados()` redirecionando por discriminator animal.state
//
// Valores extraídos do código oficial nasem_dairy (CNM/Guelph):
//   - KpFor, KpConc: coeff_dict (nutrient_intakes.py:310)
//   - fCPAdu, IntRUP, refCPIn: Eq. 6-1 (nutrient_intakes.py:379)
// ─────────────────────────────────────────────────────────────────────────────
export interface RumenParams {
  KpFor:   number;   // %/h — passage rate forragens
  KpConc:  number;   // %/h — passage rate concentrados
  fCPAdu:  number;   // 0-1 — fração da CP_A que escapa como RUP (Eq. 6-1)
  IntRUP:  number;   // kg/d — intercepto NASEM (Eq. 6-1)
  refCPIn: number;   // kg/d — CP de referência para escala IntRUP
}

export const RUMEN_PARAMS = {
  lactacao: {
    KpFor:    4.87,
    KpConc:   5.28,
    fCPAdu:   0.064,
    IntRUP:  -0.086,
    refCPIn:  3.39,
  } satisfies RumenParams,
  // Futuro:
  // vaca_seca:  { ... },
  // pre_parto:  { ... },
  // recria:     { ... },
  // bezerro:    { ... },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSIÇÃO CORPORAL — NASEM 2021 (Eq. 20-247 a 20-270 e Tabela 20-11)
// Constantes do `coeff_dict` oficial nasem_dairy.
// ─────────────────────────────────────────────────────────────────────────────
const BODY_PARAMS = {
  An_GutFill_BW:        0.18,   // fração do BW que é gut fill (Eq. 20-251)
  Body_NP_CP:           0.86,   // TP / CP ratio (= Body_NP_CP)
  CPGain_RsrvGain:      0.068,  // CP gain por kg reserva ganha
  FatGain_RsrvGain:    0.622,   // Fat gain por kg reserva ganha
  Kg_MP_NP_Trg_cow:     0.69,   // Trg_MP_NP (eficiência NP→MP para ganho corporal, vacas)
  Kf_ME_RE:             0.40,   // Eficiência RE→ME para ganho de frame (não-bezerro)
  En_FA:                9.40,   // Mcal/kg — heat of combustion FA
  En_TP:                5.55,   // Mcal/kg — heat of combustion proteína corporal
  Ky_ME_NE_gain:        0.14,   // Eficiência ME→NE gestação positiva
  Ky_ME_NE_loss:        0.89,   // Eficiência ME→NE perda
  NE_GrUtWt:            0.95,   // Mcal/kg — energia no útero grávido (Eq. 20-234)
};

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

/**
 * Digestibilidade base de NDF por alimento (NASEM 2021 Eq. 20-111 / 20-112).
 * O método é escolhido por animal.ndf_method (= Use_DNDF_IV do NASEM oficial).
 *
 * Retorna fração 0-1.
 *
 * Eq. 20-111 (in vitro): `(12 + 0.61 × IVNDFD48) / 100`
 *   - Requer IVNDFD48 medido (% do NDF), tipicamente 30-70%.
 *   - Mais informativo quando disponível.
 *
 * Eq. 20-112 (lignina, Van Soest): `0.75 × (NDF − Lg) × (1 − (Lg/NDF)^0.667) / NDF`
 *   - Usa só lignina, sempre disponível na T19-1 NASEM.
 *   - É o método DEFAULT do nasem_dairy oficial (`Use_DNDF_IV=0`).
 */
export function calcularFdDcNDFBase(
  a: Alimento,
  method: NonNullable<AnimalLactacao['ndf_method']>
): number {
  const isForage = a.tipo === 'F';
  // Decide se aplica IVNDFD48 (Eq. 20-111) para ESTE alimento
  const useIV =
    method === 'iv_all' ||
    (method === 'iv_forage' && isForage);

  if (useIV && a.ivndfd48 != null) {
    return (12 + 0.61 * a.ivndfd48) / 100;             // Eq. 20-111
  }
  // Eq. 20-112 — Van Soest, lignina
  if (a.lignin != null && a.fdn != null && a.fdn > 0 && a.lignin >= 0) {
    const ratio = Math.min(0.999, a.lignin / a.fdn);
    const dc    = 0.75 * (a.fdn - a.lignin) * (1 - Math.pow(ratio, 0.667)) / a.fdn;
    return Math.max(0, Math.min(1, dc));
  }
  return 0.50;   // fallback genérico
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
  // Quando efdn está informado, usa direto. Quando mn8 informado, usa fórmula NRC 2001
  // (mn8 × FDN). Caso contrário: forragens 100% FDN; concentrados 33% (default).
  if (a.efdn !== null) return a.efdn * kgMS;
  const fdn = a.fdn ?? 0;
  if (a.tipo === 'F') return fdn * kgMS;
  if (a.mn8 !== null && a.mn8 !== undefined) {
    return ((fdn * a.mn8) + (fdn * (1 - a.mn8) * 0.33)) * kgMS;
  }
  return fdn * 0.33 * kgMS;
}

/** % de FDN > 8mm (PSPS) para indicador fdn8_amido_deg. Só funciona se mn8 preenchido. */
export function calcularFDN8(a: Alimento, kgMS: number): number {
  const fdn = a.fdn ?? 0;
  const mn8 = a.mn8 ?? null;
  if (a.tipo === 'F' && mn8 !== null) return fdn * mn8 * kgMS;
  return 0;
}

interface TaxasPassagem {
  kPf: number;
  kPc: number;
  kPl: number;
}

/**
 * Taxas de passagem ruminal (kP) para vaca em LACTAÇÃO.
 *
 * NASEM 2021 (Cap. 6, Eq. 6-1) abandona as equações dependentes da composição
 * da dieta (NRC 2001 — Eq. 20-25/26/27 em função de %PV de F/C) e usa valores
 * fixos médios: KpFor=4,87%/h e KpConc=5,28%/h. A justificativa do NRC 2021 é
 * que as antigas equações tinham erro padrão maior que a variação real entre
 * dietas.
 *
 * kPl (líquidos) não é usado na Eq. 6-1 para vaca lactante. Mantido como kPc
 * para preservar compatibilidade do display em `Indicadores.tsx`.
 *
 * Para outras categorias futuras (vaca seca, recria, bezerro), criar funções
 * análogas — ver bloco RUMEN_PARAMS no topo deste arquivo.
 *
 * Os parâmetros `slots`/`alimentos` são mantidos para compatibilidade da API,
 * mas não são usados (valores ficam constantes na lactação NASEM 2021).
 */
export function calcularTaxasPassagem(
  _slots: SlotIngrediente[],
  _alimentos: Alimento[],
  _animal: AnimalLactacao
): TaxasPassagem {
  const p = RUMEN_PARAMS.lactacao;
  return {
    kPf: p.KpFor  / 100,
    kPc: p.KpConc / 100,
    kPl: p.KpConc / 100,   // alias (NASEM 2021 não distingue líquido em lactação)
  };
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
  let kgFA = 0;             // Fd_FA (FA verdadeira, ≠ EE) — Fase 1.2
  let kgNPN_CP = 0;         // NPN como CP equivalente — Fase 1.1 (rOM Eq. 20-99)
  let kgCNF = 0, kgAMIDO = 0, kgAMIDO_DEG = 0;
  let kgMET = 0, kgLYS = 0;
  let kgCA = 0, kgP = 0, kgMG = 0, kgK = 0, kgS = 0, kgNA = 0, kgCL = 0;
  let kgCO = 0, kgCU = 0, kgMnMin = 0, kgZN = 0, kgSE = 0, kgI = 0, kgFE = 0;
  let kgVITA = 0, kgVITD3 = 0, kgVITE = 0;
  let kgBIOTINA = 0, kgMONENSINA = 0, kgCR = 0, kgLEVEDURA = 0;
  let kgCinza = 0;        // necessário para rOM (Eq. 20-99) na cadeia de energia
  let kgFDN8 = 0;          // PSPS (Penn State) — só conta se mn8 preenchido no alimento
  let kgMS_forragem = 0;
  let kgMS_ForWet = 0;     // Dt_ForWet (NASEM): forragens com DM<71% E For>50% (silagens, fresca)
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

    // ── NASEM 2021 — RUP/RDP via Eq. 6-1 completa ──────────────────────────
    // Fonte: nasem_dairy/nasem_equations/nutrient_intakes.py:319-381
    //   Fd_RUPIn = (CPAIn − NPN_CPIn) × fCPAdu          ← fração A (6,4% escapa)
    //            + CPBIn × kP/(kd + kP)                  ← fração B (competição)
    //            + CPCIn                                  ← fração C (100%)
    //            + (IntRUP / refCPIn) × CPIn             ← intercepto da regressão
    // kP em %/h: kPf/kPc retornam decimal (4,87%/h → 0,0487) → × 100
    const kP_pct = (a.tipo === 'F' ? kPf : kPc) * 100;  // %/h
    const rp = RUMEN_PARAMS.lactacao;
    let kgRUP_f = 0;
    let kgRDP_f = 0;
    let idRUP_f = 0;

    if (a.prot_a !== null && a.prot_b !== null && a.prot_c !== null && a.kd_prot !== null) {
      const fracA = a.prot_a / 100;
      const fracB = a.prot_b / 100;
      const fracC = a.prot_c / 100;
      const kd    = a.kd_prot;  // %/h

      const kgCPIn  = a.pb * kgMS;
      const kgCPA   = kgCPIn * fracA;
      const kgCPB   = kgCPIn * fracB;
      const kgCPC   = kgCPIn * fracC;
      const kgNPN_in_feed = kgCPIn * (a.npn_frac ?? 0);  // NPN (todo na fração A)

      // (1) Fração A — escapa fCPAdu × (CPA − NPN)
      const kgRUPA = Math.max(0, kgCPA - kgNPN_in_feed) * rp.fCPAdu;
      // (2) Fração B — competição kP vs kd
      const kgRUPB = kgCPB * (kP_pct / (kd + kP_pct));
      // (3) Fração C — 100% escapa
      const kgRUPC = kgCPC;
      // (4) Intercepto da regressão (negativo para CP típica)
      const intRUP_term = (rp.IntRUP / rp.refCPIn) * kgCPIn;

      kgRUP_f = Math.max(0, kgRUPA + kgRUPB + kgRUPC + intRUP_term);
      kgRDP_f = Math.max(0, kgCPIn - kgRUP_f);

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
    // FA verdadeiro: prefere a.fa (Fd_FA do NASEM CSV); fallback 80% do EE
    // (heurística NASEM Cap. 4 — a maior parte do EE não-FA é cera/glicerol)
    kgFA += (a.fa ?? ((a.ee ?? 0) * 0.80)) * kgMS;
    // NPN: Ureia e Cloreto de Amônio têm npn_frac=1.0; demais ~0
    kgNPN_CP += (a.pb ?? 0) * (a.npn_frac ?? 0) * kgMS;
    kgCNF += cnf * kgMS;

    const amido = a.amido ?? 0;
    const kd_amido = a.kd_amido ?? 0;  // %/h (mesma unidade que kP_pct)
    const kPc_pct = kPc * 100;          // converte decimal/h → %/h
    kgAMIDO += amido * kgMS;
    kgAMIDO_DEG += kPc_pct > 0 && kd_amido > 0
      ? (kd_amido / (kd_amido + kPc_pct)) * amido * kgMS
      : 0;
    kgCinza += (a.cinza ?? 0) * kgMS;

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
      // Dt_ForWet NASEM (nutrient_intakes.py:128-131): só conta forragem com
      // DM<71% E For>50%. Como a.tipo='F' implica For=100%, basta checar DM.
      if (a.ms < 0.71) kgMS_ForWet += kgMS;
    }
  }

  const ms = totalKgMS || 1;

  // NEL exibido (nel_mcal_kg) é definido APÓS a cadeia de energia abaixo,
  // porque depende de An_NEIn calculado lá. Declaração com let para permitir
  // referência depois.

  // ── Gestação (pré-cálculo) — Fase 1.3 + Fase 5 ────────────────────────────
  // Computa GrUter_WtGain (Eq. 3-17a — NÃO é a derivada analítica do peso!).
  // NASEM 2021 usa modelo empírico (`gestation.py:179-186`):
  //   GrUter_BWgain = (Ksyn − Kdec × t) × GrUter_Wt(t)
  // Em seguida deriva Gest_NPgain (Eq. 20-235) e Gest_REgain (Eq. 20-234).
  let Gest_NPgain_g_pre = 0;
  let Gest_REgain = 0;  // Mcal NE/d — energia retida no útero
  {
    const _dias = animal.dias_gestacao ?? 0;
    const _peso_bez = animal.peso_bezerro_alvo ?? (animal.raca === 'Jersey' ? 28 : 45);
    const _T = animal.gestacao_total ?? 280;
    if (_dias > 0 && _dias <= _T) {
      const _Ksyn  = 2.43e-2;
      const _Kdec  = 2.45e-5;
      const _fGU_F = 1.816;
      const _GU0   = _peso_bez * _fGU_F;
      const _expo  = -(_Ksyn - _Kdec * _dias) * (_T - _dias);
      const _GU    = _GU0 * Math.exp(_expo);
      // Eq. 3-17a — rate empírico no dia t (NÃO é derivada de GU):
      const _GUgain = (_Ksyn - _Kdec * _dias) * _GU;
      Gest_NPgain_g_pre = _GUgain * 123 * 0.86;
      Gest_REgain       = _GUgain * BODY_PARAMS.NE_GrUtWt;     // Eq. 20-234
    }
  }
  // Eq. 20-237 — Gest_MEuse = REgain / Ky_ME_NE
  const Ky_ME_NE  = Gest_REgain >= 0 ? BODY_PARAMS.Ky_ME_NE_gain : BODY_PARAMS.Ky_ME_NE_loss;
  const Gest_MEuse = Gest_REgain / Ky_ME_NE;

  // ── Composição corporal — Fase 5 (NASEM 2021 Eq. 20-247 a 20-270) ─────────
  // Frame gain (esqueleto/órgãos) + Reserve gain (gordura/ECC).
  // Para vaca em ECC estável (madura, sem ganho de frame): tudo zero.
  const peso_maduro = animal.peso_maduro
    ?? (animal.raca === 'Jersey' ? 500 : 700);
  const Trg_FrmGain   = animal.ganho_frame_kg_dia   ?? 0;
  const Trg_RsrvGain  = animal.ganho_reserva_kg_dia ?? 0;
  const BW_ratio      = animal.peso / peso_maduro;

  // FRAME ── Eq. 20-251/253 (empty body), 20-258 (Frm_NPgain), 20-262 (Frm_NEgain)
  const Frm_Gain_empty = Trg_FrmGain * (1 - BODY_PARAMS.An_GutFill_BW);
  const FatGain_FrmGain = 0.067 + 0.375 * BW_ratio;             // Eq. 20-253
  const Frm_Fatgain    = FatGain_FrmGain * Frm_Gain_empty;
  const CPGain_FrmGain = 0.201 - 0.081 * BW_ratio;              // Eq. 20-258
  const Frm_NPgain     = CPGain_FrmGain * BODY_PARAMS.Body_NP_CP * Frm_Gain_empty;
  const Frm_CPgain     = Frm_NPgain / BODY_PARAMS.Body_NP_CP;
  const Frm_NEgain     = BODY_PARAMS.En_FA * Frm_Fatgain
                       + BODY_PARAMS.En_TP * Frm_CPgain;        // Eq. 20-263
  const Frm_MEgain     = Frm_NEgain / BODY_PARAMS.Kf_ME_RE;     // Eq. 20-265

  // RESERVE (ECC) ── Eq. 20-259 (Rsrv_NPgain), 20-264 (Rsrv_NEgain)
  // Sem gut fill (reserva é gordura/músculo, fora do TGI).
  const Rsrv_Gain_empty = Trg_RsrvGain;
  const Rsrv_Fatgain    = BODY_PARAMS.FatGain_RsrvGain * Rsrv_Gain_empty;
  const Rsrv_CPgain     = BODY_PARAMS.CPGain_RsrvGain  * Rsrv_Gain_empty;
  const Rsrv_NPgain     = Rsrv_CPgain * BODY_PARAMS.Body_NP_CP;
  const Rsrv_NEgain     = BODY_PARAMS.En_FA * Rsrv_Fatgain
                        + BODY_PARAMS.En_TP * Rsrv_CPgain;
  // Kr_ME_RE depende de ganho vs perda (Eq. 3-19a; sempre lactante aqui)
  const Kr_ME_RE   = Trg_RsrvGain > 0 ? 0.75 : 0.89;
  const Rsrv_MEgain = Rsrv_NEgain / Kr_ME_RE;

  // BODY TOTAL ── Eq. 20-270
  const Body_NPgain    = Frm_NPgain + Rsrv_NPgain;            // kg/d
  const Body_NPgain_g  = Body_NPgain * 1000;
  // Para vaca lactante (paridade 0 ou 1 — primípara ou multípara): Kg_MP_NP = 0,69
  const Kg_MP_NP_Trg   = BODY_PARAMS.Kg_MP_NP_Trg_cow;
  const Body_MPuse_g   = Body_NPgain_g / Kg_MP_NP_Trg;        // Eq. 20-270
  const Body_MPuse     = Body_MPuse_g / 1000;                  // kg/d
  const An_MEgain      = Frm_MEgain + Rsrv_MEgain;             // Eq. 20-247

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
    // Dt_ForWet NASEM: % de FORRAGEM ÚMIDA (silagens/fresca) na MS da dieta.
    // ≠ "%forragem na MN" usado anteriormente. Ver nutrient_intakes.py:128-131.
    const ForWet_pct = totalKgMS > 0 ? (kgMS_ForWet / totalKgMS) * 100 : 0;
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
  let Du_idMiCP = 0;
  let Du_idMiTP = 0;
  if (Rum_DigNDFIn > 0 || Rum_DigStIn > 0) {
    const denom = 1
      + (Rum_DigNDFIn > 0 ? MiN_KmrdNDF / Rum_DigNDFIn : 0)
      + (Rum_DigStIn  > 0 ? MiN_KmrdSt  / Rum_DigStIn  : 0);
    const Du_MiN_g = MiN_Vm / denom;                  // g N/d
    Du_MiCP        = Du_MiN_g * 6.25 / 1000;          // kg/d (Eq. 20-76)
    Du_idMiCP      = Du_MiCP * 0.80;                  // kg/d (Eq. 20-126)
    Du_idMiTP      = Du_idMiCP * 0.824;               // kg/d (Eq. 20-127)
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

  // ── NASEM 2021 — Cadeia de Energia (DE → ME → NEL) ───────────────────────
  // Implementa Eq. 20-111/112/113/114/115 (NDF total tract), Eq. 20-84 (Amido TT),
  // Eq. 3-7b (CP digestion), Eq. 20-99 (rOM), Eq. 20-153 (FA dig via Tabela 4-1),
  // Eq. 20-182 (DE), Eq. 20-308/311 (Ur_DE), Eq. 3-9/20-310 (GasE), Eq. 20-307/223 (ME/NEL).
  //
  // Método de cálculo de dcNDF (NASEM Use_DNDF_IV):
  //   'lignin'    → Eq. 20-112 (Van Soest, baseada em lignina) — DEFAULT NASEM oficial
  //   'iv_forage' → Eq. 20-111 (DFND 48h) só forragens; lignina nos concentrados
  //   'iv_all'    → Eq. 20-111 (DFND 48h) para todos
  // Default 'lignin' garante que nossos números batem com o NASEM Software oficial
  // out-of-the-box. O aluno pode trocar para 'iv_all' usando os valores da Tabela
  // 19-1 (mais informativo) ou customizar DFND 48h dos alimentos.
  const ndf_method: NonNullable<AnimalLactacao['ndf_method']> =
    animal.ndf_method ?? 'lignin';

  let An_DEIn = 0, An_MEIn = 0, An_NEIn = 0;
  let Dt_DigNDFIn = 0, Dt_DigStIn = 0, Dt_DigFAIn = 0, An_DigCPaIn = 0, Dt_DigrOMIn = 0;
  if (totalKgMS > 0) {
    // 1) Total Tract NDF (Eq. 20-111 ou 20-112 conforme ndf_method; ajustes 20-115)
    let Dt_DigNDFIn_Base_kg = 0;
    for (const slot of slots) {
      if (!slot.alimentoNome || slot.kgMN <= 0) continue;
      const a = alimentos.find(x => x.nome === slot.alimentoNome);
      if (!a || !a.fdn || a.fdn <= 0) continue;
      const kgMS_slot = slot.kgMN * a.ms;
      const Fd_dcNDF_base = calcularFdDcNDFBase(a, ndf_method);
      Dt_DigNDFIn_Base_kg += Fd_dcNDF_base * a.fdn * kgMS_slot;
    }
    const Dt_dcNDF_Base = kgFDN > 0 ? Dt_DigNDFIn_Base_kg / kgFDN : 0;
    const dmi_bw_frac   = totalKgMS / animal.peso;
    const st_frac       = kgAMIDO / totalKgMS;
    const Dt_dcNDF = Math.max(0, Math.min(1,
      Dt_dcNDF_Base - 1.1 * (dmi_bw_frac - 0.035) - 0.59 * (st_frac - 0.26)
    ));
    Dt_DigNDFIn = Dt_dcNDF * kgFDN;

    // 2) Total Tract Starch — Fase 1.4: dcSt per-feed (Fd_dcSt do NASEM CSV)
    //    + ajuste DMI/BW (NASEM Cap. 4, calculate_TT_dcSt):
    //    TT_dcSt = TT_dcSt_Base − (DMI/BW − 0,035) × 100 (em pp)
    let Dt_DigStIn_Base = 0;
    for (const slot of slots) {
      if (!slot.alimentoNome || slot.kgMN <= 0) continue;
      const a = alimentos.find(x => x.nome === slot.alimentoNome);
      if (!a || !a.amido) continue;
      const kgMS_slot = slot.kgMN * a.ms;
      const dcSt = (a.dc_st ?? 92) / 100;     // fração; default 92% (sem dado)
      Dt_DigStIn_Base += dcSt * a.amido * kgMS_slot;
    }
    const TT_dcSt_Base = kgAMIDO > 0 ? Dt_DigStIn_Base / kgAMIDO : 0;
    const TT_dcSt = Math.max(0,
      TT_dcSt_Base - (totalKgMS / animal.peso - 0.035));   // ajuste DMI/BW
    Dt_DigStIn = TT_dcSt * kgAMIDO;

    // 3) FA digestion — Fase 1.2: usa Fd_FA (FA verdadeira); fallback 80%×EE.
    //    Fd_dcFA per-feed se disponível; senão heurística por classe (Tabela 4-1).
    for (const slot of slots) {
      if (!slot.alimentoNome || slot.kgMN <= 0) continue;
      const a = alimentos.find(x => x.nome === slot.alimentoNome);
      if (!a) continue;
      const kgMS_slot = slot.kgMN * a.ms;
      const fa_frac   = a.fa ?? ((a.ee ?? 0) * 0.80);
      const kgFA_slot = fa_frac * kgMS_slot;
      if (kgFA_slot <= 0) continue;
      let dcFA: number;
      if (a.dc_fa != null) {
        dcFA = a.dc_fa / 100;
      } else {
        dcFA = 0.73;
        const nm = a.nome.toLowerCase();
        if (a.classificacao === 'Gordura/Óleo' && nm.includes('óleo de')) dcFA = 0.70;
        else if (nm.includes('sabões de cálcio')) dcFA = 0.76;
      }
      Dt_DigFAIn += dcFA * kgFA_slot;
    }

    // 4) CP digestion (Eq. 3-7b) — aparente
    An_DigCPaIn = Math.max(0, An_RDPIn + An_idRUPIn - (Du_MiCP - Du_idMiCP) - Fe_CPend);

    // 5) rOM — Fase 1.1 + bug fix Fase residual.
    //    Eq. 20-99 NASEM (`nutrient_intakes.py:204-215` e `:180-181`):
    //      Fd_rOM = OM − Ash − NDF − St − (FA × Fd_fHydr_FA) − TP − NPN_DM
    //    onde Fd_fHydr_FA = 1/1,06 (≈0,9434) para feeds NORMAIS e 1,0 só para
    //    suplementos de ácido graxo puro (gorduras protegidas, sabões etc).
    //    Era 1,06 antes — bug que subtraía 13% mais FA do que devia.
    //    Dt_DigrOMt   = kgROM × 0.96 (Fd_dcrOM)
    //    Dt_DigrOMaIn = Dt_DigrOMtIn − Fe_rOMend  (Fe_rOMend = 3,43% × DMI)
    let kgFA_fHydr = 0;
    for (const slot of slots) {
      if (!slot.alimentoNome || slot.kgMN <= 0) continue;
      const a = alimentos.find(x => x.nome === slot.alimentoNome);
      if (!a) continue;
      const kgMS_slot = slot.kgMN * a.ms;
      const fa_frac   = a.fa ?? ((a.ee ?? 0) * 0.80);
      const isFASupp  = a.classificacao === 'Gordura/Óleo';
      const fHydr     = isFASupp ? 1.0 : (1 / 1.06);
      kgFA_fHydr += fa_frac * kgMS_slot * fHydr;
    }
    const kgTP      = Math.max(0, kgPB - kgNPN_CP);
    const kgNPN_DM  = kgNPN_CP / 2.81;
    const kgOM      = Math.max(0, totalKgMS - kgCinza);
    const kgROM     = Math.max(0, kgOM - kgFDN - kgAMIDO - kgFA_fHydr - kgTP - kgNPN_DM);
    const Fe_rOMend = 0.0343 * totalKgMS;     // Eq. NASEM fecal.py:24
    Dt_DigrOMIn     = Math.max(0, kgROM * 0.96 - Fe_rOMend);

    // 6) DE intake (Eq. 20-182) com heats of combustion da Tabela 20-9.
    //    NPN tem Eq. 20-308 separada (Dt_DETPIn = DE_CP − DE_NPN_CP × 5.65/0.89):
    //      DE = NDF + St + FA + (DigCPa − NPN_CP) × 5.65 + NPN_CP × 0.89 + rOM
    //         = ... + DigCPa × 5.65 − NPN_CP × (5.65 − 0.89)
    An_DEIn = Dt_DigNDFIn * 4.20
            + Dt_DigStIn  * 4.23
            + Dt_DigFAIn  * 9.40
            + An_DigCPaIn * 5.65
            - kgNPN_CP    * (5.65 - 0.89)   // NPN downgrade: ~−4.76 Mcal/kg
            + Dt_DigrOMIn * 4.00;

    // 7) Urinary energy — Fase 1.3: fórmula NASEM completa (urine.py:11-22).
    //    Ur_Nout_g = (Dt_CP − Fe_CP_total − Scrf_CP − Fe_CPend − Mlk_CP − Body − Gest)/6.25
    const Fe_CP_total   = Math.max(0, kgPB - An_DigCPaIn);
    const Scrf_CP_g     = 0.20 * Math.pow(animal.peso, 0.60); // CP equiv, Body_NP_CP=0.86
    const Body_CPgain_g = 0;  // ECC estável (Fase 5 implementará Body_MPuse)
    const Gest_CPuse_g  = Gest_NPgain_g_pre / 0.86;  // NP → CP via Body_NP_CP
    const Milk_CP_g     = animal.leite * animal.proteina * 10;  // g/d
    const Ur_N_g        = Math.max(0,
      (kgPB * 1000 - Fe_CP_total * 1000 - Scrf_CP_g - Fe_CPend * 1000
       - Milk_CP_g - Body_CPgain_g - Gest_CPuse_g) / 6.25);
    const Ur_DEIn       = 0.0143 * Ur_N_g;

    // 8) Gas energy — vaca lactando (Eq. 20-310, `animal.py:169-180` nasem_dairy)
    //   An_GasEOut_Lact = 0.294 × DMI − 0.347 × (Dt_FAIn / DMI × 100) + 0.0409 × An_DigNDF
    //   onde Dt_FAIn é FA VERDADEIRO (Fd_FA), NÃO crude fat (Fd_CFat).
    //   An_DigNDF é dNDF / DMI × 100 (% MS).
    const FA_pctMS    = (kgFA / totalKgMS) * 100;
    const dNDF_pctMS  = (Dt_DigNDFIn / totalKgMS) * 100;
    const An_GasEOut  = 0.294 * totalKgMS - 0.347 * FA_pctMS + 0.0409 * dNDF_pctMS;
    // Nota: redução de 5% se monensina presente (Eq. 20-310 nota) — não aplicada v1

    // 9) ME (Eq. 20-307) e NEL (Eq. 20-223)
    An_MEIn = Math.max(0, An_DEIn - Ur_DEIn - An_GasEOut);
    An_NEIn = An_MEIn * 0.66;  // Kl_ME_NE = 0,66 (Eq. 20-223)
  }

  // Densidade NEL exibida (Mcal/kg MS) — vem da cadeia NASEM, com fallback legacy
  const nel_mcal_kg = An_NEIn > 0 ? An_NEIn / ms : kgNEL / ms;

  // ── Leite potencial pela energia (NASEM 2021 milk.py:329-365) ──────────────
  // Mlk_Prod_NEalow = An_MEavail_Milk × Kl_ME_NE / Trg_NEmilk_Milk
  // onde An_MEavail_Milk = An_MEIn − An_MEmUse − An_MEgain − Gest_MEuse
  // e An_MEmUse = NEmantenca / Km_ME_NE (Km_ME_NE = 0,66 para vaca)
  //
  // Trg_NEmilk_Milk (Eq. 3-14b): 9,29×Fat% + 5,85×TP% + 3,95×Lact% / 100.
  // Nosso `animal.proteina` é CP%; converte para TP via × 0,94.
  const nelMantenca       = 0.10 * Math.pow(animal.peso, 0.75);                // Eq. 3-13
  const Km_ME_NE          = 0.66;
  const Kl_ME_NE          = 0.66;
  const An_MEmUse         = nelMantenca / Km_ME_NE;
  const An_MEavail_Milk   = Math.max(0, An_MEIn - An_MEmUse - An_MEgain - Gest_MEuse);
  const Trg_MilkTPp       = animal.proteina * 0.94;
  const nel_por_kg_leite  = 9.29 * animal.gordura / 100
                          + 5.85 * Trg_MilkTPp    / 100
                          + 3.95 * animal.lactose / 100;
  const leite_potencial_nel = nel_por_kg_leite > 0
    ? Math.max(0, An_MEavail_Milk * Kl_ME_NE / nel_por_kg_leite)
    : 0;

  // ── Gestação proteica — Gest_MPuse (NASEM 2021 Eq. 20-225 a 20-239) ──────
  // KyMP_NP = 0,33 (Eq. 20-238/239 — gestação positiva).
  const Gest_MPuse = (Gest_NPgain_g_pre / 0.33) / 1000;   // g → kg

  // ── Leite potencial pela proteína (NASEM 2021 Eq. 20-339 derivada) ───────
  // Eq. 20-337 NASEM completa:
  //   An_MPavailMilk = An_MPIn − mp_mantenca − Body_MPuse − Gest_MPuse
  // Body_MPuse calculado no bloco "Composição corporal" acima (Fase 5).
  const An_MPavailMilk = Math.max(0, An_MPIn - mp_mantenca - Body_MPuse - Gest_MPuse);
  const KlMP_NP_Trg    = 0.69;
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
    dt_de: An_DEIn > 0 ? An_DEIn / ms : undefined,
    dt_me: An_MEIn > 0 ? An_MEIn / ms : undefined,
    ee: kgEE / ms,
    ee_insat: kgEE_INSAT / ms,
    cnf: kgCNF / ms,
    amido: kgAMIDO / ms,
    // Amido degradável no rúmen: NASEM 2021 Eq. 20-53 (Rum_dcSt × kgAMIDO).
    // O legado kgAMIDO_DEG via kd_amido/(kd+kP) per-feed só funcionava se kd_amido
    // estivesse preenchido (T19-1 NASEM não publica), então 0 na prática.
    amido_deg: Rum_DigStIn / ms,
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
    // FDN>8 / Amido degradável (indicador de fibra física vs amido ruminal).
    // Só calcula se aluno preencher mn8 (PSPS) em algum alimento custom.
    fdn8_amido_deg: Rum_DigStIn > 0 && kgFDN8 > 0 ? kgFDN8 / Rum_DigStIn : 0,
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
