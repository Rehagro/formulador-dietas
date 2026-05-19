// Parser robusto da Tabela 19-1 NASEM 2021 a partir de pdftotext -table
// Lê C:/Users/rasaf/nasem_t191_table.txt e produz nasem_t191.json com chave NRC ID.
//
// Estratégia:
// 1. Detectar blocos: linha começando com "Name " + nomes; depois "Feed ID Code" + 4 NRC IDs
// 2. Detectar linha "Mean SD N ... Mean SD N ..." — extrair posições dos 4 "Mean"
// 3. Para cada linha de nutriente, extrair Mean de cada coluna (1° número próximo da posição "Mean" daquela coluna)
//
// Casos especiais: linhas com Mean único (sem SD nem N): A/B/C fraction, Kd, RUP, dRUP, DE base, TFAs

import fs from 'node:fs';

const TXT = fs.readFileSync('C:/Users/rasaf/nasem_t191_table.txt', 'utf8');
const linhas = TXT.split('\n');

// Mapeamento: regex do nome → chave de saída
const NUTRIENTES = [
  { key: 'dm',         regex: /^DM,\s*%\s*as\s*fed/i },
  { key: 'ash',        regex: /^Ash,\s*%\s*DM/i },
  { key: 'cp',         regex: /^CP,\s*%\s*DM/i },
  { key: 'cpa',        regex: /^A\s*fraction,\s*%/i },
  { key: 'cpb',        regex: /^B\s*fraction,\s*%/i },
  { key: 'cpc',        regex: /^C\s*fraction,\s*%/i },
  { key: 'kd_prot',    regex: /^Kd\s*of\s*B/i },
  { key: 'rup',        regex: /^[Rr]?UP,\s*%/ },
  { key: 'drup',       regex: /^d[Rr]UP/ },
  { key: 'sp',         regex: /^Soluble\s*protein/i },
  { key: 'adip',       regex: /^ADIP/i },
  { key: 'ndip',       regex: /^NDIP/i },
  { key: 'adf',        regex: /^ADF,\s*%\s*DM/i },
  { key: 'ndf',        regex: /^NDF,\s*%\s*DM/i },
  { key: 'ivndfd48',   regex: /^IVNDFD48/i },
  { key: 'lignin',     regex: /^Lignin/i },
  { key: 'starch',     regex: /^Starch/i },
  { key: 'wsc',        regex: /^WSC/i },
  { key: 'tfas',       regex: /^TFAs/i },
  { key: 'ee',         regex: /^Crude\s*fat/i },
  { key: 'de_base',    regex: /^De\s*base/i },
  { key: 'ca',         regex: /^Ca,\s*%\s*DM/i },
  { key: 'p',          regex: /^P,\s*%\s*DM/i },
  { key: 'mg',         regex: /^Mg,\s*%\s*DM/i },
  { key: 'k',          regex: /^K,\s*%\s*DM/i },
  { key: 'na',         regex: /^Na,\s*%\s*DM/i },
  { key: 'cl',         regex: /^Cl,\s*%\s*DM/i },
  { key: 's',          regex: /^S,\s*%\s*DM/i },
  { key: 'cu',         regex: /^Cu,\s*mg/i },
  { key: 'fe',         regex: /^Fe,\s*mg/i },
  { key: 'mn',         regex: /^Mn,\s*mg/i },
  { key: 'zn',         regex: /^Zn,\s*mg/i },
  { key: 'mo',         regex: /^Mo,\s*mg/i },
];

// Encontra a chave de nutriente para uma linha; null se não reconhecido
function detectarNutriente(linha) {
  for (const { key, regex } of NUTRIENTES) {
    if (regex.test(linha)) return key;
  }
  return null;
}

// Captura números e suas posições (column index in string)
function numerosComPos(linha) {
  // Trata vírgula de milhar: "2,011.07" → "2011.07"; "1,111" → "1111"
  const re = /[-]?\d{1,3}(?:,\d{3})*\.?\d*|[-]?\.\d+|[-]?\d+\.?\d*/g;
  const result = [];
  let m;
  while ((m = re.exec(linha)) !== null) {
    const numStr = m[0].replace(/,/g, '');
    const num = Number(numStr);
    if (!isNaN(num)) {
      result.push({ pos: m.index, value: num, raw: m[0] });
    }
  }
  return result;
}

// Encontra as posições dos 4 "Mean" em uma linha de cabeçalho
function posicoesMean(linha) {
  const positions = [];
  const re = /Mean/g;
  let m;
  while ((m = re.exec(linha)) !== null) {
    positions.push(m.index);
  }
  return positions;
}

// Extrai Mean por coluna a partir de RANGES [startCol, endCol].
// Pega o primeiro número cuja pos esteja dentro de cada range.
function extrairMeansPorColuna(linha, rangesCol) {
  const nums = numerosComPos(linha);
  const means = [];
  for (let c = 0; c < 4; c++) {
    const [start, end] = rangesCol[c];
    const candidatos = nums.filter(n => n.pos >= start && n.pos < end);
    means.push(candidatos.length > 0 ? candidatos[0].value : null);
  }
  return means;
}

// Dadas as posições dos 4 NRC IDs no cabeçalho, calcula ranges de cada coluna
// (intervalo onde Mean/SD/N de cada coluna pode estar).
function rangesPorColuna(posIds) {
  // Para cada coluna, range = [pos_id - 10, pos_id_proximo]
  // O Mean fica antes do NRC ID por alguns caracteres (alinhamento à esquerda do número),
  // mas SD e N podem ficar até o ID seguinte.
  const ranges = [];
  for (let c = 0; c < 4; c++) {
    const start = c === 0 ? 0 : posIds[c] - 10;
    const end   = c + 1 < posIds.length ? posIds[c + 1] - 10 : Infinity;
    ranges.push([start, end]);
  }
  return ranges;
}

// === Loop principal: detectar blocos ===
const out = {};

let i = 0;
while (i < linhas.length) {
  const L = linhas[i];
  // Procura linha "Feed ID Code" + 4 NRC IDs
  if (/^\s+Feed ID Code\b/.test(L) || /^Feed ID Code\b/.test(L.trim())) {
    const ids = (L.match(/NRC16F\d+/g) || []);
    if (ids.length === 4) {
      // Posições dos 4 NRC IDs na linha
      const posIds = [];
      const reId = /NRC16F\d+/g;
      let mm;
      while ((mm = reId.exec(L)) !== null) posIds.push(mm.index);
      const ranges = rangesPorColuna(posIds);

      // Captura nomes dos 4 alimentos a partir da linha "Name" e linhas de continuação acima.
      // Estratégia: extrair "células" (texto separado por ≥3 espaços) com suas posições,
      // depois associar cada célula à coluna NRC mais próxima.
      function extrairCelulas(s) {
        const celulas = [];
        const re = /\S+(?: \S+)*/g;
        let m;
        while ((m = re.exec(s)) !== null) {
          const t = m[0].trim();
          if (t === 'Name') continue;
          // Filtra puramente numéricas (rastro de outras linhas)
          if (/^[\d., ]+$/.test(t)) continue;
          // Filtra cabeçalhos de unidades (Mo mg/kg DM, % DM, % CP, Mcal/kg, % of NDF, etc.)
          if (/^(Mo|Cu|Fe|Mn|Zn|Ca|P|Mg|K|Na|Cl|S|CP|DM|Ash|ADF|NDF|ADIP|NDIP|TFAs|Crude|De|WSC|Lignin|Starch|Soluble|IVNDFD48|[A-C] fraction|Kd|rUP|dRUP|Mean SD N),?\s*(?:mg|%|Mcal)/i.test(t)) continue;
          celulas.push({ pos: m.index, text: m[0] });
        }
        return celulas;
      }
      // Localiza linha "Name"
      let linhaName = -1;
      for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
        if (/^\s*Name\b/.test(linhas[j] || '')) { linhaName = j; break; }
      }
      const nomesPorCol = ['', '', '', ''];
      if (linhaName !== -1) {
        // Junta linhas: linhaName e até 2 acima (continuação)
        const linhasNome = [];
        // Acima primeiro (pode ter prefixo do nome)
        for (let k = linhaName - 1; k >= Math.max(0, linhaName - 3); k--) {
          const Lk = linhas[k] || '';
          if (!Lk.trim() || /Name|Feed ID|TABLE/.test(Lk)) continue;
          linhasNome.push(Lk);
        }
        linhasNome.reverse();
        linhasNome.push(linhas[linhaName]);
        // Para cada coluna, encontra célula mais próxima da posição do NRC ID
        for (const Ll of linhasNome) {
          const cells = extrairCelulas(Ll);
          for (const cell of cells) {
            let melhorCol = -1;
            let melhorDist = Infinity;
            for (let c = 0; c < 4; c++) {
              const dist = Math.abs(cell.pos - posIds[c]);
              if (dist < melhorDist) { melhorDist = dist; melhorCol = c; }
            }
            if (melhorCol !== -1 && melhorDist < 30) {
              nomesPorCol[melhorCol] = (nomesPorCol[melhorCol] + ' ' + cell.text).trim();
            }
          }
        }
      }

      // Inicializa registros dos 4 alimentos com nome NASEM
      for (let c = 0; c < 4; c++) {
        if (!out[ids[c]]) out[ids[c]] = { nrc_id: ids[c], nome_nasem: nomesPorCol[c] };
      }

      // Pula para a linha "Mean SD N" (apenas para encontrar onde começam os dados)
      let k = i + 1;
      while (k < linhas.length && !/Mean\s+SD\s+N/i.test(linhas[k])) {
        k++;
        if (k > i + 6) break;
      }

      // Lê linhas de nutrientes até próximo "Feed ID Code" ou "TABLE 19-1" ou EOF
      let m = k + 1;
      while (m < linhas.length) {
        const Lm = linhas[m];
        if (/^\s*Feed ID Code\b/.test(Lm) || /^Feed ID Code\b/.test(Lm.trim())) break;
        if (/^TABLE 19-1/.test(Lm.trim())) break;
        if (/^TABLE 19-2/.test(Lm.trim())) break;
        const key = detectarNutriente(Lm.trim());
        if (key) {
          const means = extrairMeansPorColuna(Lm, ranges);
          for (let c = 0; c < 4; c++) {
            if (means[c] !== null && !isNaN(means[c])) {
              out[ids[c]][key] = means[c];
            }
          }
        }
        m++;
      }
      i = m;
      continue;
    }
  }
  i++;
}

console.log('Alimentos NASEM extraídos:', Object.keys(out).length);

// === Validação: Wheat Grain Ground (NRC16F170) ===
const tr = out['NRC16F170'];
if (tr) {
  console.log('\n=== NRC16F170 (Wheat Grain, Ground) — validação ===');
  console.log('  dm       =', tr.dm,        '(esperado ≈ 85.7)');
  console.log('  ash      =', tr.ash,       '(esperado ≈ 2.1)');
  console.log('  cp       =', tr.cp,        '(esperado ≈ 13.5)');
  console.log('  cpa      =', tr.cpa,       '(esperado ≈ 31)');
  console.log('  cpb      =', tr.cpb,       '(esperado ≈ 54)');
  console.log('  cpc      =', tr.cpc,       '(esperado ≈ 15)');
  console.log('  kd_prot  =', tr.kd_prot,   '(esperado ≈ 19.1)');
  console.log('  rup      =', tr.rup,       '(esperado ≈ 28)');
  console.log('  drup     =', tr.drup,      '(esperado ≈ 88)');
  console.log('  ndf      =', tr.ndf,       '(esperado ≈ 12.5)');
  console.log('  starch   =', tr.starch,    '(esperado ≈ 63.0)');
  console.log('  ivndfd48 =', tr.ivndfd48,  '(esperado ≈ 55.7)');
  console.log('  ee       =', tr.ee,        '(esperado ≈ 1.98)');
  console.log('  de_base  =', tr.de_base,   '(esperado ≈ 3.56)');
  console.log('  ca       =', tr.ca,        '(esperado ≈ 0.10)');
  console.log('  p        =', tr.p,         '(esperado ≈ 0.36)');
  console.log('  lignin   =', tr.lignin,    '(esperado ≈ 1.52)');
  console.log('  cu       =', tr.cu,        '(esperado ≈ 4.45)');
  console.log('  zn       =', tr.zn,        '(esperado ≈ 32)');
}

// === Validação: Alfalfa Meal (NRC16F1) ===
const af = out['NRC16F1'];
if (af) {
  console.log('\n=== NRC16F1 (Alfalfa Meal) — validação ===');
  console.log('  dm       =', af.dm,        '(esperado ≈ 90.7)');
  console.log('  cp       =', af.cp,        '(esperado ≈ 19.5)');
  console.log('  ndf      =', af.ndf,       '(esperado ≈ 42.9)');
  console.log('  ash      =', af.ash,       '(esperado ≈ 11.7)');
  console.log('  ca       =', af.ca,        '(esperado ≈ 1.50)');
}

fs.writeFileSync('C:/Users/rasaf/nasem_t191.json', JSON.stringify(out, null, 2), 'utf8');
console.log('\n→ Salvo em C:/Users/rasaf/nasem_t191.json');
