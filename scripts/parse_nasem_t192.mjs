// Parser refinado da Tabela 19-2 NASEM 2021 (AAs)
// Estrutura: 6 alimentos por bloco. Linha "Feed Name" + nomes (podem se estender em linha acima).
// Estratégia: usar a linha "CP, % DM" (sempre tem 6 valores alinhados) para descobrir
// posições das 6 colunas; depois extrair valor de Lys e Met de cada coluna.

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

// Normaliza nome para match (case-insensitive, remove pontuação especial)
function normNome(s) {
  return s.toLowerCase()
    .replace(/[–—�]/g, '-')
    .replace(/[\/]/g, ' ')
    .replace(/[,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// === Detecta blocos ===
const out = {};  // nome normalizado → { lys, met }

let i = 0;
while (i < linhas.length) {
  const L = linhas[i];
  if (/^Feed Name\b/.test(L.trim())) {
    // Linha Feed Name + nomes
    // Procura próxima linha "CP, % DM" para detectar posições das 6 colunas
    let k = i + 1;
    while (k < linhas.length && k < i + 10 && !/^CP,\s*%\s*DM/i.test(linhas[k].trim())) k++;
    if (k >= linhas.length || k >= i + 10) { i++; continue; }
    const numsCP = numerosComPos(linhas[k]);
    if (numsCP.length < 6) { i = k + 1; continue; }
    const posCols = numsCP.slice(0, 6).map(n => n.pos);

    // Captura nomes:
    // - Linha "Feed Name" tem os nomes (suffix) em colunas
    // - Linha 2 acima (i-2, considerando linha vazia em i-1) pode ter prefixo dos nomes
    function extrairCelulas(linhaTexto) {
      const cells = [];
      const re = /\S+(?: \S+)*/g;
      let m;
      while ((m = re.exec(linhaTexto)) !== null) {
        const t = m[0].trim();
        if (t === 'Feed' || t === 'Name' || t === 'Feed Name') continue;
        // Filtra puramente numéricas
        if (/^[\d., ]+$/.test(t)) continue;
        cells.push({ pos: m.index, text: t });
      }
      return cells;
    }

    const nomesPorCol = ['', '', '', '', '', ''];
    // Linha "Feed Name" (suffix dos nomes)
    const cellsFeedName = extrairCelulas(L.replace(/^Feed Name\s*/, ''));
    // Ajusta offset (porque removemos "Feed Name " no início)
    const ofsFeedName = L.length - L.replace(/^Feed Name\s*/, '').length;
    cellsFeedName.forEach(c => c.pos += ofsFeedName);
    // Linha 2 acima (continuação de nome)
    const linhaAcima = (i - 2 >= 0) ? linhas[i - 2] : '';
    const cellsAcima = /Feed Name|TABLE/.test(linhaAcima) ? [] : extrairCelulas(linhaAcima);

    function associaCelula(cells, nomesArr) {
      for (const cell of cells) {
        let melhorCol = -1;
        let melhorDist = Infinity;
        for (let c = 0; c < 6; c++) {
          const dist = Math.abs(cell.pos - posCols[c]);
          if (dist < melhorDist) { melhorDist = dist; melhorCol = c; }
        }
        if (melhorCol !== -1 && melhorDist < 25) {
          nomesArr[melhorCol] = (nomesArr[melhorCol] + ' ' + cell.text).trim();
        }
      }
    }
    associaCelula(cellsAcima, nomesPorCol);
    associaCelula(cellsFeedName, nomesPorCol);

    // Inicializa registros
    const idsBloco = nomesPorCol.map(n => normNome(n));

    // Lê linhas até próximo "Feed Name" ou EOF
    let m = k;
    while (m < linhas.length) {
      const Lm = linhas[m];
      if (/^Feed Name\b/.test(Lm.trim()) && m !== i) break;
      if (/^TABLE 19-3/.test(Lm.trim())) break;
      // Detecta linha de AA (Lys ou Met)
      let aaKey = null;
      if (/^Lys,\s*%\s*CP/i.test(Lm.trim())) aaKey = 'lys';
      else if (/^Met,\s*%\s*CP/i.test(Lm.trim())) aaKey = 'met';
      if (aaKey) {
        const nums = numerosComPos(Lm);
        for (let c = 0; c < 6; c++) {
          // Para cada coluna, pega o número cuja pos está mais próxima da pos da coluna
          let melhorN = null;
          let melhorDist = Infinity;
          for (const n of nums) {
            const dist = Math.abs(n.pos - posCols[c]);
            if (dist < melhorDist) { melhorDist = dist; melhorN = n; }
          }
          if (melhorN && melhorDist < 15 && idsBloco[c]) {
            if (!out[idsBloco[c]]) out[idsBloco[c]] = {};
            out[idsBloco[c]][aaKey] = melhorN.value;
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

console.log('Alimentos T19-2:', Object.keys(out).length);

// Validação: Alfalfa Meal e Wheat Grain, Ground
['alfalfa meal', 'wheat grain ground', 'soybean meal solvent extracted 48% cp'].forEach(n => {
  const found = Object.entries(out).find(([k]) => k.includes(n.replace(/\s+/g, ' ')));
  console.log(' ', n, '→', found ? found[0] : '(não encontrado)', found ? JSON.stringify(found[1]) : '');
});

fs.writeFileSync('C:/Users/rasaf/nasem_t192_aa.json', JSON.stringify(out, null, 2), 'utf8');
console.log('\n→ Salvo em C:/Users/rasaf/nasem_t192_aa.json');
