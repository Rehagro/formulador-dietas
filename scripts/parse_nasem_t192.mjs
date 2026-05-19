// Parser da Tabela 19-2 (AAs e FAs) do NASEM 2021.
// Estrutura: 6 alimentos por bloco. "Feed Name" + nomes (podem se estender em linha anterior).
// Extrai apenas Met e Lys (campos pedagogicamente úteis); restante dos AAs ignorado por escopo.

import fs from 'node:fs';

const TXT = fs.readFileSync('C:/Users/rasaf/nasem_t192_table.txt', 'utf8');
const linhas = TXT.split('\n');

function numerosComPos(linha) {
  const re = /[-]?\d{1,3}(?:,\d{3})*\.?\d*|[-]?\.\d+|[-]?\d+\.?\d*/g;
  const result = [];
  let m;
  while ((m = re.exec(linha)) !== null) {
    const numStr = m[0].replace(/,/g, '');
    const num = Number(numStr);
    if (!isNaN(num)) result.push({ pos: m.index, value: num });
  }
  return result;
}

const AAS = [
  { key: 'lys', regex: /^Lys,\s*%\s*CP/i },
  { key: 'met', regex: /^Met,\s*%\s*CP/i },
];

function detectarAA(linha) {
  for (const { key, regex } of AAS) if (regex.test(linha)) return key;
  return null;
}

// Normaliza nome para comparação fuzzy
function normNome(s) {
  return s.toLowerCase()
    .replace(/[\/,]/g, ' ')
    .replace(/\bor\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// === Loop principal ===
const out = {};  // nomeNormalizado → { lys, met, cp }

let i = 0;
while (i < linhas.length) {
  const L = linhas[i];
  if (/^Feed Name\b/.test(L.trim())) {
    // Coletar nomes da linha "Feed Name" + linha anterior (continuação)
    const linhaPrev = i > 0 ? linhas[i - 2] : '';  // 2 linhas atrás (gap de linha vazia)

    // Os nomes estão alinhados em colunas. Preciso encontrar posições.
    // Estratégia: split por 2+ espaços
    const partesPrev = linhaPrev.split(/\s{2,}/).filter(s => s.trim() !== '');
    const partesAtu  = L.replace(/^Feed Name\s*/, '').split(/\s{2,}/).filter(s => s.trim() !== '');

    // Mesclar nomes: se uma palavra está na linha anterior, ela é prefixo da do mesmo índice
    // Heurística: se partesPrev tem mais ou igual número de itens, eles complementam
    const nomes = [];
    const max = Math.max(partesPrev.length, partesAtu.length);
    for (let k = 0; k < max; k++) {
      const p1 = partesPrev[k] || '';
      const p2 = partesAtu[k] || '';
      nomes.push((p1 + ' ' + p2).trim());
    }

    // As linhas seguintes contêm os nutrientes. Preciso de uma referência de posições
    // de coluna: vou usar as posições onde aparece o primeiro número da linha "CP, % DM"
    let k = i + 1;
    while (k < linhas.length && !/^CP,\s*%\s*DM/i.test(linhas[k].trim())) k++;
    if (k >= linhas.length) { i++; continue; }
    const numsCP = numerosComPos(linhas[k]);
    if (numsCP.length < 6) { i = k + 1; continue; }
    // Posições das 6 colunas = posições dos 6 primeiros números do CP
    const posCols = numsCP.slice(0, 6).map(n => n.pos);

    // Inicializa registros
    const idsBloco = nomes.slice(0, 6).map(n => normNome(n));
    for (const id of idsBloco) {
      if (!out[id]) out[id] = {};
    }

    // Lê linhas até próximo "Feed Name" ou EOF
    let m = k;
    while (m < linhas.length) {
      const Lm = linhas[m];
      if (/^Feed Name\b/.test(Lm.trim()) && m !== i) break;
      if (/^TABLE 19-3/.test(Lm.trim())) break;
      const key = detectarAA(Lm.trim());
      if (key) {
        const nums = numerosComPos(Lm);
        // Para cada coluna, pega o primeiro número cuja pos está no range
        for (let c = 0; c < 6; c++) {
          const start = c === 0 ? 0 : (posCols[c-1] + posCols[c]) / 2;
          const end   = c + 1 < 6 ? (posCols[c] + posCols[c+1]) / 2 : Infinity;
          const cand = nums.filter(n => n.pos >= start && n.pos < end);
          if (cand.length > 0 && idsBloco[c]) {
            out[idsBloco[c]][key] = cand[0].value;
          }
        }
      }
      m++;
    }
    i = m;
    continue;
  }
  i++;
}

console.log('Alimentos na T19-2 (com Met/Lys):', Object.keys(out).length);

// Sanity check
['alfalfa meal', 'wheat grain ground'].forEach(n => {
  // Procura match parcial
  const found = Object.entries(out).find(([k]) => k.includes(n.replace(/\s+/g, ' ')));
  console.log('\n', n, '→', found ? found[0] : 'não encontrado', found ? found[1] : '');
});

fs.writeFileSync('C:/Users/rasaf/nasem_t192_aa.json', JSON.stringify(out, null, 2), 'utf8');
console.log('\n→ Salvo em C:/Users/rasaf/nasem_t192_aa.json');
