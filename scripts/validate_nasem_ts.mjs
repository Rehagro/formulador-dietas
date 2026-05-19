// Validação cruzada — roda nosso motor TS e ADICIONALMENTE expõe intermediários
// da cadeia de energia (replica src/utils/calculos.ts §326-403 in-line para
// instrumentação. Em caso de divergência entre o snippet aqui e o motor real,
// é bug do snippet — corrigir.).
//
// Uso: node --experimental-strip-types scripts/validate_nasem_ts.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { calcularResultados, calcularCMSExigida, calcularTaxasPassagem }
  from '../src/utils/calculos.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const alimentos = JSON.parse(
  readFileSync(join(__dirname, 'nasem_xref_alimentos.json'), 'utf8')
);

const demoKgDM = {
  'Alfalfa meal':                8.210156,
  'Canola meal':                 6.732329,
  'Corn silage, typical':        5.473438,
  'Corn grain HM, coarse grind': 4.105078,
};

const slots = alimentos.map((a, i) => ({
  id: `slot-${i+1}`,
  alimentoNome: a.nome,
  kgMN: demoKgDM[a.nome] / a.ms,
}));

const TP_pct = 3.66;
const animal = {
  ecc: 3.0,
  paridade: 0,
  peso: 624.795,
  del: 100,
  leite: 25.062,
  gordura: 4.55,
  proteina: TP_pct / 0.94,
  lactose: 4.85,
  precoLeite: 0,
  raca: 'Holstein',
  dias_gestacao: 46,
  peso_bezerro_alvo: 44.1,
  gestacao_total: 280,
};

// ──────────────────────────────────────────────────────────────────────────────
// REPLICA do cálculo de energia em calculos.ts §326-403 — só para instrumentação
// ──────────────────────────────────────────────────────────────────────────────
function debugEnergiaTS(slots, alimentos, animal) {
  let totalKgMS = 0, totalKgMN = 0;
  let kgFDN = 0, kgFDA = 0, kgAMIDO = 0, kgEE = 0, kgCinza = 0, kgPB = 0;
  let kgMN_forragem = 0, kgFDNF = 0;
  for (const s of slots) {
    const a = alimentos.find(x => x.nome === s.alimentoNome);
    if (!a) continue;
    const kgMS = s.kgMN * a.ms;
    totalKgMS += kgMS; totalKgMN += s.kgMN;
    kgFDN += (a.fdn ?? 0) * kgMS;
    kgFDA += (a.fda ?? 0) * kgMS;
    kgAMIDO += (a.amido ?? 0) * kgMS;
    kgEE += (a.ee ?? 0) * kgMS;
    kgCinza += (a.cinza ?? 0) * kgMS;
    kgPB += (a.pb ?? 0) * kgMS;
    if (a.tipo === 'F') { kgMN_forragem += s.kgMN; kgFDNF += (a.fdn ?? 0) * kgMS; }
  }

  // 1) Total Tract NDF (Eq. 20-111 com IVNDFD48 + ajustes 20-115)
  let Dt_DigNDFIn_Base_kg = 0;
  const perFeedNDF = [];
  for (const s of slots) {
    const a = alimentos.find(x => x.nome === s.alimentoNome);
    if (!a || !a.fdn || a.fdn <= 0) continue;
    const kgMS = s.kgMN * a.ms;
    const Fd_dcNDF_base = (a.ivndfd48 != null) ? (12 + 0.61 * a.ivndfd48) / 100 : 0.50;
    const ndfDig = Fd_dcNDF_base * a.fdn * kgMS;
    Dt_DigNDFIn_Base_kg += ndfDig;
    perFeedNDF.push({ feed: a.nome, Fd_dcNDF_base, kgFDN_feed: a.fdn * kgMS, kgFDN_dig: ndfDig });
  }
  const Dt_dcNDF_Base = kgFDN > 0 ? Dt_DigNDFIn_Base_kg / kgFDN : 0;
  const dmi_bw = totalKgMS / animal.peso;
  const st_frac = kgAMIDO / totalKgMS;
  const Dt_dcNDF = Math.max(0, Math.min(1,
    Dt_dcNDF_Base - 1.1 * (dmi_bw - 0.035) - 0.59 * (st_frac - 0.26)));
  const Dt_DigNDFIn = Dt_dcNDF * kgFDN;

  // 2) Amido (TT_dcSt = 0.92)
  const Dt_DigStIn = kgAMIDO * 0.92;

  // 3) FA (Tabela 4-1 heurística)
  let Dt_DigFAIn = 0;
  for (const s of slots) {
    const a = alimentos.find(x => x.nome === s.alimentoNome);
    if (!a) continue;
    const kgMS = s.kgMN * a.ms;
    const kgFA = (a.ee ?? 0) * kgMS;
    if (kgFA <= 0) continue;
    let dcFA = 0.73;
    const nm = (a.nome || '').toLowerCase();
    if (a.classificacao === 'Gordura/Óleo' && nm.includes('óleo de')) dcFA = 0.70;
    else if (nm.includes('sabões de cálcio')) dcFA = 0.76;
    Dt_DigFAIn += dcFA * kgFA;
  }

  // 4) CP digestível aparente (Eq. 3-7b) — precisamos do MP/microbial primeiro.
  //    Para validação aqui, usa diretamente o valor agregado do motor real.
  //    Comparação consistente: Fe_CPend = (12 + 0.12 * fdn_%MS) * DMI / 1000
  const fdn_pct = (kgFDN / totalKgMS) * 100;
  const Fe_CPend = (12.0 + 0.12 * fdn_pct) * totalKgMS / 1000;

  // 5) rOM (Eq. 20-99, dcrOM=96.1%)
  const kgOM  = Math.max(0, totalKgMS - kgCinza);
  const kgROM = Math.max(0, kgOM - kgFDN - kgAMIDO - kgEE - kgPB);
  const Dt_DigrOMIn = kgROM * 0.961;

  // 6) Urinária — Ur_DEIn = 0.0143 * Ur_N_g
  const Milk_CP_g = animal.leite * animal.proteina * 10;
  const Ur_N_g    = Math.max(0, (kgPB * 1000 - Milk_CP_g - Fe_CPend * 1000) / 6.25);
  const Ur_DEIn   = 0.0143 * Ur_N_g;

  // 7) GasE — Eq. 20-310 vaca lactante
  const FA_pctMS = (kgEE / totalKgMS) * 100;
  const dNDF_pctMS = (Dt_DigNDFIn / totalKgMS) * 100;
  const An_GasEOut = 0.294 * totalKgMS - 0.347 * FA_pctMS + 0.0409 * dNDF_pctMS;

  return {
    totalKgMS,
    kgFDN, kgAMIDO, kgEE, kgPB, kgCinza,
    Dt_dcNDF_Base, Dt_dcNDF,
    Dt_DigNDFIn_Base: Dt_DigNDFIn_Base_kg,
    Dt_DigNDFIn,
    Dt_DigStIn,
    Dt_DigFAIn,
    Fe_CPend,
    kgROM, Dt_DigrOMIn,
    Ur_DEIn,
    An_GasEOut,
    perFeedNDF,
  };
}

const r = calcularResultados(slots, alimentos, animal);
const cmsPredita = calcularCMSExigida(animal);
const dbg = debugEnergiaTS(slots, alimentos, animal);

const result = {
  inputs: { animal, slots, alimentos_count: alimentos.length },

  Dt_DMIn:                  r.totalKgMS,
  Total_kgMN:               r.totalKgMN,
  CMS_predita_Eq20_21:      cmsPredita,
  Dt_CP_pct:                r.pb * 100,
  Dt_NDF_pct:               r.fdn * 100,
  Dt_ADF_pct:               r.fda * 100,
  Dt_St_pct:                r.amido * 100,
  Dt_CFat_pct:              r.ee * 100,
  Dt_DE_Mcal_kg:            r.dt_de,
  Dt_ME_Mcal_kg:            r.dt_me,
  Dt_NEL_Mcal_kg:           r.nel,
  An_DEIn_calc:             (r.dt_de  ?? 0) * r.totalKgMS,
  An_MEIn_calc:             (r.dt_me  ?? 0) * r.totalKgMS,
  An_NEIn_calc:             r.nel * r.totalKgMS,
  Mlk_Prod_NEalow_TS:       r.leite_potencial_nel,
  Mlk_Prod_MPalow_TS:       r.leite_potencial_prot,
  Mlk_Prod_final_TS:        r.leite_potencial_final,
  fator_limitante:          r.fator_limitante,

  // DEBUG — intermediários expostos
  debug_energia: dbg,
};

const outPath = join(__dirname, 'validate_nasem_ts.json');
writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`Wrote ${outPath}`);
console.log('\n--- INTERMEDIÁRIOS DA CADEIA DE ENERGIA (motor TS) ---');
console.log(`  Dt_dcNDF_Base       = ${dbg.Dt_dcNDF_Base.toFixed(4)} (${(dbg.Dt_dcNDF_Base*100).toFixed(2)}%)`);
console.log(`  Dt_dcNDF (ajustado) = ${dbg.Dt_dcNDF.toFixed(4)}`);
console.log(`  Dt_DigNDFIn_Base    = ${dbg.Dt_DigNDFIn_Base.toFixed(4)} kg/d`);
console.log(`  Dt_DigNDFIn (final) = ${dbg.Dt_DigNDFIn.toFixed(4)} kg/d`);
console.log(`  Dt_DigStIn          = ${dbg.Dt_DigStIn.toFixed(4)} kg/d`);
console.log(`  Dt_DigFAIn          = ${dbg.Dt_DigFAIn.toFixed(4)} kg/d`);
console.log(`  Dt_DigrOMIn         = ${dbg.Dt_DigrOMIn.toFixed(4)} kg/d`);
console.log(`  Fe_CPend            = ${dbg.Fe_CPend.toFixed(4)} kg/d`);
console.log(`  Ur_DEIn             = ${dbg.Ur_DEIn.toFixed(4)} Mcal/d`);
console.log(`  An_GasEOut          = ${dbg.An_GasEOut.toFixed(4)} Mcal/d`);
console.log('\n--- Per-feed dcNDF base (Eq. 20-111 com IVNDFD48) ---');
for (const f of dbg.perFeedNDF) {
  console.log(`  ${f.feed.padEnd(30)} dcNDF_base=${(f.Fd_dcNDF_base*100).toFixed(2)}%  kgFDN_dig=${f.kgFDN_dig.toFixed(4)}`);
}
