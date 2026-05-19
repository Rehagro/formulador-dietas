// Parser de laudo de análise de alimento em XML.
//
// Schema suportado: Standard_XML_Data (padrão CVAS / Dairy One / Rock River
// / Cumberland Valley / 3R Laboratório). É o mesmo formato que o AMTS aceita.
//
// Estrutura típica:
//   <Standard_XML_Data>
//     <Lab_Name Name="Lab_Name" Value="3RLABORATORIO"/>
//     <Sample_Data>
//       <Sample_No Name="Sample No." Value="3200028117"/>
//       <DM Name="Dry Matter" unit="%" Value="35.14"/>
//       <CP Name="CP" unit="%DM" Value="6.33"/>
//       <aNDF Name="aNDF" unit="%DM" Value="42.47"/>
//       ...
//     </Sample_Data>
//   </Standard_XML_Data>
//
// Os elementos com `Name` e `Value` em maiúsculas são padronizados.

import type { Alimento, LaudoMetadata } from '../types';

export interface ParsedLabXML {
  /** Campos do alimento (subset de Alimento), prontos para popular um clone. */
  alimento: Partial<Alimento>;
  /** Metadata do laudo (laboratório, data, número, etc.). */
  metadata: LaudoMetadata;
  /** Avisos/decisões pedagógicas — ex: "IVNDFD48 calculado do Kd cinético". */
  warnings: string[];
  /** Sugestão pedagógica de tipo (F/C/M) com base no Feed Type code do laudo. */
  tipoSugerido: 'F' | 'C' | 'M' | null;
  /** Sugestão de busca para escolha de template base. */
  buscaSugerida: string;
}

const LAB_NAMES: Record<string, string> = {
  '3RLABORATORIO': '3R Laboratório',
  '3RLABS':        '3R Laboratório',
  'DAIRYONE':      'Dairy One',
  'CVAS':          'Cumberland Valley',
  'ROCKRIVER':     'Rock River',
};

// Códigos de Feed Type do schema CVAS/Dairy One (parciais — adiciono conforme aparecer)
const FEED_TYPE_MAP: Record<number, { tipo: 'F' | 'C' | 'M'; busca: string }> = {
  1:   { tipo: 'F', busca: 'alfalfa' },
  3:   { tipo: 'F', busca: 'silagem de milho' },
  5:   { tipo: 'F', busca: 'feno' },
  7:   { tipo: 'F', busca: 'silagem gramínea' },
  10:  { tipo: 'C', busca: 'farelo de soja' },
  20:  { tipo: 'C', busca: 'milho' },
  88:  { tipo: 'C', busca: 'grão' },
  99:  { tipo: 'C', busca: '' },
};

/** Extrai value de um elemento `<TAG Value="..."/>`. Retorna número ou null. */
function num(el: Element | null): number | null {
  if (!el) return null;
  const v = el.getAttribute('Value');
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(el: Element | null): string | null {
  return el?.getAttribute('Value') ?? null;
}

/** dd/MM/yyyy → ISO YYYY-MM-DD; outras formas, devolve a string original. */
function parseDate(s: string | null): string | undefined {
  if (!s) return undefined;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return s;
}

export function parseLabXML(xmlContent: string): ParsedLabXML {
  const warnings: string[] = [];
  const camposCalculados: Record<string, string> = {};

  const doc = new DOMParser().parseFromString(xmlContent, 'application/xml');
  // Detecção de erro funciona tanto no browser (parsererror tag) quanto no Node
  // (@xmldom emite log mas devolve doc com root null em casos extremos).
  if (!doc.documentElement || doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('XML inválido — não foi possível processar o arquivo.');
  }

  // Root pode ser Standard_XML_Data ou direto Sample_Data, dependendo do laboratório.
  const root      = doc.documentElement;
  const sampleEls = doc.getElementsByTagName('Sample_Data');
  const sample    = (sampleEls.length > 0 ? sampleEls[0] : root) as Element;
  const get = (tag: string): Element | null => {
    const els = sample.getElementsByTagName(tag);
    return els.length > 0 ? (els[0] as Element) : null;
  };
  const getRoot = (tag: string): Element | null => {
    const els = root.getElementsByTagName(tag);
    return els.length > 0 ? (els[0] as Element) : null;
  };

  // ── Metadata ──────────────────────────────────────────────────────────────
  const labRaw       = str(getRoot('Lab_Name')) ?? '';
  const laboratorio  = LAB_NAMES[labRaw.toUpperCase()] ?? labRaw ?? 'Desconhecido';
  const numero       = str(get('Sample_No')) ?? '';
  const data_analise = parseDate(str(get('datesampled')));
  const data_chegada = parseDate(str(get('datearrived')));
  const fazenda      = str(get('Name')) ?? undefined;
  const tipo_codigo  = num(get('Type')) ?? undefined;
  const desc         = str(get('Desc_1')) ?? undefined;

  const typeInfo = tipo_codigo != null ? FEED_TYPE_MAP[tipo_codigo] : undefined;

  // ── Composição básica (todas em %DM no XML, viram fração 0-1 no banco) ────
  const DM   = num(get('DM'));            // %
  const CP   = num(get('CP'));            // %DM
  const aNDF = num(get('aNDF'));          // %DM
  const ADF  = num(get('ADF'));           // %DM
  const St   = num(get('Starch'));        // %DM
  const EE   = num(get('Fat_EE'));        // %DM
  const Ash  = num(get('Ash'));           // %DM
  const Lg   = num(get('Lignin'));        // %DM
  const ADICP= num(get('ADICP'));         // %DM
  const NDICP= num(get('NDICP'));         // %DM
  const SPCP = num(get('SP_CP'));         // %CP (fração de PB)

  // Minerais (%DM)
  const Ca = num(get('Ca')); const P = num(get('P'));
  const Mg = num(get('Mg')); const K = num(get('K'));
  const S  = num(get('S'));  const Na = num(get('Na'));
  const Cl = num(get('Cl'));

  // Cinética e digestibilidade
  const NDFkd        = num(get('NDFkd'));            // %/h
  const Starchkd     = num(get('Starchkd'));         // %/h
  const NDFDom30h    = num(get('NDFDom_IV_30hr'));   // %NDFom
  const NDFDom120h   = num(get('NDFDom_IV_120hr'));  // %NDFom
  const NDFDom240h   = num(get('NDFDom_IV_240hr'));  // %NDFom
  const uNDF240      = num(get('uNDF240'));          // %DM
  // NDT (Milk 2006 TDN) — quando disponível
  const TDN_pct      = num(get('Milk2006_TDN'));     // %

  // ── IVNDFD48 % NDF: usa cinética de 1ª ordem quando possível ───────────────
  // pdNDF (% MS) = aNDF - uNDF240
  // dig_frac em 48h = 1 - exp(-Kd × 48 / 100)   (Kd em %/h)
  // IVNDFD48 % NDF = pdNDF × dig_frac / aNDF × 100
  let ivndfd48: number | null = null;
  if (aNDF != null && uNDF240 != null && NDFkd != null && aNDF > 0) {
    const pdNDF_frac = (aNDF - uNDF240) / aNDF;
    const dig_frac   = 1 - Math.exp(-NDFkd * 48 / 100);
    ivndfd48         = Math.max(0, Math.min(100, pdNDF_frac * dig_frac * 100));
    camposCalculados.ivndfd48 = 'calculado do Kd cinético (uNDF240 + NDFkd)';
  } else if (NDFDom30h != null) {
    ivndfd48 = NDFDom30h;
    camposCalculados.ivndfd48 = 'aproximação NDFDom 30h (XML não traz cinética completa)';
    warnings.push('IVNDFD48 aproximado via NDFDom 30h (≈ 1pp menor que 48h em forrageiras típicas).');
  }
  // Senão: deixa null → template NASEM preenche

  // ── Validações simples ────────────────────────────────────────────────────
  if (DM != null && (DM < 1 || DM > 100)) warnings.push(`MS ${DM}% fora de escala (1-100).`);
  if (CP != null && CP > 100) warnings.push(`PB ${CP}% acima de 100% — confira o laudo.`);
  if (aNDF != null && ADF != null && ADF > aNDF) {
    warnings.push(`FDA (${ADF.toFixed(1)}%) > FDN (${aNDF.toFixed(1)}%) — laudo inconsistente.`);
  }

  // ── Monta Partial<Alimento> ───────────────────────────────────────────────
  const alimento: Partial<Alimento> = {};
  if (DM   != null) alimento.ms     = DM / 100;
  if (CP   != null) alimento.pb     = CP / 100;
  if (aNDF != null) alimento.fdn    = aNDF / 100;
  if (ADF  != null) alimento.fda    = ADF / 100;
  if (St   != null) alimento.amido  = St / 100;
  if (EE   != null) alimento.ee     = EE / 100;
  if (Ash  != null) alimento.cinza  = Ash / 100;
  if (Lg   != null) alimento.lignin = Lg / 100;
  if (ADICP!= null) alimento.adip   = ADICP / 100;
  if (NDICP!= null) alimento.ndip   = NDICP / 100;
  if (SPCP != null) alimento.soluble_protein = SPCP / 100;
  if (Ca   != null) alimento.ca = Ca / 100;
  if (P    != null) alimento.p  = P  / 100;
  if (Mg   != null) alimento.mg = Mg / 100;
  if (K    != null) alimento.k  = K  / 100;
  if (S    != null) alimento.s  = S  / 100;
  if (Na   != null) alimento.na = Na / 100;
  if (Cl   != null) alimento.cl = Cl / 100;
  if (Starchkd != null) alimento.kd_amido = Starchkd;
  if (TDN_pct  != null) alimento.ndt      = TDN_pct / 100;
  if (ivndfd48 != null) alimento.ivndfd48 = ivndfd48;

  const metadata: LaudoMetadata = {
    laboratorio,
    numero_laudo:  numero,
    data_analise:  data_analise ?? '',
    data_chegada,
    nome_amostra:  desc ?? undefined,
    fazenda:       fazenda ?? undefined,
    tipo_codigo,
    importado_em:  new Date().toISOString(),
    campos_calculados: Object.keys(camposCalculados).length ? camposCalculados : undefined,
  };

  return {
    alimento,
    metadata,
    warnings,
    tipoSugerido: typeInfo?.tipo ?? null,
    buscaSugerida: typeInfo?.busca ?? '',
  };
}
