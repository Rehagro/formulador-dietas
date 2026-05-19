// Parser da Tabela 19-1 do NASEM 2021
import fs from 'node:fs';

const TXT = fs.readFileSync('C:/Users/rasaf/nasem_raw.txt', 'utf8');
const linhas = TXT.split('\n');

const START = 41013;  // 0-based índice (linha 41014 = índice 41013)
const END   = 42990;

// === Etapa 1: Detectar blocos (4 alimentos cada) ===
// Pares de blocos com mesmos 4 IDs (separados por "Continued") são mesclados.
const blocosPorIds = new Map();

let i = START;
while (i < END) {
  const linha = linhas[i] || '';
  if (/^Name(\s|$)/.test(linha) || linha.trim() === 'Name') {
    // Coletar nomes até "Feed ID Code"
    let j = i;
    let nomesRaw = '';
    while (j < END && !/^Feed ID Code/.test(linhas[j])) {
      nomesRaw += linhas[j].replace(/^Name\s*/, '') + ' ';
      j++;
    }
    const idsLinha = linhas[j].replace(/^Feed ID Code\s*/, '');
    const idsMatch = idsLinha.match(/NRC16F\d+/g);
    if (!idsMatch || idsMatch.length !== 4) { i = j + 1; continue; }
    const idsKey = idsMatch.join('|');

    // Avança para linha após "Mean SD N"
    j++;
    while (j < END && !/^Mean SD N/.test(linhas[j].trim())) j++;
    j++;

    // Coleta dados até próximo Name/Continued/TABLE 19-2
    const dadosLinhas = [];
    while (j < END) {
      const L = linhas[j];
      if (/^Name(\s|$)/.test(L) || /^TABLE 19-1/.test(L) || /^TABLE 19-2/.test(L)
          || /^NUTrieNT|^continued/.test(L)) break;
      if (L.trim() !== '' && !/^\d+$/.test(L.trim())) dadosLinhas.push(L);
      j++;
    }

    if (!blocosPorIds.has(idsKey)) {
      blocosPorIds.set(idsKey, { nomesRaw, ids: idsMatch, dadosLinhas: [] });
    }
    blocosPorIds.get(idsKey).dadosLinhas.push(...dadosLinhas);
    i = j;
  } else {
    i++;
  }
}

console.log('Blocos únicos (4 alimentos cada):', blocosPorIds.size);

// === Etapa 2: Parsing dos campos por bloco ===

// Cada linha tem padrão: "Nome, unidade <Mean1> <SD1> <N1> <Mean2> <SD2> <N2> ..."
// Ou apenas Means: "Nome, unidade <Mean1> <Mean2> <Mean3> <Mean4>"
//
// Estratégia: extrair todos os números, descobrir quantos por alimento:
// - Se 12 números → 4 trios completos (Mean,SD,N) — pega 1, 4, 7, 10
// - Se 4 números   → só Means — pega 0, 1, 2, 3
// - Outros casos → posicionamento heurístico
//
// Campos que sempre são só Mean (sem SD/N):
//   A fraction, B fraction, C fraction, Kd, RUP, dRUP, DE base, TFAs
//   Para esses, esperar 4 valores únicos.

const NUTRIENTES = [
  // [keyJson, regexMatch, formato]  ('trio' = Mean SD N; 'mean' = só Mean)
  ['dm',         /^DM,\s*%\s*as\s*fed/,         'trio'],
  ['ash',        /^Ash,\s*%\s*DM/,              'trio'],
  ['cp',         /^CP,\s*%\s*DM/,               'trio'],
  ['cpa',        /^A\s*fraction,/,              'mean'],
  ['cpb',        /^B\s*fraction,/,              'mean'],
  ['cpc',        /^C\s*fraction,/,              'mean'],
  ['kd_prot',    /^Kd\s*of\s*B/,                'mean'],
  ['rup',        /^[rR]?UP,\s*%/,               'mean'],
  ['drup',       /^d[rR]UP,/,                   'mean'],
  ['sp',         /^Soluble\s*protein,/,         'trio'],
  ['adip',       /^ADIP,/,                      'trio'],
  ['ndip',       /^NDIP,/,                      'trio'],
  ['adf',        /^ADF,/,                       'trio'],
  ['ndf',        /^NDF,\s*%\s*DM/,              'trio'],
  ['ivndfd48',   /^IVNDFD48,/,                  'trio'],
  ['lignin',     /^Lignin,/,                    'trio'],
  ['starch',     /^Starch,/,                    'trio'],
  ['wsc',        /^WSC,/,                       'trio'],
  ['tfas',       /^TFAs,/,                      'mean'],  // ou trio?
  ['ee',         /^Crude\s*fat,/,               'trio'],
  ['de_base',    /^De\s*base,/,                 'mean'],
  ['ca',         /^Ca,\s*%/,                    'trio'],
  ['p',          /^P,\s*%/,                     'trio'],
  ['mg',         /^Mg,\s*%/,                    'trio'],
  ['k',          /^K,\s*%/,                     'trio'],
  ['na',         /^Na,\s*%/,                    'trio'],
  ['cl',         /^Cl,\s*%/,                    'trio'],
  ['s',          /^S,\s*%/,                     'trio'],
  ['cu',         /^Cu,\s*mg/,                   'trio'],
  ['fe',         /^Fe,\s*mg/,                   'trio'],
  ['mn',         /^Mn,\s*mg/,                   'trio'],
  ['zn',         /^Zn,\s*mg/,                   'trio'],
  ['mo',         /^Mo,\s*mg/,                   'trio'],
];

function extrairNumeros(s) {
  // Captura números, descartando vírgulas de milhar como em "2,417"
  return (s.replace(/,(\d)/g, '$1').match(/-?\d+\.?\d*/g) || []).map(Number);
}

function extrairMeans(linha, formato) {
  // Remove prefixo "Nome, unidade" — captura tudo após a última palavra não-numérica
  const nums = extrairNumeros(linha);

  if (formato === 'mean') {
    // 4 valores únicos esperados (pode faltar alguns)
    if (nums.length === 4) return nums;
    if (nums.length === 3) return [nums[0], nums[1], nums[2], null];
    if (nums.length === 2) return [nums[0], nums[1], null, null];
    if (nums.length === 1) return [nums[0], null, null, null];
    return [null, null, null, null];
  }

  // formato 'trio': pode ter 12, 11, 10, ... números
  // Se for 12, é simples: posições 0, 3, 6, 9
  if (nums.length === 12) return [nums[0], nums[3], nums[6], nums[9]];

  // Casos com menos números: a heurística é difícil sem mais contexto.
  // Tentativa: assumir que os Means são o primeiro número de cada grupo.
  // Vamos detectar agrupamentos por "saltos" no valor de N (último número de cada trio).
  // Se nums.length é 4×3 = 12, é o caso fácil. Se menor, alguns alimentos têm Mean sem SD/N.
  //
  // Heurística melhor: olhar tamanho da linha — se for menor que 12, é provável que
  // o 4° alimento (e talvez o 3°) tenham só Mean ou nada.
  //
  // Para 11 números: provavelmente 3 trios completos + 2 números do 4° (Mean SD, sem N)
  //   → Means em 0, 3, 6, 9
  // Para 10 números: 3 trios + 1 single (4° só tem Mean)
  //   → Means em 0, 3, 6, 9
  // Para 9 números: 3 trios + nada no 4°
  //   → Means em 0, 3, 6, null
  // Para 7: 2 trios + 1 single → Means em 0, 3, 6, null  (mas qual coluna?)
  // ...complicado. Vamos tentar a regra "Means estão em 0, 3, 6, 9 quando há ao menos 10 números"
  if (nums.length >= 10) return [nums[0] ?? null, nums[3] ?? null, nums[6] ?? null, nums[9] ?? null];
  if (nums.length >= 7)  return [nums[0] ?? null, nums[3] ?? null, nums[6] ?? null, null];
  if (nums.length >= 4)  return [nums[0] ?? null, nums[3] ?? null, null,           null];
  if (nums.length >= 1)  return [nums[0] ?? null, null,           null,           null];
  return [null, null, null, null];
}

// === Etapa 3: Montar saída ===

const alimentosNASEM = {};  // NRC16FXxx → { campos }

for (const { ids, dadosLinhas } of blocosPorIds.values()) {
  // Inicializa 4 alimentos
  const blocos4 = [{}, {}, {}, {}];
  for (let alimIdx = 0; alimIdx < 4; alimIdx++) {
    blocos4[alimIdx].nrc_id = ids[alimIdx];
  }

  for (const linhaDados of dadosLinhas) {
    for (const [key, regex, formato] of NUTRIENTES) {
      if (regex.test(linhaDados)) {
        const means = extrairMeans(linhaDados, formato);
        for (let ai = 0; ai < 4; ai++) {
          if (means[ai] !== null && means[ai] !== undefined) {
            blocos4[ai][key] = means[ai];
          }
        }
        break;
      }
    }
  }

  for (let ai = 0; ai < 4; ai++) {
    alimentosNASEM[ids[ai]] = blocos4[ai];
  }
}

console.log('Alimentos NASEM extraídos:', Object.keys(alimentosNASEM).length);

// Sanity check: Wheat Grain Ground = NRC16F170
const trigo = alimentosNASEM['NRC16F170'];
console.log('\n=== NRC16F170 (Wheat Grain, Ground) ===');
Object.entries(trigo).forEach(([k, v]) => console.log('  ' + k.padEnd(12) + ' = ' + v));

fs.writeFileSync('C:/Users/rasaf/nasem_t191_parsed.json',
  JSON.stringify(alimentosNASEM, null, 2), 'utf8');
console.log('\n→ Salvo em C:/Users/rasaf/nasem_t191_parsed.json');
