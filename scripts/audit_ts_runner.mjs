// Roda nosso motor TS no cenário A_lact_test e exporta TODOS os intermediários
// para auditoria contra NASEM oficial. Imprime JSON no stdout.

import { readFileSync } from 'node:fs';
import { calcularResultados } from '../src/utils/calculos.ts';

// CLI arg: --ndf lignin|iv_forage|iv_all  (espelha NASEM Use_DNDF_IV 0/1/2)
const ndfIdx = process.argv.indexOf('--ndf');
const ndfMethod = ndfIdx >= 0 ? process.argv[ndfIdx + 1] : 'lignin';

const inp = JSON.parse(readFileSync('./scripts/validate_multi_inputs.json', 'utf8'));
const data = inp['A_lact_test'];
const animalSync = { ...data.animal, ndf_method: ndfMethod };
const r = calcularResultados(data.slots, data.alimentos, animalSync);

// Mais alguns intermediários que o motor não devolve diretamente — recalcular
// como o motor faria (cópia paralela). Para fim de auditoria, isso é OK porque
// queremos cruzar TODOS os intermediários, mesmo os que não saem na API.
// Aqui só usamos o que está em `r` (ResultadoDieta) + alguns derivados óbvios.

const ms = r.totalKgMS;
const out = {
  // Parte 1 — intakes em kg/d (reconstruídos de % × DMI)
  totalKgMS: ms,
  kgPB:      r.pb * ms,
  kgFDN:     r.fdn * ms,
  kgFDA:     r.fda * ms,
  kgEE:      r.ee  * ms,
  kgAMIDO:   r.amido * ms,
  kgCinza:   r.cinza * ms,
  kgLignin:  r.lignin * ms,
  // kgFA verdadeiro vem do debug do motor (per-feed Fd_FA do CSV); fallback heurístico.
  kgFA:      r.debug?.kgFA ?? ((r.ee ?? 0) * 0.80) * ms,
  kgNPN_CP:  r.debug?.kgNPN_CP ?? 0,
  // Parte 1 — percentuais (% MS ou mg/kg)
  pb_pct:      r.pb * 100,
  fdn_pct:     r.fdn * 100,
  fda_pct:     r.fda * 100,
  ee_pct:      r.ee  * 100,
  amido_pct:   r.amido * 100,
  cinza_pct:   r.cinza * 100,
  lignin_pct:  r.lignin * 100,
  fa_pct:      ((r.debug?.kgFA ?? ((r.ee ?? 0) * 0.80) * ms) / ms) * 100,
  cnf_pct:     r.cnf * 100,
  fdnf_pct:    r.fdnf * 100,
  ca_pct:      r.ca * 100,
  p_pct:       r.p  * 100,
  mg_pct:      r.mg * 100,
  k_pct:       r.k  * 100,
  na_pct:      r.na * 100,
  cl_pct:      r.cl * 100,
  s_pct:       r.s  * 100,
  cu_ppm:      r.cu,
  fe_ppm:      r.fe,
  mn_ppm:      r.mn_min,
  zn_ppm:      r.zn,
  co_ppm:      r.co,
  // Parte 2 — energia
  Dt_DigNDFIn:  r.debug?.Dt_DigNDFIn  ?? null,
  Dt_DigStIn:   r.debug?.Dt_DigStIn   ?? null,
  Dt_DigFAIn:   r.debug?.Dt_DigFAIn   ?? null,
  An_DigCPaIn:  r.debug?.An_DigCPaIn  ?? null,
  Dt_DigrOMIn:  r.debug?.Dt_DigrOMIn  ?? null,
  An_DEIn:      r.debug?.An_DEIn      ?? null,
  An_MEIn:      r.debug?.An_MEIn      ?? null,
  An_NEIn:      r.debug?.An_NEIn      ?? null,
  Ur_DEIn:      r.debug?.Ur_DEIn      ?? null,
  An_GasEOut:   r.debug?.An_GasEOut   ?? null,
  dt_de:        r.dt_de               ?? null,
  dt_me:        r.dt_me               ?? null,
  nel_mcal_kg:  r.nel,
  ndt_pct:      r.ndt * 100,
  // Parte 3 — proteína microbiana e MP
  An_RDPIn:        r.debug?.An_RDPIn        ?? null,
  An_idRUPIn:      r.debug?.An_idRUPIn      ?? null,
  An_RUPIn_total:  r.debug?.An_RUPIn_total  ?? null,
  Du_MiCP_g:       r.debug?.Du_MiCP_g       ?? null,
  Du_MiCP:         r.debug?.Du_MiCP         ?? null,
  Du_idMiTP_g:     r.debug?.Du_idMiTP_g     ?? null,
  Du_idMiCP_g:     r.debug?.Du_idMiCP_g     ?? null,
  Du_MiN_g:        r.debug?.Du_MiN_g        ?? null,
  An_MPIn:         r.debug?.An_MPIn         ?? null,
  An_MPIn_g:       r.debug?.An_MPIn_g       ?? null,
  Fe_CPend:        r.debug?.Fe_CPend        ?? null,
  Fe_CPend_g:      r.debug?.Fe_CPend_g      ?? null,
  Scrf_CP_g:       r.debug?.Scrf_CP_g       ?? null,
  Ur_N_g:          r.debug?.Ur_N_g          ?? null,
  Dt_RUPIn:        r.debug?.Dt_RUPIn        ?? null,
  Dt_idRUPIn:      r.debug?.Dt_idRUPIn      ?? null,
  Dt_NDFnf:        r.debug?.Dt_NDFnf        ?? null,
  Dt_TDNIn:        r.debug?.Dt_TDNIn        ?? null,
  // Parte 4 — mantença, ganho, gestação
  nelMantenca:     r.debug?.nelMantenca     ?? null,
  An_MEmUse:       r.debug?.An_MEmUse       ?? null,
  An_MEgain:       r.debug?.An_MEgain       ?? null,
  Frm_NEgain:      r.debug?.Frm_NEgain      ?? null,
  Rsrv_NEgain:     r.debug?.Rsrv_NEgain     ?? null,
  Frm_NPgain_g:    r.debug?.Frm_NPgain_g    ?? null,
  Rsrv_NPgain_g:   r.debug?.Rsrv_NPgain_g   ?? null,
  GrUter_BWgain:   r.debug?.GrUter_BWgain   ?? null,
  Gest_NPgain_g:   r.debug?.Gest_NPgain_g   ?? null,
  Gest_MEuse:      r.debug?.Gest_MEuse      ?? null,
  Gest_MPuse_g:    r.debug?.Gest_MPuse_g    ?? null,
  Body_MPuse_g:    r.debug?.Body_MPuse_g    ?? null,
  mp_mantenca_g:   r.debug?.mp_mantenca_g   ?? null,
  TT_dcSt:         r.debug?.TT_dcSt         ?? null,
  // Parte 5 — Leite Potencial
  An_MEavail_Milk:     r.debug?.An_MEavail_Milk     ?? null,
  nel_por_kg_leite:    r.debug?.nel_por_kg_leite    ?? null,
  An_MPavailMilk:      r.debug?.An_MPavailMilk      ?? null,
  Trg_MilkTPp:         r.debug?.Trg_MilkTPp         ?? null,
  Trg_MilkFatp:        r.debug?.Trg_MilkFatp        ?? null,
  Trg_MilkLacp:        r.debug?.Trg_MilkLacp        ?? null,
  leite_potencial_nel: r.leite_potencial_nel        ?? null,
  leite_potencial_prot:r.leite_potencial_prot       ?? null,
};

process.stdout.write(JSON.stringify(out, null, 0));
