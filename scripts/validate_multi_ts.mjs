// Roda nosso motor TS para cada cenário em validate_multi_inputs.json e
// grava outputs (com debug da cadeia de energia) em validate_multi_ts.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { calcularResultados, calcularCMSExigida }
  from '../src/utils/calculos.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scenarios = JSON.parse(
  readFileSync(join(__dirname, 'validate_multi_inputs.json'), 'utf8')
);

// Replica do bloco de energia em calculos.ts pós-Fase 1.
// IMPORTANTE: este é apenas para instrumentação dos intermediários. Em
// divergência com o motor produção, o motor é a fonte de verdade.
function debugEnergiaTS(slots, alimentos, animal) {
  let totalKgMS = 0, totalKgMN = 0, kgMN_forragem = 0;
  let kgFDN = 0, kgFDNF = 0, kgFDA = 0, kgAMIDO = 0, kgEE = 0;
  let kgFA = 0, kgNPN_CP = 0, kgCinza = 0, kgPB = 0;
  let An_RDPIn = 0, An_idRUPIn = 0;
  for (const s of slots) {
    const a = alimentos.find(x => x.nome === s.alimentoNome);
    if (!a) continue;
    const kgMS = s.kgMN * a.ms;
    totalKgMS += kgMS; totalKgMN += s.kgMN;
    kgFDN += (a.fdn ?? 0) * kgMS;
    kgFDA += (a.fda ?? 0) * kgMS;
    kgFDNF += a.tipo === 'F' ? (a.fdn ?? 0) * kgMS : 0;
    kgAMIDO += (a.amido ?? 0) * kgMS;
    kgEE += (a.ee ?? 0) * kgMS;
    kgFA += (a.fa ?? ((a.ee ?? 0) * 0.80)) * kgMS;
    kgNPN_CP += (a.pb ?? 0) * (a.npn_frac ?? 0) * kgMS;
    kgCinza += (a.cinza ?? 0) * kgMS;
    kgPB += (a.pb ?? 0) * kgMS;
    if (a.tipo === 'F') kgMN_forragem += s.kgMN;
  }
  // NDF dig (Eq. 20-111 + ajustes 20-115)
  let Dt_DigNDFIn_Base_kg = 0;
  for (const s of slots) {
    const a = alimentos.find(x => x.nome === s.alimentoNome);
    if (!a || !a.fdn) continue;
    const kgMS = s.kgMN * a.ms;
    const Fd_dcNDF_base = (a.ivndfd48 != null) ? (12 + 0.61 * a.ivndfd48) / 100 : 0.50;
    Dt_DigNDFIn_Base_kg += Fd_dcNDF_base * a.fdn * kgMS;
  }
  const Dt_dcNDF_Base = kgFDN > 0 ? Dt_DigNDFIn_Base_kg / kgFDN : 0;
  const dmi_bw  = totalKgMS / animal.peso;
  const st_frac = kgAMIDO / totalKgMS;
  const Dt_dcNDF = Math.max(0, Math.min(1,
    Dt_dcNDF_Base - 1.1 * (dmi_bw - 0.035) - 0.59 * (st_frac - 0.26)));
  const Dt_DigNDFIn = Dt_dcNDF * kgFDN;
  // Amido per-feed (Fase 1.4) + ajuste DMI/BW (Cap. 4 NASEM)
  let Dt_DigStIn_Base = 0;
  for (const s of slots) {
    const a = alimentos.find(x => x.nome === s.alimentoNome);
    if (!a || !a.amido) continue;
    const kgMS = s.kgMN * a.ms;
    Dt_DigStIn_Base += ((a.dc_st ?? 92) / 100) * a.amido * kgMS;
  }
  const TT_dcSt_Base = kgAMIDO > 0 ? Dt_DigStIn_Base / kgAMIDO : 0;
  const TT_dcSt = Math.max(0, TT_dcSt_Base - (totalKgMS / animal.peso - 0.035));
  const Dt_DigStIn = TT_dcSt * kgAMIDO;
  // FA verdadeira (Fase 1.2) com dc_fa per-feed
  let Dt_DigFAIn = 0;
  for (const s of slots) {
    const a = alimentos.find(x => x.nome === s.alimentoNome);
    if (!a) continue;
    const kgMS = s.kgMN * a.ms;
    const fa_frac = a.fa ?? ((a.ee ?? 0) * 0.80);
    const kgFA_slot = fa_frac * kgMS;
    if (kgFA_slot <= 0) continue;
    let dcFA;
    if (a.dc_fa != null) dcFA = a.dc_fa / 100;
    else {
      dcFA = 0.73;
      const nm = (a.nome || '').toLowerCase();
      if (a.classificacao === 'Gordura/Óleo' && nm.includes('óleo de')) dcFA = 0.70;
      else if (nm.includes('sabões de cálcio')) dcFA = 0.76;
    }
    Dt_DigFAIn += dcFA * kgFA_slot;
  }
  // Fe_CPend (Eq. 20-300/302)
  const fdn_pct = (kgFDN / totalKgMS) * 100;
  const Fe_CPend = (12.0 + 0.12 * fdn_pct) * totalKgMS / 1000;
  // rOM completo (Fase 1.1, Eq. 20-99) + aparente (subtrai Fe_rOMend)
  const fHydr_FA = 1.06;
  const kgTP     = Math.max(0, kgPB - kgNPN_CP);
  const kgNPN_DM = kgNPN_CP / 2.81;
  const kgOM     = Math.max(0, totalKgMS - kgCinza);
  const kgROM    = Math.max(0, kgOM - kgFDN - kgAMIDO - (kgFA * fHydr_FA) - kgTP - kgNPN_DM);
  const Fe_rOMend = 0.0343 * totalKgMS;
  const Dt_DigrOMIn = Math.max(0, kgROM * 0.96 - Fe_rOMend);
  // CP_a (mesma de calculos.ts, requer Du_MiCP estimate — usa diet-level MM aproximada)
  // Para o debug, derivamos An_DigCPaIn implícito a partir do output do motor real.
  // Gestação NP (necessária para Ur_N)
  const _dias = animal.dias_gestacao ?? 0;
  const _peso_bez = animal.peso_bezerro_alvo ?? (animal.raca === 'Jersey' ? 28 : 45);
  const _T = animal.gestacao_total ?? 280;
  let Gest_NPgain_g = 0;
  if (_dias > 0 && _dias <= _T) {
    const Ksyn=2.43e-2, Kdec=2.45e-5, fGUF=1.816;
    const GU0  = _peso_bez * fGUF;
    const GU   = GU0 * Math.exp(-(Ksyn - Kdec*_dias) * (_T - _dias));
    const GUg  = GU * (Ksyn + Kdec*_T - 2*Kdec*_dias);
    Gest_NPgain_g = GUg * 123 * 0.86;
  }
  // CP_a aparente (replica calculos.ts)
  // Para o debug, estima via fórmula equivalente assumindo Du_MiCP via MM.
  // Mais simples: pega do output do motor real (passado pelo caller).
  // Aqui calcula uma aproximação se RDPIn/RUPIn forem zero.
  // Ur_N completo NASEM
  const Fe_CP_total = 0;  // placeholder; preencher externamente se possível
  const Scrf_CP_g    = 0.20 * Math.pow(animal.peso, 0.60);
  const Body_CPgain_g = 0;
  const Gest_CPuse_g  = Gest_NPgain_g / 0.86;
  const Milk_CP_g     = animal.leite * animal.proteina * 10;
  // Nota: o Ur_N real depende de An_DigCPaIn. Para validação granular usamos
  // o An_DigCPaIn implícito derivado do DE total e dos outros componentes.
  // GasE
  const FA_pctMS   = (kgEE / totalKgMS) * 100;
  const dNDF_pctMS = (Dt_DigNDFIn / totalKgMS) * 100;
  const An_GasEOut = 0.294 * totalKgMS - 0.347 * FA_pctMS + 0.0409 * dNDF_pctMS;
  return {
    totalKgMS, kgFDN, kgAMIDO, kgEE, kgFA, kgNPN_CP, kgPB, kgCinza, kgROM,
    Dt_dcNDF_Base, Dt_dcNDF, Dt_DigNDFIn,
    Dt_DigStIn, Dt_DigFAIn, Dt_DigrOMIn,
    Fe_CPend, Scrf_CP_g, Gest_NPgain_g, Gest_CPuse_g, Milk_CP_g,
    An_GasEOut,
  };
}

const ts_outputs = {};
for (const [name, sc] of Object.entries(scenarios)) {
  const r = calcularResultados(sc.slots, sc.alimentos, sc.animal);
  const cms = calcularCMSExigida(sc.animal);
  const dbg = debugEnergiaTS(sc.slots, sc.alimentos, sc.animal);
  ts_outputs[name] = {
    description: sc.description,
    Dt_DMIn: r.totalKgMS,
    CMS_predita: cms,
    Dt_CP_pct: r.pb * 100,
    Dt_NDF_pct: r.fdn * 100,
    Dt_ADF_pct: r.fda * 100,
    Dt_St_pct: r.amido * 100,
    Dt_CFat_pct: r.ee * 100,
    Dt_DE_Mcal_kg: r.dt_de,
    Dt_ME_Mcal_kg: r.dt_me,
    Dt_NEL_Mcal_kg: r.nel,
    An_DEIn_calc: (r.dt_de ?? 0) * r.totalKgMS,
    An_MEIn_calc: (r.dt_me ?? 0) * r.totalKgMS,
    An_NEIn_calc: r.nel * r.totalKgMS,
    Mlk_Prod_NEalow: r.leite_potencial_nel,
    Mlk_Prod_MPalow: r.leite_potencial_prot,
    Mlk_Prod_final: r.leite_potencial_final,
    fator_limitante: r.fator_limitante,
    debug: dbg,
  };
}

writeFileSync(
  join(__dirname, 'validate_multi_ts.json'),
  JSON.stringify(ts_outputs, null, 2)
);
console.log('Wrote validate_multi_ts.json');
console.log('Scenarios:', Object.keys(ts_outputs));
