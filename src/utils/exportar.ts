import * as XLSX from 'xlsx';
import type { Dieta, Alimento } from '../types';
import { calcularResultados, formatarValor } from './calculos';
import { REFERENCIAS_LACTACAO } from './referencias';

export function exportarXLSX(dieta: Dieta, alimentos: Alimento[]): void {
  const resultado = calcularResultados(dieta.slots, alimentos, dieta.animal);
  const wb = XLSX.utils.book_new();

  // Aba 1: Dieta
  const dietaRows: unknown[][] = [
    ['DADOS DO ANIMAL'],
    ['ECC', dieta.animal.ecc],
    ['Paridade', dieta.animal.paridade === 0 ? 'Novilha' : 'Vaca adulta'],
    ['Peso (kg)', dieta.animal.peso],
    ['DEL (dias)', dieta.animal.del],
    ['Leite (kg/d)', dieta.animal.leite],
    ['Gordura (%)', dieta.animal.gordura],
    ['Proteína (%)', dieta.animal.proteina],
    ['Lactose (%)', dieta.animal.lactose],
    ['Preço leite (R$/L)', dieta.animal.precoLeite],
    [],
    ['CMS Exigida (kg MS/d)', resultado.cmsExigida.toFixed(2)],
    ['CMS Real (kg MS/d)', resultado.totalKgMS.toFixed(2)],
    [],
    ['INGREDIENTES'],
    ['Alimento', 'kg MN/d', 'kg MS/d', '% MS'],
  ];

  for (const slot of dieta.slots) {
    if (!slot.alimentoNome || slot.kgMN <= 0) continue;
    const a = alimentos.find(x => x.nome === slot.alimentoNome);
    if (!a) continue;
    const kgMS = slot.kgMN * a.ms;
    dietaRows.push([
      slot.alimentoNome,
      slot.kgMN.toFixed(2),
      kgMS.toFixed(2),
      resultado.totalKgMS > 0 ? ((kgMS / resultado.totalKgMS) * 100).toFixed(1) + '%' : '—',
    ]);
  }

  dietaRows.push(['TOTAL', resultado.totalKgMN.toFixed(2), resultado.totalKgMS.toFixed(2), '100%']);

  const wsdieta = XLSX.utils.aoa_to_sheet(dietaRows);
  XLSX.utils.book_append_sheet(wb, wsdieta, 'Dieta');

  // Aba 2: Resultados
  const resRows: unknown[][] = [['Nutriente', 'Valor', 'Unidade', 'Mín', 'Máx', 'Status']];
  const chaves = Object.keys(REFERENCIAS_LACTACAO);
  for (const k of chaves) {
    const ref = REFERENCIAS_LACTACAO[k];
    const val = resultado[k as keyof typeof resultado] as number;
    if (val === undefined) continue;
    resRows.push([
      ref.label,
      typeof val === 'number' ? val.toFixed(4) : val,
      ref.unidade,
      ref.min ?? '—',
      ref.max ?? '—',
      ref.tipo === 'calculada' ? 'Calculada' : '—',
    ]);
  }
  const wsres = XLSX.utils.aoa_to_sheet(resRows);
  XLSX.utils.book_append_sheet(wb, wsres, 'Resultados');

  // Aba 3: Indicadores
  const indRows: unknown[][] = [
    ['INDICADORES'],
    ['FDNF/PV (%)', (resultado.fdnf_kg_pv * 100).toFixed(3), 'meta: < 0.9%'],
    ['% Forragem MS', (resultado.pct_forragem_ms * 100).toFixed(1) + '%', 'meta: 40-60%'],
    ['FDN>8 / Amido Deg', resultado.fdn8_amido_deg.toFixed(2), 'meta: ≥ 1'],
    ['Lis / Met', resultado.lis_met.toFixed(2), 'meta: ~3'],
    ['Ca / P', resultado.ca_p.toFixed(2), 'meta: 2-6'],
    ['DCAD (mEq/kg MS)', resultado.dcad.toFixed(0), 'meta: > 150'],
    [],
    ['CUSTOS'],
    ['Custo total (R$/d)', resultado.custoTotal.toFixed(2)],
    ['Custo (R$/kg MS)', resultado.custoKgMS.toFixed(3)],
    ['Custo (R$/litro)', resultado.custoLitro.toFixed(3)],
    [],
    ['PRODUÇÃO POTENCIAL'],
    ['Leite potencial NEl (kg/d)', resultado.leite_potencial_nel.toFixed(1)],
    ['Leite potencial Prot (kg/d)', resultado.leite_potencial_prot.toFixed(1)],
    ['Leite atual (kg/d)', dieta.animal.leite],
  ];
  const wsind = XLSX.utils.aoa_to_sheet(indRows);
  XLSX.utils.book_append_sheet(wb, wsind, 'Indicadores');

  XLSX.writeFile(wb, `${dieta.nome.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
}

export { formatarValor };
