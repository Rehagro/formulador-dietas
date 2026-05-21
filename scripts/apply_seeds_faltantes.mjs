// Aplica os seeds gerados por seeds_alimentos_faltantes.py em src/data/alimentos.json:
// 1. Faz append dos novos alimentos PT-BR (com campos numéricos nulos — serão
//    preenchidos pelo rebuild_alimentos.mjs em seguida).
// 2. Conecta a 'Ureia' brasileira existente ao Fd_Name 'Urea' do CSV NASEM.
//
// Idempotente: pula seeds cujo `nome` PT-BR já existe.

import fs from 'node:fs';

const BANCO = './src/data/alimentos.json';
const SEEDS = './scripts/seeds_alimentos_faltantes.json';

const banco = JSON.parse(fs.readFileSync(BANCO, 'utf8'));
const seeds = JSON.parse(fs.readFileSync(SEEDS, 'utf8'));

const nomesAtuais = new Set(banco.map(a => a.nome));
const fonteAtuais = new Set(
  banco.filter(a => a.fonte_nasem).map(a => a.fonte_nasem.toLowerCase())
);

// Campos numéricos que o rebuild popula. Inicializamos null para que o esquema
// fique consistente com o resto do banco.
const CAMPOS_NUM = [
  'ms','pb','pdr','pndr','fdn','efdn','mn8','mn19','fdnf','fda','nel','ndt',
  'ee','ee_insat','cinza','cnf','amido','kd_amido','met','lys','ca','p','mg',
  'k','s','na','cl','co','cu','mn_min','zn','se','i','fe','vit_a','vit_d3',
  'vit_e','biotina','monensina','cr','levedura','prot_a','prot_b','prot_c',
  'kd_prot','rup_digest','cp_digest','ndf_digest','fat_digest','lisina_pct',
  'met_pct','ivndfd48','soluble_protein','adip','ndip','lignin','wsc','de_base',
  'mo','fa','dc_st','dc_fa','npn_frac',
];

let adicionados = 0;
let pulados = 0;
const novos = [];
for (const s of seeds) {
  if (nomesAtuais.has(s.nome)) {
    console.log(`  pulado (nome já existe): ${s.nome}`);
    pulados++; continue;
  }
  if (s.fonte_nasem && fonteAtuais.has(s.fonte_nasem.toLowerCase())) {
    console.log(`  pulado (fonte_nasem já mapeada): ${s.nome} -> ${s.fonte_nasem}`);
    pulados++; continue;
  }
  const obj = { ...s };
  for (const k of CAMPOS_NUM) obj[k] = null;
  novos.push(obj);
  adicionados++;
}

// Conecta Ureia ao Urea do CSV (caso especial)
const ureia = banco.find(a => a.nome === 'Ureia');
let ureia_conectada = false;
if (ureia && !ureia.fonte_nasem) {
  ureia.fonte_nasem = 'Urea';
  ureia_conectada = true;
  console.log('  Ureia conectada ao Fd_Name="Urea"');
}

const merged = [...banco, ...novos];

fs.writeFileSync(BANCO, JSON.stringify(merged, null, 2), 'utf8');
console.log(`\n→ Banco atualizado: ${banco.length} → ${merged.length} alimentos`);
console.log(`  Adicionados: ${adicionados}`);
console.log(`  Pulados: ${pulados}`);
console.log(`  Ureia conectada: ${ureia_conectada}`);
console.log('\nPróximo passo: node scripts/rebuild_alimentos.mjs');
