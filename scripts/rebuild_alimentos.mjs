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

  // Substitui pelos valores NASEM convertidos
  for (const [nasemKey, jsonKey, tipo] of MAPEAMENTO) {
    if (nasemRec[nasemKey] !== undefined && nasemRec[nasemKey] !== null) {
      reescrito[jsonKey] = converte(nasemRec[nasemKey], tipo);
    }
  }

  // ── Met/Lys da Tabela 19-2 NASEM (match por nome normalizado) ────────────
  // T19-2 dá Met/Lys em % CP. Converte para % MS via PB.
  const chaveAA = chave;  // mesma normalização
  let aaRec = aa[chaveAA];
  if (!aaRec) {
    // Match parcial
    for (const [k, v] of Object.entries(aa)) {
      if (k.includes(chaveAA) || chaveAA.includes(k)) { aaRec = v; break; }
    }
  }
  if (aaRec && reescrito.pb !== null) {
    if (aaRec.met !== undefined) reescrito.met = parseFloat((reescrito.pb * aaRec.met / 100).toFixed(6));
    if (aaRec.lys !== undefined) reescrito.lys = parseFloat((reescrito.pb * aaRec.lys / 100).toFixed(6));
  }

  // ── Campos DERIVADOS para uso pedagógico ─────────────────────────────────
  // PDR e PNDR a partir de RUP da Tabela 19-1 (RUP % CP = % PB que escapa do rúmen)
  // PNDR = PB × RUP/100  (em fração 0-1 de MS)
  // PDR  = PB × (100 - RUP)/100  =  PB - PNDR
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

  // NDT derivado de DE_base: NDT% ≈ DE_base / 0.04409 ÷ 100 (4.409 Mcal/kg = 100% NDT)
  // Aproximação clássica: NDT% = DE × 22.69 (onde DE em Mcal/kg)  →  fração = DE / 4.409
  if (reescrito.de_base !== null && reescrito.de_base !== undefined) {
    const ndt = reescrito.de_base / 4.409;
    if (ndt >= 0 && ndt <= 1.2) reescrito.ndt = parseFloat(ndt.toFixed(6));
  }

  // Demais campos (efdn, kd_amido, met, lys, mn8, mn19, vit, etc.) ficam null
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
