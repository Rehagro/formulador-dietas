// Reconstrói src/data/alimentos.json a partir de:
// 1. Banco atual (preserva nomes PT-BR, classificacao, tipo, M brasileiros)
// 2. nasem_t191.json com valores NASEM oficiais
//
// Para cada alimento com fonte_nasem: busca em nasem_t191.json e substitui os campos numéricos
// Aplica conversões de escala (% MS → fração 0-1 onde necessário)
// Preserva 14 M brasileiros (núcleos comerciais sem match no NASEM)

import fs from 'node:fs';

const atual = JSON.parse(fs.readFileSync('./src/data/alimentos.json', 'utf8'));
const nasem = JSON.parse(fs.readFileSync('C:/Users/rasaf/nasem_t191.json', 'utf8'));
const aa    = JSON.parse(fs.readFileSync('C:/Users/rasaf/nasem_t192_aa.json', 'utf8'));
// Enriquecimento Fase 1: dc_st, npn_cp, dc_fa, Fd_FA do CSV oficial NASEM
const extra = JSON.parse(fs.readFileSync('C:/Users/rasaf/nasem_t191_extra.json', 'utf8'));

// Normaliza nomes para match (case-insensitive, remove pontuação especial)
function normalizar(s) {
  return s.toLowerCase()
    .replace(/[–—�]/g, '-')        // en-dash, em-dash, replacement char → hífen
    .replace(/[\/]/g, ' ')              // / → espaço
    .replace(/[,]/g, ' ')               // vírgulas → espaço
    .replace(/\s+/g, ' ')
    .trim();
}

// Aliases manuais para alimentos onde nome no banco difere do NASEM
const ALIASES = {
  'canola meal high protein': 'canola meal solvent extracted',
  'distillers grains dry high fat': 'distillers grains and solubles dried high fat',
  'distillers grains dry high protein': 'and solubles dried high protein',
  'distillers grains dry low fat': 'distillers grains and solubles dried low fat',
  'distillers solubles wet': 'distillers solubles',
  'distillers solubles modified wet': 'distillers grains and solubles modified wet',
};

// Mapeamento nome normalizado → registro NASEM
const lookupNasem = new Map();
for (const r of Object.values(nasem)) {
  if (r.nome_nasem) lookupNasem.set(normalizar(r.nome_nasem), r);
}

// Mapeamento NASEM key → JSON key + tipo de conversão
// 'frac': ÷ 100 (% → fração 0-1)
// 'mcal': manter (Mcal/kg)
// 'pct':  manter (% de outro componente, ex.: prot_a)
// 'mgkg': manter (mg/kg DM)
const MAPEAMENTO = [
  ['dm',          'ms',              'frac'],
  ['ash',         'cinza',           'frac'],
  ['cp',          'pb',              'frac'],
  ['cpa',         'prot_a',          'pct'],
  ['cpb',         'prot_b',          'pct'],
  ['cpc',         'prot_c',          'pct'],
  ['kd_prot',     'kd_prot',         'pct'],
  ['drup',        'rup_digest',      'frac'],
  ['sp',          'soluble_protein', 'frac'],
  ['adip',        'adip',            'frac'],
  ['ndip',        'ndip',            'frac'],
  ['adf',         'fda',             'frac'],
  ['ndf',         'fdn',             'frac'],
  ['ivndfd48',    'ivndfd48',        'pct'],
  ['lignin',      'lignin',          'frac'],
  ['starch',      'amido',           'frac'],
  ['wsc',         'wsc',             'frac'],
  ['ee',          'ee',              'frac'],
  ['tfas',        'fa',              'frac'],  // Fd_FA — ácidos graxos verdadeiros
  ['de_base',     'de_base',         'mcal'],
  ['ca',          'ca',              'frac'],
  ['p',           'p',               'frac'],
  ['mg',          'mg',              'frac'],
  ['k',           'k',               'frac'],
  ['na',          'na',              'frac'],
  ['cl',          'cl',              'frac'],
  ['s',           's',               'frac'],
  ['cu',          'cu',              'mgkg'],
  ['fe',          'fe',              'mgkg'],
  ['mn',          'mn_min',          'mgkg'],
  ['zn',          'zn',              'mgkg'],
  ['mo',          'mo',              'mgkg'],
];

function converte(valor, tipo) {
  if (valor === null || valor === undefined || isNaN(valor)) return null;
  if (tipo === 'frac') return parseFloat((valor / 100).toFixed(6));
  return valor;  // pct/mcal/mgkg ficam como estão
}

// Métricas
let comMatch = 0;
let semMatch = 0;
const semMatchNomes = [];
const camposPreservados = new Set();

const novo = atual.map(a => {
  if (!a.fonte_nasem) {
    // Alimento sem fonte_nasem → preserva (são os 14 M brasileiros)
    return a;
  }

  const chaveOriginal = normalizar(a.fonte_nasem);
  const chave = ALIASES[chaveOriginal] || chaveOriginal;
  let nasemRec = lookupNasem.get(chave);
  // Fuzzy fallback: match parcial (uma chave contém a outra)
  if (!nasemRec) {
    for (const [k, v] of lookupNasem.entries()) {
      if (k.includes(chave) || chave.includes(k)) { nasemRec = v; break; }
    }
  }
  if (!nasemRec) {
    semMatch++;
    semMatchNomes.push(a.nome + ' [fonte_nasem: ' + a.fonte_nasem + ']');
    return a;
  }
  comMatch++;

  // Cria registro novo: preserva campos PT-BR, substitui numéricos pelo NASEM
  const reescrito = {
    ...a,  // mantém: nome, custo, classificacao, tipo, fonte_nasem, alimento_base
  };

  // Limpa campos numéricos antigos (será substituído pelos NASEM)
  const campos_a_substituir = MAPEAMENTO.map(m => m[1]);
  for (const k of campos_a_substituir) {
    reescrito[k] = null;
  }

  // Substitui pelos valores NASEM convertidos (PDF)
  for (const [nasemKey, jsonKey, tipo] of MAPEAMENTO) {
    if (nasemRec[nasemKey] !== undefined && nasemRec[nasemKey] !== null) {
      reescrito[jsonKey] = converte(nasemRec[nasemKey], tipo);
    }
  }

  // ── Met/Lys da Tabela 19-2 NASEM (match por nome normalizado) ────────────
  // T19-2 dá Met/Lys em % CP. Converte para % MS via PB.
  const chaveAA = chave;
  let aaRec = aa[chaveAA];
  if (!aaRec) {
    for (const [k, v] of Object.entries(aa)) {
      if (k.includes(chaveAA) || chaveAA.includes(k)) { aaRec = v; break; }
    }
  }
  if (aaRec && reescrito.pb !== null) {
    if (aaRec.met !== undefined) reescrito.met = parseFloat((reescrito.pb * aaRec.met / 100).toFixed(6));
    if (aaRec.lys !== undefined) reescrito.lys = parseFloat((reescrito.pb * aaRec.lys / 100).toFixed(6));
  }

  // ── Enriquecimento CSV NASEM — SOBRESCREVE valores do PDF ──────────────────
  // O CSV oficial do nasem_dairy é fonte computável (mais confiável que parser
  // do PDF). Quando ambos têm valor, CSV vence. Resolve bugs como Silagem de
  // Milho Maduro amido=5% (CSV: 35.5%) e similares.
  const extraRec = nasemRec.nrc_id ? extra[nasemRec.nrc_id] : null;
  if (extraRec) {
    // Composição básica (% MS → fração 0-1)
    if (extraRec.dm     !== undefined) reescrito.ms     = parseFloat((extraRec.dm / 100).toFixed(6));
    if (extraRec.cp     !== undefined) reescrito.pb     = parseFloat((extraRec.cp / 100).toFixed(6));
    if (extraRec.ndf    !== undefined) reescrito.fdn    = parseFloat((extraRec.ndf / 100).toFixed(6));
    if (extraRec.adf    !== undefined) reescrito.fda    = parseFloat((extraRec.adf / 100).toFixed(6));
    if (extraRec.starch !== undefined) reescrito.amido  = parseFloat((extraRec.starch / 100).toFixed(6));
    if (extraRec.ee     !== undefined) reescrito.ee     = parseFloat((extraRec.ee / 100).toFixed(6));
    if (extraRec.ash    !== undefined) reescrito.cinza  = parseFloat((extraRec.ash / 100).toFixed(6));
    if (extraRec.lignin !== undefined) reescrito.lignin = parseFloat((extraRec.lignin / 100).toFixed(6));
    if (extraRec.wsc    !== undefined) reescrito.wsc    = parseFloat((extraRec.wsc / 100).toFixed(6));
    // Frações proteicas (% CP — mantém escala)
    if (extraRec.cpa     !== undefined) reescrito.prot_a    = extraRec.cpa;
    if (extraRec.cpb     !== undefined) reescrito.prot_b    = extraRec.cpb;
    if (extraRec.cpc     !== undefined) reescrito.prot_c    = extraRec.cpc;
    if (extraRec.kd_prot !== undefined) reescrito.kd_prot   = extraRec.kd_prot;
    if (extraRec.drup    !== undefined) reescrito.rup_digest= parseFloat((extraRec.drup / 100).toFixed(4));
    if (extraRec.sp      !== undefined) reescrito.soluble_protein = parseFloat((extraRec.sp / 100).toFixed(4));
    if (extraRec.ndip    !== undefined) reescrito.ndip      = parseFloat((extraRec.ndip / 100).toFixed(6));
    if (extraRec.adip    !== undefined) reescrito.adip      = parseFloat((extraRec.adip / 100).toFixed(6));
    if (extraRec.ivndfd48!== undefined) reescrito.ivndfd48  = extraRec.ivndfd48;
    if (extraRec.de_base !== undefined) reescrito.de_base   = extraRec.de_base;
    // Minerais (% MS → fração)
    for (const [k, jk] of [['ca','ca'],['p','p'],['mg','mg'],['k','k'],['na','na'],['cl','cl'],['s','s']]) {
      if (extraRec[k] !== undefined) reescrito[jk] = parseFloat((extraRec[k] / 100).toFixed(6));
    }
    // Microminerais (mg/kg DM — mantém escala)
    for (const k of ['cu','fe','zn','mo']) {
      if (extraRec[k] !== undefined) reescrito[k] = extraRec[k];
    }
    if (extraRec.mn !== undefined) reescrito.mn_min = extraRec.mn;
    // Campos Fase 1
    if (extraRec.dc_st  !== undefined) reescrito.dc_st    = extraRec.dc_st;
    if (extraRec.dc_fa  !== undefined) reescrito.dc_fa    = extraRec.dc_fa;
    if (extraRec.npn_cp !== undefined) reescrito.npn_frac = parseFloat((extraRec.npn_cp / 100).toFixed(4));
    if (extraRec.fa !== undefined && extraRec.fa !== null) {
      reescrito.fa = parseFloat((extraRec.fa / 100).toFixed(6));
    }
    // EE insaturado (Σ frações C16:1 + C18:1 cis/trans + C18:2 + C18:3)
    if (extraRec.ee_insat !== undefined && extraRec.ee_insat !== null) {
      reescrito.ee_insat = parseFloat((extraRec.ee_insat / 100).toFixed(6));
    }
  }

  // ── Campos DERIVADOS (DEPOIS da sobrescrita CSV) ─────────────────────────
  // PDR e PNDR a partir de RUP da Tabela 19-1 (RUP % CP = % PB que escapa do rúmen)
  if (nasemRec.rup !== null && nasemRec.rup !== undefined && reescrito.pb !== null) {
    reescrito.pndr = parseFloat((reescrito.pb * nasemRec.rup / 100).toFixed(6));
    reescrito.pdr  = parseFloat((reescrito.pb - reescrito.pndr).toFixed(6));
  }

  // CNF (Carboidratos Não-Fibrosos): 1 - PB - FDN - EE - Cinza
  if (reescrito.pb !== null && reescrito.fdn !== null
      && reescrito.ee !== null && reescrito.cinza !== null) {
    const cnf = 1 - reescrito.pb - reescrito.fdn - reescrito.ee - reescrito.cinza;
    if (cnf >= 0 && cnf <= 1) reescrito.cnf = parseFloat(cnf.toFixed(6));
  }

  // NDT derivado de DE_base: NDT% ≈ DE_base / 4,409 (4,409 Mcal/kg = 100% NDT)
  if (reescrito.de_base !== null && reescrito.de_base !== undefined) {
    const ndt = reescrito.de_base / 4.409;
    if (ndt >= 0 && ndt <= 1.2) reescrito.ndt = parseFloat(ndt.toFixed(6));
  }

  return reescrito;
});

console.log('Total alimentos:', atual.length);
console.log('  Com match NASEM:', comMatch);
console.log('  Sem match (M brasileiros + falhas):', semMatch);
if (semMatchNomes.length > 0) {
  console.log('\nSem match:');
  semMatchNomes.forEach(n => console.log('  -', n));
}

// Validação de escala (NPN tipo Ureia, Cloreto de Amônio têm "CP equivalent" > 100%)
const NPN_NOMES = ['Ureia', 'Cloreto de Amônio'];
function isNPN(nome) { return NPN_NOMES.some(n => nome.includes(n)); }

const erros = [];
for (const a of novo) {
  if (a.ms != null && (a.ms < 0 || a.ms > 1.05)) erros.push(a.nome + ' ms=' + a.ms);
  if (a.pb != null && (a.pb < 0 || a.pb > 1.05) && !isNPN(a.nome)) erros.push(a.nome + ' pb=' + a.pb);
  if (a.fdn != null && (a.fdn < 0 || a.fdn > 1.05)) erros.push(a.nome + ' fdn=' + a.fdn);
  if (a.amido != null && (a.amido < 0 || a.amido > 1.05)) erros.push(a.nome + ' amido=' + a.amido);
  if (a.ivndfd48 != null && (a.ivndfd48 < 0 || a.ivndfd48 > 100)) erros.push(a.nome + ' ivndfd48=' + a.ivndfd48);
}
if (erros.length > 0) {
  console.error('\nVALORES FORA DE ESCALA:');
  erros.forEach(e => console.error('  ✗', e));
  process.exit(1);
}
console.log('\n✓ Validação de escala: tudo dentro dos limites');

// Sort alfabético
novo.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

fs.writeFileSync('./src/data/alimentos.json', JSON.stringify(novo, null, 2), 'utf8');
console.log('\n→ Reescrito ./src/data/alimentos.json com', novo.length, 'alimentos');

// Validação: Grão de Trigo Moído
const trigo = novo.find(a => a.nome === 'Grão de Trigo, Moído');
if (trigo) {
  console.log('\n=== Grão de Trigo, Moído após rebuild ===');
  ['ms','pb','fdn','fda','ee','cinza','amido','ivndfd48','de_base','prot_a','prot_b','prot_c','kd_prot','rup_digest','soluble_protein','lignin','ca','p','cu','fe','mn_min','zn','mo']
    .forEach(k => console.log('  ' + k.padEnd(18), '=', trigo[k]));
}
