// Simula a dieta do usuário (700kg, 150 DEL, 40 kg leite alvo, sileg milho maduro 48 kg MN)
// e compara com o NASEM Software oficial (resultado do RTF: NEL=44.69 MP=29.58)
import { readFileSync } from 'node:fs';
import { calcularResultados } from '../src/utils/calculos.ts';

const alimentos = JSON.parse(readFileSync(
  new URL('../src/data/alimentos.json', import.meta.url), 'utf8'));

const slots = [
  { id:'1', alimentoNome:'Silagem de Milho, Maduro',                       kgMN: 48.11 },
  { id:'2', alimentoNome:'Farelo de Soja, Extração por Solvente, 48% PB',  kgMN: 3.0495 },
  { id:'3', alimentoNome:'Polpa Cítrica, Seca',                            kgMN: 1.234 },
  { id:'4', alimentoNome:'Grão de Milho Seco, Moagem Média',               kgMN: 2.505 },
  { id:'5', alimentoNome:'Caroço de Algodão Inteiro',                      kgMN: 0.5959 },
];

const animal = {
  ecc: 3, paridade: 1, peso: 700, del: 150,
  leite: 40, gordura: 3.7, proteina: 3.2, lactose: 4.6,
  precoLeite: 2.5, raca: 'Holstein',
  dias_gestacao: 60, peso_bezerro_alvo: 40, gestacao_total: 280,
  peso_maduro: 700, ganho_frame_kg_dia: 0, ganho_reserva_kg_dia: 0,
  ndf_method: 'lignin',
};

const r = calcularResultados(slots, alimentos, animal);

console.log('=== Dieta do usuário — modo Lignina ===');
console.log(`Total kg MN: ${r.totalKgMN.toFixed(2)}`);
console.log(`Total kg MS: ${r.totalKgMS.toFixed(2)}`);
console.log(`PB:    ${(r.pb*100).toFixed(2)}%`);
console.log(`FDN:   ${(r.fdn*100).toFixed(2)}%`);
console.log(`Amido: ${(r.amido*100).toFixed(2)}%`);
console.log(`EE:    ${(r.ee*100).toFixed(2)}%`);
console.log(`DE  Mcal/kg: ${r.dt_de?.toFixed(2) ?? '—'}`);
console.log(`ME  Mcal/kg: ${r.dt_me?.toFixed(2) ?? '—'}`);
console.log(`NEL Mcal/kg: ${r.nel.toFixed(2)}`);
console.log(`Leite NEL:   ${r.leite_potencial_nel.toFixed(2)} kg/d   (NASEM Software: 44.69)`);
console.log(`Leite MP:    ${r.leite_potencial_prot.toFixed(2)} kg/d   (NASEM Software: 29.58)`);

// Mesmo cálculo, modo iv_all
animal.ndf_method = 'iv_all';
const r2 = calcularResultados(slots, alimentos, animal);
console.log('\n=== Dieta do usuário — modo DFND 48h em todos ===');
console.log(`Leite NEL:   ${r2.leite_potencial_nel.toFixed(2)} kg/d   (NASEM Software: 40.75)`);
console.log(`Leite MP:    ${r2.leite_potencial_prot.toFixed(2)} kg/d   (NASEM Software: 29.58)`);
