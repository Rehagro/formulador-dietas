// DIAGNÓSTICO — "leite para proteína muda ao ida-e-volta no Formulador de Ração"
// -----------------------------------------------------------------------------
// Reproduz o caminho do usuário: os mesmos insumos, mesmas quantidades, mesmo
// animal, mas representados de dois jeitos que o Formulador de Ração converte
// um no outro:
//   (A) CRUS    — cada concentrado é um slot próprio na dieta.
//   (B) RAÇÃO   — os concentrados colapsados numa única linha (racaoOverride),
//                 exatamente como "Aplicar na dieta" faz (colapsarEmRacao).
// Mede leite_potencial_prot (leite-PM) nas duas e decompõe a diferença na
// cadeia RUP → MP, que é NÃO-LINEAR (Eq. 6-1 + digestibilidade intestinal).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calcularResultados, RUMEN_PARAMS } from '../src/utils/calculos.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const alimentos = JSON.parse(readFileSync(join(__dirname, '../src/data/alimentos.json'), 'utf8'));
const byName = (n) => alimentos.find(a => a.nome === n);
const pick = (frag) => alimentos.find(a => a.nome.toLowerCase().includes(frag.toLowerCase()));

const animal = {
  ecc: 3.0, paridade: 2, peso: 600, del: 120, leite: 38, gordura: 3.6,
  proteina: 3.2, lactose: 4.7, precoLeite: 2.2, raca: 'Holstein',
  dias_gestacao: 0, peso_bezerro_alvo: 45, gestacao_total: 280,
};

// Forragem base da dieta (fica solta em ambos os cenários — não entra na ração)
const forragem = pick('Silagem de Milho') || alimentos.find(a => a.tipo === 'F');

// ── Cenários de batidão (concentrados) — kg/d de MN que a vaca consome ────────
const CENARIOS = [
  {
    nome: 'Batidão simples (milho + soja)',
    ingredientes: [
      { nome: pick('Canjica de Milho').nome, kg_d: 6.0 },
      { nome: pick('Farelo de Soja, Extração').nome, kg_d: 3.0 },
    ],
  },
  {
    nome: 'Batidão realista (5 insumos, kd/rupd espalhados)',
    ingredientes: [
      { nome: pick('Canjica de Milho').nome, kg_d: 5.0 },
      { nome: pick('Farelo de Soja, Extração').nome, kg_d: 2.5 },
      { nome: pick('Farelo de Trigo').nome, kg_d: 1.5 },   // kd alto (24), rupd baixo (0.69)
      { nome: pick('Caroço de Algodão').nome, kg_d: 1.5 },
      { nome: pick('Polpa Cítrica').nome, kg_d: 1.0 },
    ],
  },
  {
    nome: 'Batidão com NPN (ureia) + soja',
    ingredientes: [
      { nome: pick('Canjica de Milho').nome, kg_d: 6.0 },
      { nome: pick('Farelo de Soja, Extração').nome, kg_d: 2.5 },
      { nome: pick('Ureia').nome, kg_d: 0.15 },
    ],
  },
  {
    nome: 'Batidão com FORRAGEM dentro (casca+feno) — testa flip tipo F→C',
    ingredientes: [
      { nome: pick('Canjica de Milho').nome, kg_d: 5.0 },
      { nome: pick('Farelo de Soja, Extração').nome, kg_d: 2.5 },
      { nome: pick('Feno de Sorgo').nome, kg_d: 2.0 },      // tipo F cru; vira C na ração
    ].filter(x => byName(x.nome)),
  },
];

const forragemKg = 42;

function slotsCrus(cen) {
  return [
    { id: 'forr', alimentoNome: forragem.nome, kgMN: forragemKg },
    ...cen.ingredientes.map((i, k) => ({ id: 'c' + k, alimentoNome: i.nome, kgMN: i.kg_d })),
  ];
}

function slotsRacao(cen) {
  // exatamente o que colapsarEmRacao monta: 1 slot com racaoOverride
  const consumo = cen.ingredientes.reduce((s, i) => s + i.kg_d, 0);
  return [
    { id: 'forr', alimentoNome: forragem.nome, kgMN: forragemKg },
    {
      id: 'racao', alimentoNome: 'Batidão', kgMN: consumo,
      custoOverride: null, msOverride: null,
      racaoOverride: {
        receita: cen.ingredientes.map(i => ({ alimento_nome: i.nome, kg_d: i.kg_d })),
        capacidade_misturador_kg: 1000,
      },
    },
  ];
}

// Replica Eq. 6-1 por ingrediente (para atribuir a divergência)
function rupPorIngrediente(a, kgMS, tipoOverride) {
  const p = RUMEN_PARAMS.lactacao;
  const tipo = tipoOverride ?? a.tipo;
  const kP_pct = (tipo === 'F' ? p.KpFor : p.KpConc); // %/h
  if (a.prot_a == null || a.prot_b == null || a.prot_c == null || a.kd_prot == null)
    return { rup: 0, idRup: 0, rdp: 0 };
  const kgCPIn = a.pb * kgMS;
  const kgCPA = kgCPIn * a.prot_a / 100;
  const kgCPB = kgCPIn * a.prot_b / 100;
  const kgCPC = kgCPIn * a.prot_c / 100;
  const kgNPN = kgCPIn * (a.npn_frac ?? 0);
  const rupA = Math.max(0, kgCPA - kgNPN) * p.fCPAdu;
  const rupB = kgCPB * (kP_pct / (a.kd_prot + kP_pct));
  const rupC = kgCPC;
  const intr = (p.IntRUP / p.refCPIn) * kgCPIn;
  const rup = Math.max(0, rupA + rupB + rupC + intr);
  const dc = a.rup_digest ?? 0.80;
  return { rup, idRup: rup * dc, rdp: Math.max(0, kgCPIn - rup) };
}

console.log('='.repeat(78));
console.log('DIAGNÓSTICO — leite-PM: insumos CRUS vs colapsados em RAÇÃO (mesmo alimento/kg)');
console.log('Animal: %d kg, %d L, DEL %d, PB leite %s%%   |   Forragem: %s (%d kg MN)',
  animal.peso, animal.leite, animal.del, animal.proteina, forragem.nome, forragemKg);
console.log('='.repeat(78));

for (const cen of CENARIOS) {
  const rCru = calcularResultados(slotsCrus(cen), alimentos, animal);
  const rRac = calcularResultados(slotsRacao(cen), alimentos, animal);
  const dC = rCru.debug, dR = rRac.debug;

  console.log('\n■ %s', cen.nome);
  console.log('  insumos:', cen.ingredientes.map(i => `${i.nome.split(',')[0]} ${i.kg_d}kg`).join(' + '));

  const row = (label, cru, rac, dec = 3, unit = '') => {
    const d = rac - cru;
    console.log('   %s  CRU=%s  RAÇÃO=%s  Δ=%s%s',
      label.padEnd(22), cru.toFixed(dec), rac.toFixed(dec),
      (d >= 0 ? '+' : '') + d.toFixed(dec), unit);
  };
  row('leite_potencial_NEL', rCru.leite_potencial_nel, rRac.leite_potencial_nel, 2, ' L');
  row('leite_potencial_PROT', rCru.leite_potencial_prot, rRac.leite_potencial_prot, 2, ' L  ⬅');
  row('leite FINAL (min)', rCru.leite_potencial_final, rRac.leite_potencial_final, 2, ' L');
  console.log('   fator limitante        CRU=%s   RAÇÃO=%s', rCru.fator_limitante, rRac.fator_limitante);
  console.log('   ── cadeia proteica (kg/d) ──');
  row('An_RUPIn (bruto)', dC.An_RUPIn_total, dR.An_RUPIn_total, 4);
  row('An_idRUPIn (dig.)', dC.An_idRUPIn, dR.An_idRUPIn, 4, '  ⬅ entra na MP');
  row('An_RDPIn', dC.An_RDPIn, dR.An_RDPIn, 4);
  row('An_MPIn', dC.An_MPIn, dR.An_MPIn, 4);
  row('An_MPavailMilk', dC.An_MPavailMilk, dR.An_MPavailMilk, 4);
  row('totalKgMS', rCru.totalKgMS, rRac.totalKgMS, 4);
  row('PB dieta %', rCru.pb * 100, rRac.pb * 100, 3);

  // Atribuição: soma dos idRUP por ingrediente (cru) vs idRUP do composto
  const totalMS_conc_cru = cen.ingredientes.reduce((s, i) => {
    const a = byName(i.nome); return s + i.kg_d * a.ms;
  }, 0);
  let idRupCruSum = 0;
  for (const i of cen.ingredientes) {
    const a = byName(i.nome);
    idRupCruSum += rupPorIngrediente(a, i.kg_d * a.ms).idRup;
  }
  console.log('   Σ idRUP por-ingrediente (cru) = %s kg/d  →  a versão RAÇÃO usa 1 kd/rupd médios',
    idRupCruSum.toFixed(4));
}

// ── Idempotência: colapsar → reabrir receita → recolapsar deve dar IDÊNTICO ───
console.log('\n' + '='.repeat(78));
console.log('TESTE DE IDEMPOTÊNCIA (composto → composto): deve ser bit-idêntico');
const cen = CENARIOS[1];
const r1 = calcularResultados(slotsRacao(cen), alimentos, animal);
// "reabrir e reaplicar" = mesma receita, novo objeto (JSON round-trip do sessionStorage)
const cen2 = JSON.parse(JSON.stringify(cen));
const r2 = calcularResultados(slotsRacao(cen2), alimentos, animal);
console.log('  leite-PM 1ª=%s  2ª=%s  Δ=%s (esperado 0 → sem drift na volta composto→composto)',
  r1.leite_potencial_prot.toFixed(6), r2.leite_potencial_prot.toFixed(6),
  (r2.leite_potencial_prot - r1.leite_potencial_prot).toExponential(2));
