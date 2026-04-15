import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Dieta, Alimento } from '../types';
import { calcularResultados, formatarValor } from './calculos';
import { getReferenciasLactacao, getStatus } from './referencias';

// Paleta de cores
const VERDE_ESCURO  = [22, 101, 52]   as [number, number, number];
const VERDE_CLARO   = [220, 252, 231] as [number, number, number];
const CINZA_TITULO  = [55, 65, 81]    as [number, number, number];
const CINZA_LINHA   = [249, 250, 251] as [number, number, number];
const BRANCO        = [255, 255, 255] as [number, number, number];

function statusTexto(status: string): string {
  switch (status) {
    case 'ok':            return 'OK';
    case 'baixo':         return 'Baixo';
    case 'alto':          return 'Alto';
    case 'critico_baixo': return 'Crit. ↓';
    case 'critico_alto':  return 'Crit. ↑';
    default:              return '—';
  }
}

function statusCor(status: string): [number, number, number] {
  switch (status) {
    case 'ok':            return [22, 163, 74];
    case 'baixo':         return [202, 138, 4];
    case 'alto':          return [202, 138, 4];
    case 'critico_baixo': return [220, 38, 38];
    case 'critico_alto':  return [220, 38, 38];
    default:              return [107, 114, 128];
  }
}

export function exportarPDF(dieta: Dieta, alimentos: Alimento[]): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const resultado = calcularResultados(dieta.slots, alimentos, dieta.animal);
  const refs = getReferenciasLactacao(dieta.animal.leite);
  const pageW = 210;
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── CABEÇALHO ──────────────────────────────────────────────────────────────
  doc.setFillColor(...VERDE_ESCURO);
  doc.rect(0, 0, pageW, 22, 'F');

  doc.setTextColor(...BRANCO);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Formulador de Dietas — NRC 2021', margin, 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dieta: ${dieta.nome}`, margin, 16);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageW - margin, 16, { align: 'right' });

  y = 28;

  // ── DADOS DO ANIMAL ─────────────────────────────────────────────────────────
  doc.setFillColor(...CINZA_LINHA);
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setTextColor(...CINZA_TITULO);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO ANIMAL', margin + 2, y + 5);
  y += 10;

  const animal = dieta.animal;
  const dadosAnimal = [
    [`Peso: ${animal.peso} kg`, `DEL: ${animal.del} dias`, `Leite: ${animal.leite} kg/d`],
    [`Gordura: ${animal.gordura}%`, `Proteína: ${animal.proteina}%`, `Lactose: ${animal.lactose}%`],
    [`ECC: ${animal.ecc}`, `Paridade: ${animal.paridade === 0 ? 'Novilha' : 'Vaca adulta'}`, ''],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  const colW = contentW / 3;
  for (const linha of dadosAnimal) {
    for (let i = 0; i < 3; i++) {
      doc.text(linha[i], margin + colW * i + 2, y);
    }
    y += 5.5;
  }

  // CMS
  y += 1;
  const pctCMS = resultado.cmsExigida > 0 ? (resultado.totalKgMS / resultado.cmsExigida) * 100 : 0;
  const cmsOk = pctCMS >= 95 && pctCMS <= 110;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...CINZA_TITULO);
  doc.text(
    `CMS formulada: ${resultado.totalKgMS.toFixed(1)} kg  |  CMS exigida: ${resultado.cmsExigida.toFixed(1)} kg  |  ${pctCMS.toFixed(0)}%  ${cmsOk ? '✓' : '!'}`,
    margin + 2, y
  );
  y += 8;

  // ── INGREDIENTES ────────────────────────────────────────────────────────────
  const slots = dieta.slots.filter(s => s.alimentoNome && s.kgMN > 0);
  const ingRows = slots.map(s => {
    const a = alimentos.find(x => x.nome === s.alimentoNome);
    if (!a) return [s.alimentoNome ?? '', '—', '—', '—'];
    const kgMS = s.kgMN * a.ms;
    const pctMS = resultado.totalKgMS > 0 ? ((kgMS / resultado.totalKgMS) * 100).toFixed(1) + '%' : '—';
    return [s.alimentoNome ?? '', s.kgMN.toFixed(2), kgMS.toFixed(2), pctMS];
  });
  ingRows.push(['TOTAL', resultado.totalKgMN.toFixed(2), resultado.totalKgMS.toFixed(2), '100%']);

  autoTable(doc, {
    startY: y,
    head: [['Ingrediente', 'kg MN/d', 'kg MS/d', '% MS']],
    body: ingRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: VERDE_ESCURO, textColor: BRANCO, fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: contentW * 0.52 },
      1: { cellWidth: contentW * 0.16, halign: 'right' },
      2: { cellWidth: contentW * 0.16, halign: 'right' },
      3: { cellWidth: contentW * 0.16, halign: 'right' },
    },
    alternateRowStyles: { fillColor: CINZA_LINHA },
    didParseCell: (data) => {
      if (data.row.index === ingRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = VERDE_CLARO;
        data.cell.styles.textColor = CINZA_TITULO;
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ── RESULTADOS NUTRICIONAIS ─────────────────────────────────────────────────
  const secoes: { titulo: string; chaves: string[] }[] = [
    { titulo: 'Energia & Carboidratos', chaves: ['nel', 'ndt', 'cnf', 'amido', 'amido_deg'] },
    { titulo: 'Proteína',               chaves: ['pb', 'pdr', 'pndr', 'met', 'lys'] },
    { titulo: 'Fibra',                  chaves: ['fdn', 'efdn', 'fdnf', 'fda'] },
    { titulo: 'Gordura',                chaves: ['ee', 'ee_insat'] },
    { titulo: 'Macrominerais',          chaves: ['ca', 'p', 'mg', 'k', 's', 'na', 'cl'] },
    { titulo: 'Microminerais',          chaves: ['co', 'cu', 'mn_min', 'zn', 'se', 'i', 'fe'] },
    { titulo: 'Vitaminas & Aditivos',   chaves: ['vit_a', 'vit_d3', 'vit_e', 'biotina', 'monensina'] },
  ];

  // Título da seção de resultados
  doc.setFillColor(...CINZA_LINHA);
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setTextColor(...CINZA_TITULO);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RESULTADOS NUTRICIONAIS', margin + 2, y + 5);
  y += 10;

  // Agrupa todos os nutrientes em uma tabela única com separadores de seção
  const nutriRows: (string | { content: string; colSpan: number; styles: object })[][] = [];

  for (const secao of secoes) {
    // Linha de cabeçalho de seção
    nutriRows.push([{
      content: secao.titulo.toUpperCase(),
      colSpan: 4,
      styles: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: 'bold', fontSize: 7.5 }
    }] as (string | { content: string; colSpan: number; styles: object })[]);

    for (const k of secao.chaves) {
      const ref = refs[k];
      if (!ref) continue;
      const valor = resultado[k as keyof typeof resultado] as number;
      const status = getStatus(valor, ref);
      const valorStr = formatarValor(valor, ref.unidade);

      const refStr = ref.ref !== undefined
        ? ref.ref
        : ref.min !== undefined && ref.max !== undefined
        ? `${formatarValor(ref.min, ref.unidade)} – ${formatarValor(ref.max, ref.unidade)}`
        : ref.min !== undefined
        ? `≥ ${formatarValor(ref.min, ref.unidade)}`
        : ref.max !== undefined
        ? `≤ ${formatarValor(ref.max, ref.unidade)}`
        : '—';

      nutriRows.push([ref.label, valorStr, refStr, statusTexto(status)]);
    }
  }

  autoTable(doc, {
    startY: y,
    head: [['Nutriente', 'Valor', 'Meta', 'Status']],
    body: nutriRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: CINZA_TITULO, textColor: BRANCO, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: contentW * 0.38 },
      1: { cellWidth: contentW * 0.20, halign: 'right' },
      2: { cellWidth: contentW * 0.28, halign: 'right' },
      3: { cellWidth: contentW * 0.14, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.column.index === 3 && data.section === 'body') {
        const statusStr = String(data.cell.raw);
        const cor = statusStr === 'OK' ? [22, 163, 74]
          : statusStr === '—' ? [107, 114, 128]
          : statusStr.startsWith('Crit') ? [220, 38, 38]
          : [202, 138, 4];
        data.cell.styles.textColor = cor as [number, number, number];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ── INDICADORES + CUSTOS + LEITE POTENCIAL ──────────────────────────────────
  // Verifica se cabe na página atual ou precisa de nova
  if (y > 240) {
    doc.addPage();
    y = 14;
  }

  autoTable(doc, {
    startY: y,
    head: [['Indicadores & Custos', 'Valor', '', '']],
    body: [
      ['FDNF / PV', (resultado.fdnf_kg_pv * 100).toFixed(2) + '%', '% Forragem MS', (resultado.pct_forragem_ms * 100).toFixed(1) + '%'],
      ['FDN>8 / Amido Deg', resultado.fdn8_amido_deg.toFixed(2), 'Lis / Met', resultado.lis_met.toFixed(2)],
      ['Ca / P', resultado.ca_p.toFixed(2), 'DCAD', resultado.dcad.toFixed(0) + ' mEq/kg'],
      ['Leite potencial NEl', resultado.leite_potencial_nel.toFixed(1) + ' kg/d', 'Leite potencial Prot', resultado.leite_potencial_prot.toFixed(1) + ' kg/d'],
      ['Custo total', `R$ ${resultado.custoTotal.toFixed(2)}/dia`, 'Custo por litro', `R$ ${resultado.custoLitro.toFixed(3)}/L`],
      ['Custo por kg MS', `R$ ${resultado.custoKgMS.toFixed(3)}/kg`, '', ''],
    ],
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: CINZA_TITULO, textColor: BRANCO, fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: contentW * 0.28, fontStyle: 'bold', textColor: CINZA_TITULO },
      1: { cellWidth: contentW * 0.22, halign: 'right' },
      2: { cellWidth: contentW * 0.28, fontStyle: 'bold', textColor: CINZA_TITULO },
      3: { cellWidth: contentW * 0.22, halign: 'right' },
    },
    alternateRowStyles: { fillColor: CINZA_LINHA },
  });

  // ── RODAPÉ ──────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('Formulador de Dietas · Rehagro · NRC 2021', margin, 292);
    doc.text(`Pág. ${i}/${totalPages}`, pageW - margin, 292, { align: 'right' });
  }

  const nomeArquivo = dieta.nome.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ +/g, '_') || 'dieta';
  doc.save(`${nomeArquivo}.pdf`);
}
