import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, FileUp, AlertTriangle, Beaker, FileText } from 'lucide-react';
import type { Alimento } from '../../types';
import { parseLabXML, type ParsedLabXML } from '../../utils/parseLabXML';
import { TIPO_LABEL } from './utils';

interface Props {
  alimentos: Alimento[];
  onConfirmar: (parsed: ParsedLabXML, template: Alimento) => void;
  onCancelar: () => void;
}

/**
 * Fluxo:
 *  Etapa 1: drag&drop / file picker do XML do laudo
 *  Etapa 2: preview do laudo detectado + escolha de template NASEM base
 *  Etapa 3: chama onConfirmar para abrir modal de edição
 */
export default function ModalImportarXML({ alimentos, onConfirmar, onCancelar }: Props) {
  const [parsed, setParsed]   = useState<ParsedLabXML | null>(null);
  const [erro, setErro]       = useState<string | null>(null);
  const [query, setQuery]     = useState('');
  const [debounced, setDeb]   = useState('');
  const [dragOver, setDrag]   = useState(false);
  const fileInputRef          = useRef<HTMLInputElement>(null);
  const searchRef             = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDeb(query.trim().toLowerCase()), 300);
    return () => clearTimeout(id);
  }, [query]);

  // Pré-busca sugerida do template após parsear
  useEffect(() => {
    if (parsed?.buscaSugerida) {
      setQuery(parsed.buscaSugerida);
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [parsed]);

  async function handleFile(file: File) {
    setErro(null);
    if (!file.name.toLowerCase().endsWith('.xml')) {
      setErro('Por favor selecione um arquivo .xml do laudo.');
      return;
    }
    try {
      const text = await file.text();
      const result = parseLabXML(text);
      setParsed(result);
    } catch (e) {
      setErro((e as Error).message || 'Não foi possível processar o XML.');
    }
  }

  const resultados = useMemo(() => {
    if (!parsed) return [];
    let lista = alimentos;
    if (parsed.tipoSugerido) {
      lista = lista.filter(a => a.tipo === parsed.tipoSugerido);
    }
    if (!debounced) return lista.slice(0, 30);
    return lista.filter(a =>
      a.nome.toLowerCase().includes(debounced) ||
      a.classificacao.toLowerCase().includes(debounced)
    ).slice(0, 30);
  }, [alimentos, debounced, parsed]);

  const tipoBg = (t: string) =>
    t === 'C' ? 'bg-blue-100 text-blue-700' :
    t === 'F' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700';

  // ─── Etapa 1: upload ──────────────────────────────────────────────────────
  if (!parsed) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center overflow-y-auto py-8">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-xl mx-4">
          <div className="flex items-start justify-between p-5 border-b border-gray-100">
            <div>
              <h2 className="font-bold text-gray-800 text-lg">📤 Importar XML do laudo</h2>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Aceita o XML padrão dos laboratórios (3R Lab, Dairy One, CVAS, Rock River).
              </p>
            </div>
            <button onClick={onCancelar} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          <div className="p-6">
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => {
                e.preventDefault();
                setDrag(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-gray-300 hover:border-sky-400 hover:bg-sky-50/50'
              }`}
            >
              <FileUp size={42} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Arraste o arquivo XML aqui
              </p>
              <p className="text-xs text-gray-500">ou clique para selecionar</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>

            {erro && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{erro}</span>
              </div>
            )}

            <div className="mt-5 text-xs text-gray-500 leading-relaxed">
              <p className="font-semibold mb-1">O que é extraído do XML:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Composição: MS, PB, FDN, FDA, amido, EE, cinzas, lignina</li>
                <li>Frações: ADIP, NDIP, proteína solúvel</li>
                <li>Minerais: Ca, P, Mg, K, S, Na, Cl</li>
                <li>Cinética: kd do amido, kd da fibra (quando disponível)</li>
                <li>DFND 48h calculada do Kd + uNDF240 (silagens)</li>
              </ul>
              <p className="mt-2">
                Frações proteicas NASEM (A/B/C, kd_prot, etc.) e demais campos avançados
                vêm do template do banco que você escolhe a seguir.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Etapa 2: preview + escolha de template ────────────────────────────────
  const m = parsed.metadata;
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">✅ Laudo detectado</h2>
            <p className="text-sm text-gray-500 mt-1">
              Escolha um alimento do banco para usar como base (frações proteicas, etc.).
            </p>
          </div>
          <button onClick={onCancelar} className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Resumo do laudo */}
        <div className="p-4 bg-sky-50 border-b border-sky-100">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
            <div className="flex items-center gap-1.5">
              <Beaker size={12} className="text-sky-600" />
              <span className="font-semibold">Laboratório:</span> {m.laboratorio}
            </div>
            <div className="flex items-center gap-1.5">
              <FileText size={12} className="text-sky-600" />
              <span className="font-semibold">Amostra:</span> {m.numero_laudo}
            </div>
            {m.fazenda && (
              <div className="col-span-2">
                <span className="font-semibold">Fazenda:</span> {m.fazenda}
              </div>
            )}
            <div>
              <span className="font-semibold">Data análise:</span> {m.data_analise}
            </div>
            <div>
              <span className="font-semibold">Campos extraídos:</span> {Object.keys(parsed.alimento).length}
            </div>
          </div>
          <div className="mt-2.5 text-[11px] text-gray-600 flex flex-wrap gap-x-3 gap-y-1 font-mono">
            {parsed.alimento.ms     != null && <span>MS {(parsed.alimento.ms*100).toFixed(1)}%</span>}
            {parsed.alimento.pb     != null && <span>PB {(parsed.alimento.pb*100).toFixed(1)}%</span>}
            {parsed.alimento.fdn    != null && <span>FDN {(parsed.alimento.fdn*100).toFixed(1)}%</span>}
            {parsed.alimento.amido  != null && <span>Amido {(parsed.alimento.amido*100).toFixed(1)}%</span>}
            {parsed.alimento.ee     != null && <span>EE {(parsed.alimento.ee*100).toFixed(1)}%</span>}
            {parsed.alimento.cinza  != null && <span>Cinza {(parsed.alimento.cinza*100).toFixed(1)}%</span>}
            {parsed.alimento.lignin != null && <span>Lig {(parsed.alimento.lignin*100).toFixed(1)}%</span>}
            {parsed.alimento.ivndfd48 != null && (
              <span className="text-sky-700 font-semibold">
                DFND 48h {parsed.alimento.ivndfd48.toFixed(1)}%
              </span>
            )}
          </div>
          {parsed.warnings.length > 0 && (
            <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              {parsed.warnings.map((w, i) => (
                <div key={i} className="flex gap-1"><AlertTriangle size={11} className="flex-shrink-0 mt-0.5" /> {w}</div>
              ))}
            </div>
          )}
        </div>

        {/* Busca de template */}
        <div className="p-4 border-b border-gray-100">
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
            Selecione o alimento base do banco NASEM
            {parsed.tipoSugerido && (
              <span className="ml-2 text-gray-500 font-normal">
                (filtrado por tipo: {TIPO_LABEL[parsed.tipoSugerido]})
              </span>
            )}
          </label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Digite o nome do alimento..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="max-h-[320px] overflow-y-auto">
          {resultados.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Nenhum alimento encontrado para "{query}".
            </div>
          )}
          {resultados.map(a => (
            <button
              key={a.id ?? a.nome}
              onClick={() => onConfirmar(parsed, a)}
              className="w-full text-left px-5 py-3 hover:bg-sky-50 border-b border-gray-50 flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-800 group-hover:text-sky-700 truncate">{a.nome}</div>
                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
                  <span>{a.classificacao}</span>
                  <span className="text-gray-300">·</span>
                  <span>PB {a.pb !== null ? (a.pb * 100).toFixed(1) + '%' : '—'}</span>
                  <span className="text-gray-300">·</span>
                  <span>FDN {a.fdn !== null ? (a.fdn * 100).toFixed(1) + '%' : '—'}</span>
                </div>
              </div>
              <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${tipoBg(a.tipo)}`}>
                {a.tipo}
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center p-4 border-t border-gray-100">
          <button
            onClick={() => { setParsed(null); setQuery(''); }}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            ← Voltar
          </button>
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
