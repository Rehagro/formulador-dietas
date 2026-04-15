import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Dieta, Alimento } from '../types';
import { calcularResultados, formatarValor } from './calculos';
import { getReferenciasLactacao, getStatus } from './referencias';

// ── Paleta de cores ──────────────────────────────────────────────────────────
const COR_VERDE_ESCURO  = '166452';   // cabeçalho principal
const COR_VERDE_MEDIO   = '16A34A';   // subtítulos de seção
const COR_VERDE_CLARO   = 'DCFCE7';   // total de ingredientes
const COR_CINZA_TITULO  = '374151';   // títulos de seção
const COR_CINZA_LINHA   = 'F9FAFB';   // linhas alternadas
const COR_AZUL_HEADER   = '1D4ED8';   // cabeçalho de tabela
const COR_OK            = '16A34A';
const COR_ALERTA        = 'CA8A04';
const COR_CRITICO       = 'DC2626';
const COR_CALC          = '6B7280';

type RGB = { argb: string };

function fill(hex: string): { type: 'pattern'; pattern: 'solid'; fgColor: RGB } {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } };
}

function bold(size = 10, color = '111827'): Partial<ExcelJS.Font> {
  return { bold: true, size, color: { argb: 'FF' + color } };
}

function normal(size = 10, color = '111827'): Partial<ExcelJS.Font> {
  return { bold: false, size, color: { argb: 'FF' + color } };
}

const CENTER: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };
const LEFT:   Partial<ExcelJS.Alignment> = { horizontal: 'left',   vertical: 'middle' };
const RIGHT:  Partial<ExcelJS.Alignment> = { horizontal: 'right',  vertical: 'middle' };

function bordaBaixa(row: ExcelJS.Row) {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
  });
}

function statusTexto(status: string): string {
  switch (status) {
    case 'ok':            return 'OK';
    case 'baixo':         return 'Baixo';
    case 'alto':          return 'Alto';
    case 'critico_baixo': return 'Crit. Baixo';
    case 'critico_alto':  return 'Crit. Alto';
    default:              return '-';
  }
}

function statusCor(status: string): string {
  switch (status) {
    case 'ok':            return COR_OK;
    case 'baixo':         return COR_ALERTA;
    case 'alto':          return COR_ALERTA;
    case 'critico_baixo': return COR_CRITICO;
    case 'critico_alto':  return COR_CRITICO;
    default:              return COR_CALC;
  }
}

function addSectionHeader(ws: ExcelJS.Worksheet, titulo: string, cols: number) {
  const row = ws.addRow([titulo]);
  ws.mergeCells(row.number, 1, row.number, cols);
  row.height = 20;
  row.getCell(1).fill = fill(COR_CINZA_TITULO);
  row.getCell(1).font = bold(9.5, 'FFFFFF');
  row.getCell(1).alignment = { ...LEFT, indent: 1 };
}

export async function exportarXLSX(dieta: Dieta, alimentos: Alimento[]): Promise<void> {
  const resultado = calcularResultados(dieta.slots, alimentos, dieta.animal);
  const refs = getReferenciasLactacao(dieta.animal.leite);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Formulador de Dietas - Rehagro';
  wb.created = new Date();

  // ════════════════════════════════════════════════════════════════════════════
  // ABA 1 — DIETA
  // ════════════════════════════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet('Dieta');
  ws1.columns = [
    { key: 'A', width: 32 },
    { key: 'B', width: 14 },
    { key: 'C', width: 14 },
    { key: 'D', width: 12 },
  ];

  // Cabeçalho principal
  const r1 = ws1.addRow(['Formulador de Dietas — NRC 2021']);
  ws1.mergeCells(r1.number, 1, r1.number, 4);
  r1.height = 24;
  r1.getCell(1).fill = fill(COR_VERDE_ESCURO);
  r1.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  r1.getCell(1).alignment = CENTER;

  const r2 = ws1.addRow([`Dieta: ${dieta.nome}`, '', '', `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`]);
  ws1.mergeCells(r2.number, 1, r2.number, 3);
  r2.height = 16;
  r2.getCell(1).fill = fill('1A6B3A');
  r2.getCell(1).font = normal(9, 'DCFCE7');
  r2.getCell(1).alignment = { ...LEFT, indent: 1 };
  r2.getCell(4).fill = fill('1A6B3A');
  r2.getCell(4).font = normal(9, 'DCFCE7');
  r2.getCell(4).alignment = RIGHT;

  ws1.addRow([]);

  // ── Dados do animal ──────────────────────────────────────────────────────
  addSectionHeader(ws1, 'DADOS DO ANIMAL', 4);

  const animal = dieta.animal;
  const dadosAnimal: [string, string | number, string, string | number][] = [
    ['Peso', `${animal.peso} kg`,        'Paridade', animal.paridade === 0 ? 'Novilha' : 'Vaca adulta'],
    ['DEL', `${animal.del} dias`,        'ECC', animal.ecc],
    ['Leite', `${animal.leite} kg/d`,    'Preco Leite', `R$ ${animal.precoLeite.toFixed(2)}/L`],
    ['Gordura', `${animal.gordura}%`,    'Proteina', `${animal.proteina}%`],
    ['Lactose', `${animal.lactose}%`,    '', ''],
  ];

  for (const [k1, v1, k2, v2] of dadosAnimal) {
    const r = ws1.addRow([k1, v1, k2, v2]);
    r.height = 16;
    r.getCell(1).font = bold(9.5);
    r.getCell(1).alignment = { ...LEFT, indent: 1 };
    r.getCell(2).font = normal(9.5);
    r.getCell(2).alignment = CENTER;
    r.getCell(3).font = bold(9.5);
    r.getCell(3).alignment = LEFT;
    r.getCell(4).font = normal(9.5);
    r.getCell(4).alignment = CENTER;
    bordaBaixa(r);
  }

  ws1.addRow([]);

  // ── CMS ──────────────────────────────────────────────────────────────────
  addSectionHeader(ws1, 'CONSUMO DE MATERIA SECA (CMS)', 4);
  const pctCMS = resultado.cmsExigida > 0 ? (resultado.totalKgMS / resultado.cmsExigida) * 100 : 0;

  const cmsHeaders = ws1.addRow(['', 'CMS Formulada', 'CMS Exigida', '% Atendimento']);
  cmsHeaders.height = 16;
  [2, 3, 4].forEach(i => {
    cmsHeaders.getCell(i).font = bold(9, 'FFFFFF');
    cmsHeaders.getCell(i).fill = fill(COR_AZUL_HEADER);
    cmsHeaders.getCell(i).alignment = CENTER;
  });

  const cmsRow = ws1.addRow(['', `${resultado.totalKgMS.toFixed(2)} kg`, `${resultado.cmsExigida.toFixed(2)} kg`, `${pctCMS.toFixed(1)}%`]);
  cmsRow.height = 16;
  [2, 3, 4].forEach(i => {
    cmsRow.getCell(i).font = normal(9.5);
    cmsRow.getCell(i).alignment = CENTER;
    cmsRow.getCell(i).fill = fill(COR_CINZA_LINHA);
  });

  ws1.addRow([]);

  // ── Ingredientes ─────────────────────────────────────────────────────────
  addSectionHeader(ws1, 'INGREDIENTES DA DIETA', 4);

  const ingHeader = ws1.addRow(['Ingrediente', 'kg MN/d', 'kg MS/d', '% MS']);
  ingHeader.height = 17;
  ingHeader.eachCell(cell => {
    cell.font = bold(9, 'FFFFFF');
    cell.fill = fill(COR_VERDE_ESCURO);
    cell.alignment = CENTER;
  });
  ingHeader.getCell(1).alignment = LEFT;

  const slots = dieta.slots.filter(s => s.alimentoNome && s.kgMN > 0);
  slots.forEach((s, idx) => {
    const a = alimentos.find(x => x.nome === s.alimentoNome);
    if (!a) return;
    const kgMS = s.kgMN * a.ms;
    const pct = resultado.totalKgMS > 0 ? ((kgMS / resultado.totalKgMS) * 100).toFixed(1) + '%' : '-';
    const r = ws1.addRow([s.alimentoNome, s.kgMN.toFixed(2), kgMS.toFixed(2), pct]);
    r.height = 15;
    r.getCell(1).font = normal(9.5);
    r.getCell(1).alignment = { ...LEFT, indent: 1 };
    [2, 3, 4].forEach(i => {
      r.getCell(i).font = normal(9.5);
      r.getCell(i).alignment = CENTER;
    });
    if (idx % 2 === 1) r.eachCell(c => { c.fill = fill(COR_CINZA_LINHA); });
    bordaBaixa(r);
  });

  const totalRow = ws1.addRow(['TOTAL', resultado.totalKgMN.toFixed(2), resultado.totalKgMS.toFixed(2), '100%']);
  totalRow.height = 17;
  totalRow.eachCell(cell => {
    cell.font = bold(9.5, COR_CINZA_TITULO);
    cell.fill = fill(COR_VERDE_CLARO);
    cell.alignment = CENTER;
  });
  totalRow.getCell(1).alignment = { ...LEFT, indent: 1 };

  // ════════════════════════════════════════════════════════════════════════════
  // ABA 2 — RESULTADOS NUTRICIONAIS
  // ════════════════════════════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet('Resultados Nutricionais');
  ws2.columns = [
    { key: 'A', width: 22 },
    { key: 'B', width: 16 },
    { key: 'C', width: 20 },
    { key: 'D', width: 14 },
  ];

  // Cabeçalho
  const r2h = ws2.addRow(['Formulador de Dietas — NRC 2021']);
  ws2.mergeCells(r2h.number, 1, r2h.number, 4);
  r2h.height = 24;
  r2h.getCell(1).fill = fill(COR_VERDE_ESCURO);
  r2h.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  r2h.getCell(1).alignment = CENTER;

  const r2s = ws2.addRow([`Dieta: ${dieta.nome}`, '', '', `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`]);
  ws2.mergeCells(r2s.number, 1, r2s.number, 3);
  r2s.height = 16;
  [1, 4].forEach(i => {
    r2s.getCell(i).fill = fill('1A6B3A');
    r2s.getCell(i).font = normal(9, 'DCFCE7');
  });
  r2s.getCell(1).alignment = { ...LEFT, indent: 1 };
  r2s.getCell(4).alignment = RIGHT;

  ws2.addRow([]);

  const secoes: { titulo: string; chaves: string[] }[] = [
    { titulo: 'ENERGIA & CARBOIDRATOS', chaves: ['nel', 'ndt', 'cnf', 'amido', 'amido_deg'] },
    { titulo: 'PROTEINA',               chaves: ['pb', 'pdr', 'pndr', 'met', 'lys'] },
    { titulo: 'FIBRA',                  chaves: ['fdn', 'efdn', 'fdnf', 'fda'] },
    { titulo: 'GORDURA',                chaves: ['ee', 'ee_insat'] },
    { titulo: 'MACROMINERAIS',          chaves: ['ca', 'p', 'mg', 'k', 's', 'na', 'cl'] },
    { titulo: 'MICROMINERAIS',          chaves: ['co', 'cu', 'mn_min', 'zn', 'se', 'i', 'fe'] },
    { titulo: 'VITAMINAS & ADITIVOS',   chaves: ['vit_a', 'vit_d3', 'vit_e', 'biotina', 'monensina'] },
  ];

  for (const secao of secoes) {
    // Header da seção
    const sh = ws2.addRow([secao.titulo]);
    ws2.mergeCells(sh.number, 1, sh.number, 4);
    sh.height = 18;
    sh.getCell(1).fill = fill(COR_CINZA_TITULO);
    sh.getCell(1).font = bold(9, 'FFFFFF');
    sh.getCell(1).alignment = { ...LEFT, indent: 1 };

    // Header das colunas
    const ch = ws2.addRow(['Nutriente', 'Valor', 'Meta', 'Status']);
    ch.height = 16;
    ch.eachCell(cell => {
      cell.font = bold(9, 'FFFFFF');
      cell.fill = fill('374151');
      cell.alignment = CENTER;
    });
    ch.getCell(1).alignment = { ...LEFT, indent: 1 };

    secao.chaves.forEach((k, idx) => {
      const ref = refs[k];
      if (!ref) return;
      const valor = resultado[k as keyof typeof resultado] as number;
      const status = getStatus(valor, ref);
      const valorStr = formatarValor(valor, ref.unidade);
      const refStr = ref.ref !== undefined
        ? ref.ref
        : ref.min !== undefined && ref.max !== undefined
        ? `${formatarValor(ref.min, ref.unidade)} a ${formatarValor(ref.max, ref.unidade)}`
        : ref.min !== undefined
        ? `>= ${formatarValor(ref.min, ref.unidade)}`
        : ref.max !== undefined
        ? `<= ${formatarValor(ref.max, ref.unidade)}`
        : '-';

      const r = ws2.addRow([ref.label, valorStr, refStr, statusTexto(status)]);
      r.height = 15;
      r.getCell(1).font = normal(9.5);
      r.getCell(1).alignment = { ...LEFT, indent: 1 };
      r.getCell(2).font = bold(9.5);
      r.getCell(2).alignment = CENTER;
      r.getCell(3).font = normal(9);
      r.getCell(3).alignment = CENTER;
      r.getCell(4).font = { bold: true, size: 9.5, color: { argb: 'FF' + statusCor(status) } };
      r.getCell(4).alignment = CENTER;
      if (idx % 2 === 1) [1, 2, 3].forEach(i => { r.getCell(i).fill = fill(COR_CINZA_LINHA); });
      bordaBaixa(r);
    });

    ws2.addRow([]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ABA 3 — INDICADORES & CUSTOS
  // ════════════════════════════════════════════════════════════════════════════
  const ws3 = wb.addWorksheet('Indicadores & Custos');
  ws3.columns = [
    { key: 'A', width: 26 },
    { key: 'B', width: 18 },
    { key: 'C', width: 26 },
    { key: 'D', width: 18 },
  ];

  const r3h = ws3.addRow(['Formulador de Dietas — NRC 2021']);
  ws3.mergeCells(r3h.number, 1, r3h.number, 4);
  r3h.height = 24;
  r3h.getCell(1).fill = fill(COR_VERDE_ESCURO);
  r3h.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  r3h.getCell(1).alignment = CENTER;

  ws3.addRow([]);

  // Indicadores
  const indicadores: [string, string, string, string][] = [
    ['FDNF / PV', (resultado.fdnf_kg_pv * 100).toFixed(2) + '%',   '% Forragem MS', (resultado.pct_forragem_ms * 100).toFixed(1) + '%'],
    ['FDN>8 / Amido Deg', resultado.fdn8_amido_deg.toFixed(2),      'Lis / Met', resultado.lis_met.toFixed(2)],
    ['Ca / P', resultado.ca_p.toFixed(2),                           'DCAD', resultado.dcad.toFixed(0) + ' mEq/kg'],
  ];
  const potencial: [string, string, string, string][] = [
    ['Leite Potencial NEl', resultado.leite_potencial_nel.toFixed(1) + ' kg/d', 'Leite Potencial Prot', resultado.leite_potencial_prot.toFixed(1) + ' kg/d'],
    ['Leite Atual', dieta.animal.leite + ' kg/d', '', ''],
  ];
  const custos: [string, string, string, string][] = [
    ['Custo Total', `R$ ${resultado.custoTotal.toFixed(2)}/dia`,     'Custo por kg MS', `R$ ${resultado.custoKgMS.toFixed(3)}/kg`],
    ['Custo por Litro', `R$ ${resultado.custoLitro.toFixed(3)}/L`,  '', ''],
  ];

  const renderGrupo = (titulo: string, linhas: [string, string, string, string][]) => {
    addSectionHeader(ws3, titulo, 4);
    const h = ws3.addRow(['Indicador', 'Valor', 'Indicador', 'Valor']);
    h.height = 16;
    h.eachCell(cell => {
      cell.font = bold(9, 'FFFFFF');
      cell.fill = fill('374151');
      cell.alignment = CENTER;
    });
    linhas.forEach((linha, idx) => {
      const r = ws3.addRow(linha);
      r.height = 16;
      r.getCell(1).font = bold(9.5);
      r.getCell(1).alignment = { ...LEFT, indent: 1 };
      r.getCell(2).font = normal(9.5, COR_VERDE_MEDIO);
      r.getCell(2).alignment = CENTER;
      r.getCell(3).font = bold(9.5);
      r.getCell(3).alignment = { ...LEFT, indent: 1 };
      r.getCell(4).font = normal(9.5, COR_VERDE_MEDIO);
      r.getCell(4).alignment = CENTER;
      if (idx % 2 === 1) r.eachCell(c => { c.fill = fill(COR_CINZA_LINHA); });
      bordaBaixa(r);
    });
    ws3.addRow([]);
  };

  renderGrupo('INDICADORES', indicadores);
  renderGrupo('PRODUCAO POTENCIAL', potencial);
  renderGrupo('CUSTOS', custos);

  // ── Gerar e baixar ───────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const nomeArquivo = dieta.nome.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ +/g, '_') || 'dieta';
  saveAs(blob, `${nomeArquivo}.xlsx`);
}

export { formatarValor };
