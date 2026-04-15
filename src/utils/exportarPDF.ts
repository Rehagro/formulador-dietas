import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Dieta, Alimento } from '../types';
import { calcularResultados, formatarValor } from './calculos';
import { getReferenciasLactacao, getStatus } from './referencias';

// ── Paleta ──────────────────────────────────────────────────────────────────
const VERDE   = [22, 101, 52]    as [number, number, number];
const VERDE2  = [21, 128, 61]    as [number, number, number];
const CINZA_H = [55, 65, 81]     as [number, number, number];
const CINZA_L = [249, 250, 251]  as [number, number, number];
const BRANCO  = [255, 255, 255]  as [number, number, number];
const PRETO   = [17, 24, 39]     as [number, number, number];

const COR_OK      = [22, 163, 74]   as [number, number, number];
const COR_ALERTA  = [202, 138, 4]   as [number, number, number];
const COR_CRITICO = [220, 38, 38]   as [number, number, number];
const COR_CALC    = [107, 114, 128] as [number, number, number];

const PAGE_W  = 210;
const MARGIN  = 13;
const C_W     = PAGE_W - MARGIN * 2;  // 184 mm

function statusTexto(s: string): string {
  switch (s) {
    case 'ok':            return 'OK';
    case 'baixo':         return 'Baixo';
    case 'alto':          return 'Alto';
    case 'critico_baixo': return 'Crit. Baixo';
    case 'critico_alto':  return 'Crit. Alto';
    default:              return '-';
  }
}


/** Título de seção com faixa colorida */
function sectionTitle(doc: jsPDF, y: number, texto: string): number {
  doc.setFillColor(...CINZA_H);
  doc.rect(MARGIN, y, C_W, 6.5, 'F');
  doc.setTextColor(...BRANCO);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(texto, MARGIN + 2, y + 4.5);
  return y + 9;
}

/** Verifica se precisa de nova página */
function checkPage(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > 280) {
    doc.addPage();
    return 14;
  }
  return y;
}

export function exportarPDF(dieta: Dieta, alimentos: Alimento[]): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const resultado = calcularResultados(dieta.slots, alimentos, dieta.animal);
  const refs = getReferenciasLactacao(dieta.animal.leite);
  let y = 0;

  // ── CABEÇALHO ──────────────────────────────────────────────────────────────
  // Barra verde principal
  doc.setFillColor(...VERDE);
  doc.rect(0, 0, PAGE_W, 18, 'F');
  // Faixa verde secundária
  doc.setFillColor(...VERDE2);
  doc.rect(0, 18, PAGE_W, 7, 'F');

  doc.setTextColor(...BRANCO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Formulador de Dietas  —  NRC 2021', MARGIN, 11.5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dieta: ${dieta.nome}`, MARGIN, 22.5);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, PAGE_W - MARGIN, 22.5, { align: 'right' });

  y = 32;

  // ── DADOS DO ANIMAL ─────────────────────────────────────────────────────────
  y = sectionTitle(doc, y, 'DADOS DO ANIMAL');

  const animal = dieta.animal;
  const colW3 = C_W / 3;

  const dadosA = [
    [`Peso: ${animal.peso} kg`,      `Leite: ${animal.leite} kg/d`,     `DEL: ${animal.del} dias`],
    [`Gordura: ${animal.gordura}%`,  `Proteina: ${animal.proteina}%`,   `Lactose: ${animal.lactose}%`],
    [`ECC: ${animal.ecc}`,           `Paridade: ${animal.paridade === 0 ? 'Novilha' : 'Vaca adulta'}`, `Preco leite: R$ ${animal.precoLeite.toFixed(2)}/L`],
  ];

  doc.setFontSize(8.5);
  for (const linha of dadosA) {
    doc.setTextColor(...PRETO);
    doc.setFont('helvetica', 'normal');
    for (let i = 0; i < 3; i++) {
      doc.text(linha[i], MARGIN + colW3 * i + 2, y);
    }
    // linha divisória sutil
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN, y + 1.5, MARGIN + C_W, y + 1.5);
    y += 5.5;
  }

  // CMS
  y += 1;
  const pctCMS = resultado.cmsExigida > 0 ? (resultado.totalKgMS / resultado.cmsExigida) * 100 : 0;
  const cmsBg: [number, number, number] = pctCMS >= 95 && pctCMS <= 110 ? [220, 252, 231] : [254, 226, 226];
  doc.setFillColor(...cmsBg);
  doc.roundedRect(MARGIN, y - 1, C_W, 7, 1.5, 1.5, 'F');
  doc.setTextColor(...CINZA_H);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(
    `CMS formulada: ${resultado.totalKgMS.toFixed(1)} kg/d   |   CMS exigida: ${resultado.cmsExigida.toFixed(1)} kg/d   |   ${pctCMS.toFixed(0)}% do exigido`,
    PAGE_W / 2, y + 3.5, { align: 'center' }
  );
  y += 11;

  // ── INGREDIENTES ────────────────────────────────────────────────────────────
  y = checkPage(doc, y, 40);
  y = sectionTitle(doc, y, 'INGREDIENTES DA DIETA');

  const slots = dieta.slots.filter(s => s.alimentoNome && s.kgMN > 0);
  const ingBody = slots.map(s => {
    const a = alimentos.find(x => x.nome === s.alimentoNome);
    if (!a) return [s.alimentoNome ?? '', '-', '-', '-'];
    const kgMS = s.kgMN * a.ms;
    const pct = resultado.totalKgMS > 0 ? ((kgMS / resultado.totalKgMS) * 100).toFixed(1) + '%' : '-';
    return [s.alimentoNome ?? '', s.kgMN.toFixed(2), kgMS.toFixed(2), pct];
  });
  ingBody.push(['TOTAL', resultado.totalKgMN.toFixed(2), resultado.totalKgMS.toFixed(2), '100%']);

  autoTable(doc, {
    startY: y,
    head: [['Ingrediente', 'kg MN/d', 'kg MS/d', '% MS']],
    body: ingBody,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      textColor: PRETO,
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: VERDE,
      textColor: BRANCO,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: C_W * 0.52, halign: 'left' },
      1: { cellWidth: C_W * 0.16, halign: 'center' },
      2: { cellWidth: C_W * 0.16, halign: 'center' },
      3: { cellWidth: C_W * 0.16, halign: 'center' },
    },
    alternateRowStyles: { fillColor: CINZA_L },
    didParseCell: (data) => {
      const isTotal = data.row.index === ingBody.length - 1;
      if (isTotal) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 252, 231];
        data.cell.styles.textColor = CINZA_H;
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // ── RESULTADOS NUTRICIONAIS ─────────────────────────────────────────────────
  const secoes: { titulo: string; chaves: string[] }[] = [
    { titulo: 'Energia & Carboidratos', chaves: ['nel', 'ndt', 'cnf', 'amido', 'amido_deg'] },
    { titulo: 'Proteina',               chaves: ['pb', 'pdr', 'pndr', 'met', 'lys'] },
    { titulo: 'Fibra',                  chaves: ['fdn', 'efdn', 'fdnf', 'fda'] },
    { titulo: 'Gordura',                chaves: ['ee', 'ee_insat'] },
    { titulo: 'Macrominerais',          chaves: ['ca', 'p', 'mg', 'k', 's', 'na', 'cl'] },
    { titulo: 'Microminerais',          chaves: ['co', 'cu', 'mn_min', 'zn', 'se', 'i', 'fe'] },
    { titulo: 'Vitaminas & Aditivos',   chaves: ['vit_a', 'vit_d3', 'vit_e', 'biotina', 'monensina'] },
  ];

  y = checkPage(doc, y, 20);
  y = sectionTitle(doc, y, 'RESULTADOS NUTRICIONAIS');

  // Monta todas as linhas em uma única tabela com sub-headers por seção
  type CellDef = { content: string; colSpan?: number; styles?: object };
  const nutriRows: (string[] | CellDef[])[] = [];

  for (const secao of secoes) {
    nutriRows.push([{
      content: secao.titulo.toUpperCase(),
      colSpan: 4,
      styles: {
        fillColor: [240, 253, 244],
        textColor: [22, 101, 52],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      },
    }] as CellDef[]);

    for (const k of secao.chaves) {
      const ref = refs[k];
      if (!ref) continue;
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

      nutriRows.push([ref.label, valorStr, refStr, statusTexto(status)]);
    }
  }

  autoTable(doc, {
    startY: y,
    head: [['Nutriente', 'Valor', 'Meta', 'Status']],
    body: nutriRows,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      textColor: PRETO,
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: CINZA_H,
      textColor: BRANCO,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: C_W * 0.34, halign: 'left' },
      1: { cellWidth: C_W * 0.20, halign: 'center' },
      2: { cellWidth: C_W * 0.30, halign: 'center' },
      3: { cellWidth: C_W * 0.16, halign: 'center' },
    },
    alternateRowStyles: { fillColor: CINZA_L },
    didParseCell: (data) => {
      if (data.column.index === 3 && data.section === 'body') {
        const s = String(data.cell.raw);
        const cor =
          s === 'OK'         ? COR_OK :
          s === '-'          ? COR_CALC :
          s.startsWith('Crit') ? COR_CRITICO : COR_ALERTA;
        data.cell.styles.textColor = cor;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // ── INDICADORES + CUSTOS ────────────────────────────────────────────────────
  y = checkPage(doc, y, 50);

  const col2W = C_W / 2 - 1;

  // Leite potencial — dois cards lado a lado
  y = sectionTitle(doc, y, 'PRODUCAO POTENCIAL');

  const cardH = 14;
  // Card NEl
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(MARGIN, y, col2W, cardH, 2, 2, 'F');
  doc.setDrawColor(...COR_OK);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, col2W, cardH, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...VERDE);
  doc.text('Leite Potencial Energia (NEl)', MARGIN + col2W / 2, y + 4.5, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(21, 128, 61);
  doc.text(`${resultado.leite_potencial_nel.toFixed(1)} kg/d`, MARGIN + col2W / 2, y + 11, { align: 'center' });

  // Card Proteína
  const cx2 = MARGIN + col2W + 2;
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(cx2, y, col2W, cardH, 2, 2, 'F');
  doc.setDrawColor(124, 58, 237);
  doc.roundedRect(cx2, y, col2W, cardH, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(109, 40, 217);
  doc.text('Leite Potencial Proteina (MP)', cx2 + col2W / 2, y + 4.5, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(109, 40, 217);
  doc.text(`${resultado.leite_potencial_prot.toFixed(1)} kg/d`, cx2 + col2W / 2, y + 11, { align: 'center' });
  doc.setLineWidth(0.1);

  y += cardH + 6;

  // Indicadores e custos em tabela 2x4
  y = checkPage(doc, y, 40);
  y = sectionTitle(doc, y, 'INDICADORES & CUSTOS');

  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Valor', 'Indicador', 'Valor']],
    body: [
      ['FDNF / PV',         (resultado.fdnf_kg_pv * 100).toFixed(2) + '%',   '% Forragem MS',  (resultado.pct_forragem_ms * 100).toFixed(1) + '%'],
      ['FDN>8 / Amido Deg', resultado.fdn8_amido_deg.toFixed(2),              'Lis / Met',      resultado.lis_met.toFixed(2)],
      ['Ca / P',            resultado.ca_p.toFixed(2),                        'DCAD',           resultado.dcad.toFixed(0) + ' mEq/kg'],
      ['Custo total',       `R$ ${resultado.custoTotal.toFixed(2)}/dia`,       'Custo / litro',  `R$ ${resultado.custoLitro.toFixed(3)}/L`],
      ['Custo / kg MS',     `R$ ${resultado.custoKgMS.toFixed(3)}/kg`,         '',               ''],
    ],
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      textColor: PRETO,
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: CINZA_H,
      textColor: BRANCO,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: C_W * 0.28, halign: 'left',   fontStyle: 'bold', textColor: CINZA_H },
      1: { cellWidth: C_W * 0.22, halign: 'center', textColor: [22, 101, 52] as [number,number,number] },
      2: { cellWidth: C_W * 0.28, halign: 'left',   fontStyle: 'bold', textColor: CINZA_H },
      3: { cellWidth: C_W * 0.22, halign: 'center', textColor: [22, 101, 52] as [number,number,number] },
    },
    alternateRowStyles: { fillColor: CINZA_L },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // ── LEGENDA DE STATUS ───────────────────────────────────────────────────────
  y = checkPage(doc, y, 38);
  y = sectionTitle(doc, y, 'LEGENDA — COMO INTERPRETAR O STATUS');

  const legendaItens: { cor: [number,number,number]; label: string; desc: string }[] = [
    { cor: COR_OK,      label: 'OK',          desc: 'Valor dentro da faixa recomendada.' },
    { cor: COR_ALERTA,  label: 'Baixo',       desc: 'Abaixo do minimo, porem dentro de 10% de tolerancia.' },
    { cor: COR_ALERTA,  label: 'Alto',        desc: 'Acima do maximo, porem dentro de 10% de tolerancia.' },
    { cor: COR_CRITICO, label: 'Crit. Baixo', desc: 'Mais de 10% abaixo do minimo recomendado. Requer atencao.' },
    { cor: COR_CRITICO, label: 'Crit. Alto',  desc: 'Mais de 10% acima do maximo recomendado. Requer atencao.' },
    { cor: COR_CALC,    label: '-',           desc: 'Sem referencia numerica (valor calculado/informativo).' },
  ];

  doc.setFontSize(8);
  for (const item of legendaItens) {
    // Bolinha colorida
    doc.setFillColor(...item.cor);
    doc.circle(MARGIN + 2.5, y - 0.5, 2, 'F');
    // Label em bold
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...item.cor);
    doc.text(item.label, MARGIN + 7, y + 0.5);
    // Descrição
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PRETO);
    const labelW = doc.getTextWidth(item.label);
    doc.text(`: ${item.desc}`, MARGIN + 7 + labelW, y + 0.5);
    y += 5.5;
  }

  y += 2;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('Referencias baseadas em NRC (2001/2021). A tolerancia de 10% define a transicao entre Baixo/Alto e Critico.', MARGIN, y);

  // ── RODAPÉ em todas as páginas ───────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(249, 250, 251);
    doc.rect(0, 287, PAGE_W, 10, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.line(0, 287, PAGE_W, 287);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text('Formulador de Dietas · Rehagro · NRC 2021', MARGIN, 292);
    doc.text(`Pag. ${i} / ${total}`, PAGE_W - MARGIN, 292, { align: 'right' });
  }

  const nome = dieta.nome.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ +/g, '_') || 'dieta';
  doc.save(`${nome}.pdf`);
}
