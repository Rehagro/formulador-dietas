// Smoke test do parser de XML — roda contra os 5 laudos reais.
// Uso: node --experimental-strip-types scripts/test_parseLabXML.mjs

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DOMParser } from '@xmldom/xmldom';

// Polyfill DOMParser para Node (não tem por default)
globalThis.DOMParser = DOMParser;

const { parseLabXML } = await import('../src/utils/parseLabXML.ts');

const dir = 'Analises alimentos';
const files = readdirSync(dir).filter(f => f.endsWith('.xml'));

console.log(`Testando ${files.length} XMLs:\n`);

for (const file of files) {
  const xml = readFileSync(join(dir, file), 'utf8');
  try {
    const { alimento, metadata, warnings, tipoSugerido, buscaSugerida } = parseLabXML(xml);
    console.log(`=== ${file} ===`);
    console.log(`  Lab:       ${metadata.laboratorio}`);
    console.log(`  Amostra:   ${metadata.numero_laudo}`);
    console.log(`  Data:      ${metadata.data_analise}`);
    console.log(`  Fazenda:   ${metadata.fazenda ?? '—'}`);
    console.log(`  Tipo cód:  ${metadata.tipo_codigo} → ${tipoSugerido} · busca: "${buscaSugerida}"`);
    console.log(`  Campos extraídos: ${Object.keys(alimento).length}`);
    console.log(`  MS: ${((alimento.ms ?? 0)*100).toFixed(2)}%  PB: ${((alimento.pb ?? 0)*100).toFixed(2)}%  ` +
                `FDN: ${((alimento.fdn ?? 0)*100).toFixed(2)}%  Amido: ${((alimento.amido ?? 0)*100).toFixed(2)}%  ` +
                `EE: ${((alimento.ee ?? 0)*100).toFixed(2)}%  Cinza: ${((alimento.cinza ?? 0)*100).toFixed(2)}%`);
    console.log(`  Lignina: ${((alimento.lignin ?? 0)*100).toFixed(2)}%  ` +
                `kd_amido: ${alimento.kd_amido ?? '—'} %/h  ` +
                `IVNDFD48: ${(alimento.ivndfd48 ?? 0).toFixed(1)}%  (${metadata.campos_calculados?.ivndfd48 ?? 'XML direto'})`);
    if (warnings.length) console.log(`  ⚠ avisos: ${warnings.join('; ')}`);
    console.log();
  } catch (e) {
    console.log(`=== ${file} ===`);
    console.log(`  ❌ ${e.message}\n`);
  }
}
