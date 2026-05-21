/**
 * PDF do Formulador de Ração — layout próprio, separado do PDF da dieta.
 *
 * Conteúdo:
 *   - Cabeçalho: nome da fazenda, data, técnico responsável (logo)
 *   - Tabela de pesagem: ingrediente | kg para misturar | % | R$ na batida
 *   - Composição nutricional resultante (macro + minerais)
 *   - Totais: kg da batida, custo total, R$/kg da mistura
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ResultadoRacao } from './calculosRacao';

const AMBAR  = [217, 119, 6]    as [number, number, number];
const CINZA_H = [55, 65, 81]    as [number, number, number];
const CINZA_L = [249, 250, 251] as [number, number, number];
const BRANCO  = [255, 255, 255] as [number, number, number];
const PRETO   = [17, 24, 39]    as [number, number, number];

const PAGE_W  = 210;
const MARGIN  = 13;
const C_W     = PAGE_W - MARGIN * 2;

function sectionTitle(doc: jsPDF, y: number, texto: string, cor = CINZA_H): number {
  doc.setFillColor(...cor);
  doc.rect(MARGIN, y, C_W, 6.5, 'F');
  doc.setTextColor(...BRANCO);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(texto, MARGIN + 2, y + 4.5);
  return y + 9;
}

function pct(v: number, casas = 2): string {
  if (!isFinite(v) || isNaN(v)) return '-';
  return (v * 100).toFixed(casas);
}

function mg(v: number, casas = 1): string {
  if (!isFinite(v) || isNaN(v)) return '-';
  return v.toFixed(casas);
}

export interface MetaRacao {
  nome: string;
  fazenda?: string;
  tecnico?: string;
}

export function exportarPDFRacao(resultado: ResultadoRacao, meta: MetaRacao): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 0;

  // ── Cabeçalho ────────────────────────────────────────────────────────────
  doc.setFillColor(...AMBAR);
  doc.rect(0, 0, PAGE_W, 22, 'F');
  doc.setTextColor(...BRANCO);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Receita de Ração', MARGIN, 10);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Mistura de concentrados — Formulador de Dietas', MARGIN, 15);
  // Direita: data
  doc.setFontSize(8);
  const data = new Date().toLocaleDateString('pt-BR');
  doc.text(`Data: ${data}`, PAGE_W - MARGIN, 10, { align: 'right' });
  doc.text(`${resultado.kg_batida_total.toFixed(0)} kg / batida`, PAGE_W - MARGIN, 15, { align: 'right' });
  y = 25;

  // ── Identificação ───────────────────────────────────────────────────────
  doc.setTextColor(...PRETO);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(meta.nome, MARGIN, y);
  y += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...CINZA_H);
  if (meta.fazenda) doc.text(`Fazenda: ${meta.fazenda}`, MARGIN, y);
  if (meta.tecnico)  doc.text(`Técnico: ${meta.tecnico}`, PAGE_W - MARGIN, y, { align: 'right' });
  y += 6;

  // ── Pesagem ─────────────────────────────────────────────────────────────
  y = sectionTitle(doc, y, 'PESAGEM POR INGREDIENTE');

  const linhas = resultado.ingredientes.map(ic => [
    ic.alimento.nome,
    ic.kg_batida.toFixed(2),
    (ic.fracao * 100).toFixed(2) + '%',
    ic.alimento.custo != null ? ic.alimento.custo.toFixed(3) : '-',
    ic.custo_batida.toFixed(2),
    (ic.pct_custo * 100).toFixed(1) + '%',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Ingrediente', 'kg na batida', '% mistura', 'R$/kg', 'Custo R$', '% custo']],
    body: linhas,
    foot: [[
      'TOTAL',
      resultado.kg_batida_total.toFixed(2),
      '100,00%',
      '',
      resultado.custo_total.toFixed(2),
      '100,0%',
    ]],
    theme: 'grid',
    headStyles: { fillColor: AMBAR, textColor: BRANCO, fontSize: 8, fontStyle: 'bold' },
    footStyles: { fillColor: CINZA_L, textColor: PRETO, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: PRETO },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: 'right', cellWidth: 22 },
      2: { halign: 'right', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 18 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });
  // @ts-expect-error - lastAutoTable
  y = doc.lastAutoTable.finalY + 4;

  // ── Composição nutricional ──────────────────────────────────────────────
  y = sectionTitle(doc, y, 'COMPOSIÇÃO NUTRICIONAL DA MISTURA');
  const c = resultado.composicao;

  autoTable(doc, {
    startY: y,
    body: [
      ['MS (%)',      pct(c.ms),       'PB (%)',       pct(c.pb),        'NDT (%)',  pct(c.ndt)],
      ['FDN (%)',     pct(c.fdn),      'FDA (%)',      pct(c.fda),       'Amido (%)',pct(c.amido)],
      ['EE (%)',      pct(c.ee),       'Lignina (%)',  pct(c.lignin),    'Cinza (%)',pct(c.cinza)],
      ['CNF (%)',     pct(c.cnf),      'EE insat (%)', pct(c.ee_insat),  'DE base (Mcal/kg)', c.de_base.toFixed(3)],
    ],
    theme: 'grid',
    bodyStyles: { fontSize: 8, textColor: PRETO },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30, fillColor: CINZA_L },
      1: { halign: 'right', cellWidth: 30 },
      2: { fontStyle: 'bold', cellWidth: 30, fillColor: CINZA_L },
      3: { halign: 'right', cellWidth: 30 },
      4: { fontStyle: 'bold', cellWidth: 30, fillColor: CINZA_L },
      5: { halign: 'right', cellWidth: 34 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });
  // @ts-expect-error - lastAutoTable
  y = doc.lastAutoTable.finalY + 4;

  // ── Minerais ────────────────────────────────────────────────────────────
  y = sectionTitle(doc, y, 'MINERAIS (média ponderada)');
  autoTable(doc, {
    startY: y,
    body: [
      ['Ca (%)',  pct(c.ca, 3),  'P (%)',  pct(c.p, 3),  'Mg (%)', pct(c.mg, 3),  'K (%)',  pct(c.k, 3)],
      ['Na (%)',  pct(c.na, 3),  'Cl (%)', pct(c.cl, 3), 'S (%)',  pct(c.s, 3),   '',       ''],
      ['Cu (mg/kg)', mg(c.cu),    'Fe (mg/kg)', mg(c.fe), 'Mn (mg/kg)', mg(c.mn_min), 'Zn (mg/kg)', mg(c.zn)],
      ['Co (mg/kg)', mg(c.co, 3), 'Se (mg/kg)', mg(c.se, 3), 'I (mg/kg)', mg(c.i, 3), '', ''],
    ],
    theme: 'grid',
    bodyStyles: { fontSize: 7.5, textColor: PRETO },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 23, fillColor: CINZA_L },
      1: { halign: 'right', cellWidth: 23 },
      2: { fontStyle: 'bold', cellWidth: 23, fillColor: CINZA_L },
      3: { halign: 'right', cellWidth: 23 },
      4: { fontStyle: 'bold', cellWidth: 23, fillColor: CINZA_L },
      5: { halign: 'right', cellWidth: 23 },
      6: { fontStyle: 'bold', cellWidth: 23, fillColor: CINZA_L },
      7: { halign: 'right', cellWidth: 23 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });
  // @ts-expect-error - lastAutoTable
  y = doc.lastAutoTable.finalY + 4;

  // ── Resumo financeiro ───────────────────────────────────────────────────
  y = sectionTitle(doc, y, 'RESUMO');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRETO);
  doc.text(`Custo total da batida: R$ ${resultado.custo_total.toFixed(2)}`, MARGIN + 2, y + 4);
  doc.text(`Custo unitário: R$ ${resultado.custo_por_kg.toFixed(3)}/kg de mistura`, MARGIN + 2, y + 10);
  doc.text(`Consumo por animal: ${resultado.consumo_total_kg_d.toFixed(2)} kg/d`, MARGIN + 2, y + 16);
  y += 22;

  // ── Rodapé ──────────────────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(...CINZA_L);
    doc.rect(0, 287, PAGE_W, 10, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...CINZA_H);
    doc.text(
      'Formulador de Dietas - Rehagro · Composição calculada por média ponderada dos ingredientes na MS',
      MARGIN, 292,
    );
    doc.text(`Página ${i} / ${total}`, PAGE_W - MARGIN, 292, { align: 'right' });
  }

  const arquivo = `${meta.nome.replace(/[^a-z0-9]/gi, '_')}_${data.replace(/\//g, '-')}.pdf`;
  doc.save(arquivo);
}
