import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useDieta } from '../context/DietaContext';
import type { Alimento } from '../types';

const CAMPOS_FRACAO = new Set<keyof Alimento>([
  'ms', 'pb', 'pndr', 'fdn', 'fda', 'ndt', 'ee', 'cinza', 'amido', 'mn8', 'mn19',
  'ca', 'p', 'mg', 'k', 's', 'na', 'cl',
]);

function toDisplay(a: Alimento): Alimento {
  const d = { ...a };
  for (const key of CAMPOS_FRACAO) {
    const v = d[key];
    if (v !== null && typeof v === 'number')
      (d as Record<string, unknown>)[key] = parseFloat((v * 100).toFixed(4));
  }
  return d;
}

function toStore(a: Alimento): Alimento {
  const d = { ...a };
  for (const key of CAMPOS_FRACAO) {
    const v = d[key];
    if (v !== null && typeof v === 'number')
      (d as Record<string, unknown>)[key] = parseFloat((v / 100).toFixed(6));
  }
  return d;
}

const ALIMENTO_VAZIO: Alimento = {
  nome: '', custo: null, classificacao: 'Energético', tipo: 'C',
  ms: 0.88, pb: 0, pdr: null, pndr: null, fdn: null, efdn: null,
  mn8: null, mn19: null, fdnf: null, fda: null, nel: null, ndt: null,
  ee: null, ee_insat: null, cinza: null, cnf: null, amido: null, kd_amido: null,
  met: null, lys: null, ca: null, p: null, mg: null, k: null, s: null,
  na: null, cl: null, co: null, cu: null, mn_min: null, zn: null, se: null,
  i: null, fe: null, vit_a: null, vit_d3: null, vit_e: null,
  biotina: null, monensina: null, cr: null, levedura: null,
  prot_a: null, prot_b: null, prot_c: null, kd_prot: null,
  rup_digest: null, cp_digest: null, ndf_digest: null, fat_digest: null,
  lisina_pct: null, met_pct: null,
};

function Campo({ label, valor, onChange, tipo = 'number', opcoes }: {
  label: string; valor: unknown;
  onChange: (v: unknown) => void; tipo?: string; opcoes?: string[];
}) {
  // For numeric fields, keep a local string state so commas/trailing dots aren't lost
  const [localStr, setLocalStr] = useState<string | null>(null);

  if (tipo === 'select' && opcoes) {
    return (
      <div className="flex flex-col gap-0.5">
        <label className="text-xs text-gray-500">{label}</label>
        <select value={String(valor ?? '')} onChange={e => onChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500">
          {opcoes.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  if (tipo === 'number') {
    // Display: if user is mid-typing use localStr, otherwise show the numeric value
    const displayValue = localStr !== null
      ? localStr
      : (valor === null || valor === undefined ? '' : String(valor));

    return (
      <div className="flex flex-col gap-0.5">
        <label className="text-xs text-gray-500">{label}</label>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          placeholder="—"
          onFocus={e => { setLocalStr(null); e.target.select(); }}
          onBlur={() => setLocalStr(null)}
          onChange={e => {
            const raw = e.target.value;
            setLocalStr(raw);
            if (raw === '' || raw === '-') {
              onChange(raw === '' ? null : raw);
              return;
            }
            // Accept both comma and dot as decimal separator
            const normalized = raw.replace(',', '.');
            const parsed = parseFloat(normalized);
            if (!isNaN(parsed)) onChange(parsed);
          }}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 w-full tabular-nums"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs text-gray-500">{label}</label>
      <input type={tipo} value={valor === null || valor === undefined ? '' : String(valor)}
        onChange={e => onChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 w-full tabular-nums"
      />
    </div>
  );
}

function FormAlimento({ inicial, onSalvar, onCancelar }: {
  inicial: Alimento; onSalvar: (a: Alimento) => void; onCancelar: () => void;
}) {
  const [form, setForm] = useState<Alimento>(() => toDisplay(inicial));
  const set = (key: keyof Alimento) => (v: unknown) => setForm(f => ({ ...f, [key]: v }));
  const campos: { label: string; key: keyof Alimento; tipo?: string; opcoes?: string[] }[] = [
    { label: 'Nome', key: 'nome', tipo: 'text' },
    { label: 'Custo R$/kg MN', key: 'custo' },
    { label: 'Classificação', key: 'classificacao', tipo: 'select', opcoes: ['Energético', 'Proteico', 'Volumoso', 'Mineral', 'Aditivo', 'Outro'] },
    { label: 'Tipo', key: 'tipo', tipo: 'select', opcoes: ['C', 'F', 'M'] },
    { label: 'MS %', key: 'ms' },
    { label: 'PB %', key: 'pb' },
    { label: 'PNDR %', key: 'pndr' },
    { label: 'FDN %', key: 'fdn' },
    { label: 'FDA %', key: 'fda' },
    { label: 'NEl Mcal/kg', key: 'nel' },
    { label: 'NDT %', key: 'ndt' },
    { label: 'EE %', key: 'ee' },
    { label: 'Cinzas %', key: 'cinza' },
    { label: 'Amido %', key: 'amido' },
    { label: 'kd Amido %/h', key: 'kd_amido' },
    { label: 'mn8 %', key: 'mn8' },
    { label: 'mn19 %', key: 'mn19' },
    { label: 'Ca %', key: 'ca' },
    { label: 'P %', key: 'p' },
    { label: 'Mg %', key: 'mg' },
    { label: 'K %', key: 'k' },
    { label: 'S %', key: 's' },
    { label: 'Na %', key: 'na' },
    { label: 'Cl %', key: 'cl' },
    { label: 'Co mg/kg', key: 'co' },
    { label: 'Cu mg/kg', key: 'cu' },
    { label: 'Mn mg/kg', key: 'mn_min' },
    { label: 'Zn mg/kg', key: 'zn' },
    { label: 'Se mg/kg', key: 'se' },
    { label: 'I mg/kg', key: 'i' },
    { label: 'Fe mg/kg', key: 'fe' },
    { label: 'Vit A UI/kg', key: 'vit_a' },
    { label: 'Vit D3 UI/kg', key: 'vit_d3' },
    { label: 'Vit E UI/kg', key: 'vit_e' },
    { label: 'Biotina mg/kg', key: 'biotina' },
    { label: 'Monensina mg/kg', key: 'monensina' },
    { label: 'Cr mg/kg', key: 'cr' },
    { label: 'Levedura UFC/kg', key: 'levedura' },
  ];
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-800">{inicial.nome ? 'Editar Alimento' : 'Novo Alimento'}</h2>
          <button onClick={onCancelar} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
          {campos.map(c => (
            <Campo key={c.key} label={c.label} valor={form[c.key]}
              onChange={set(c.key)} tipo={c.tipo} opcoes={c.opcoes} />
          ))}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button onClick={onCancelar} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={() => form.nome ? onSalvar(toStore(form)) : alert('Nome obrigatório')}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
            <Check size={15} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// Helpers
const pct  = (v: number | null) => v !== null ? (v * 100).toFixed(2) : '—';
const pct1 = (v: number | null) => v !== null ? (v * 100).toFixed(1)  : '—';
const mg   = (v: number | null) => v !== null ? v.toFixed(1)           : '—';
const num  = (v: number | null, d = 3) => v !== null ? v.toFixed(d)   : '—';

/** PDR = armazenado ou calculado (PB - PNDR) */
const calcPDR = (a: Alimento): number | null =>
  a.pdr !== null ? a.pdr : (a.pndr !== null ? a.pb - a.pndr : null);

// Larguras fixas das colunas congeladas (devem bater com w- e left-)
const W_NOME = 180;     // px
const W_TIPO = 68;      // px
const W_ACTIONS = 72;   // px

// Altura da primeira linha do cabeçalho (grupo) — usada como offset do top da segunda linha
const H_GRUPO = 26; // px

const stickyNomeTh = `sticky left-0 z-40 bg-gray-50 w-[${W_NOME}px] min-w-[${W_NOME}px]`;

function Td({ children, align = 'right' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <td className={`px-2 py-1.5 text-xs tabular-nums text-gray-700 border-x border-gray-50 text-${align} whitespace-nowrap`}>
      {children}
    </td>
  );
}

function EscolhaDialog({
  nomeOriginal,
  onOverwrite,
  onCriarNovo,
  onCancelar,
}: {
  nomeOriginal: string;
  onOverwrite: () => void;
  onCriarNovo: (nome: string) => void;
  onCancelar: () => void;
}) {
  const [opcao, setOpcao] = useState<'overwrite' | 'novo'>('overwrite');
  const [novoNome, setNovoNome] = useState('');

  function confirmar() {
    if (opcao === 'overwrite') {
      onOverwrite();
    } else {
      const nome = novoNome.trim();
      if (!nome) { alert('Digite um nome para o novo alimento.'); return; }
      onCriarNovo(nome);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-base">Salvar alterações</h2>
          <p className="text-sm text-gray-500 mt-1">
            O que deseja fazer com as alterações em <strong className="text-gray-700">{nomeOriginal}</strong>?
          </p>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <label className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${opcao === 'overwrite' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <input type="radio" name="opcao" checked={opcao === 'overwrite'} onChange={() => setOpcao('overwrite')} className="mt-0.5 accent-green-600" />
            <div>
              <div className="text-sm font-semibold text-gray-800">Atualizar alimento existente</div>
              <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Sobrescreve <strong>{nomeOriginal}</strong> permanentemente com as novas informações. A formulação recalcula automaticamente.
              </div>
            </div>
          </label>

          <label className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${opcao === 'novo' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <input type="radio" name="opcao" checked={opcao === 'novo'} onChange={() => setOpcao('novo')} className="mt-0.5 accent-blue-600" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800">Criar novo alimento</div>
              <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Mantém o original intacto e cria uma cópia com as alterações. Na formulação, o novo substitui o anterior automaticamente.
              </div>
              {opcao === 'novo' && (
                <input
                  autoFocus
                  type="text"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmar()}
                  placeholder="Nome do novo alimento..."
                  className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onCancelar} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Cancelar
          </button>
          <button onClick={confirmar} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Alimentos() {
  const { alimentos, adicionarAlimento, editarAlimento, excluirAlimento, atualizarNomeNosSlots } = useDieta();
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'C' | 'F' | 'M'>('todos');
  const [editando, setEditando] = useState<Alimento | null>(null);
  const [novo, setNovo] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{ original: Alimento; editado: Alimento } | null>(null);

  const filtrados = alimentos.filter(a =>
    (filtroTipo === 'todos' || a.tipo === filtroTipo) &&
    a.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const tipoBg = (t: string) =>
    t === 'C' ? 'bg-blue-100 text-blue-700' :
    t === 'F' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700';

  const tipoLabel = (t: string) => t === 'C' ? 'Concentrado' : t === 'F' ? 'Forragem' : 'Mineral/Aditivo';

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      {(editando || novo) && (
        <FormAlimento
          inicial={editando ?? ALIMENTO_VAZIO}
          onSalvar={async a => {
            if (editando) {
              setPendingEdit({ original: editando, editado: a });
              setEditando(null);
            } else {
              await adicionarAlimento(a);
              setNovo(false);
            }
          }}
          onCancelar={() => { setEditando(null); setNovo(false); }}
        />
      )}

      {pendingEdit && (
        <EscolhaDialog
          nomeOriginal={pendingEdit.original.nome}
          onOverwrite={async () => {
            await editarAlimento(
              pendingEdit.original.nome,
              { ...pendingEdit.editado, nome: pendingEdit.original.nome, id: pendingEdit.original.id }
            );
            setPendingEdit(null);
          }}
          onCriarNovo={async novoNome => {
            await adicionarAlimento({ ...pendingEdit.editado, nome: novoNome, id: undefined });
            atualizarNomeNosSlots(pendingEdit.original.nome, novoNome);
            setPendingEdit(null);
          }}
          onCancelar={() => setPendingEdit(null)}
        />
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-800">🥩 Banco de Alimentos</h1>
        <button onClick={() => setNovo(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
          <Plus size={15} /> Novo Alimento
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input type="text" placeholder="Buscar..." value={busca}
          onChange={e => setBusca(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64" />
        {(['todos', 'C', 'F', 'M'] as const).map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtroTipo === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t === 'todos' ? 'Todos' : `${t === 'C' ? '🌽' : t === 'F' ? '🌾' : '🧂'} ${tipoLabel(t)}`}
          </button>
        ))}
        <span className="text-sm text-gray-400 self-center">{filtrados.length} alimentos</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* overflow-auto permite scroll em X e Y; cabeçalho e colunas ficam sticky */}
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <table className="text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              {/* ── Linha 1: Grupos ── sticky top-0 */}
              <tr>
                <th colSpan={2}
                  className={`${stickyNomeTh} text-center px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 top-0`}
                  style={{ top: 0 }}>
                  Identificação
                </th>
                {/* coluna de ações — sticky após Nome+Tipo */}
                <th style={{ top: 0, left: W_NOME + W_TIPO, minWidth: W_ACTIONS }}
                  className="sticky z-30 bg-gray-50 border-b border-gray-200" />
                {/* colunas de grupo normais */}
                {[
                  ['Base', 2], ['Energia', 5], ['Proteína', 3], ['Fibra', 4],
                  ['Gordura', 1], ['Macrominerais', 7], ['Microminerais', 7],
                  ['Vitaminas', 3], ['Aditivos', 4],
                ].map(([label, cols]) => (
                  <th key={String(label)} colSpan={Number(cols)}
                    style={{ top: 0 }}
                    className="sticky z-30 text-center px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-100 border-x border-b border-gray-200">
                    {label}
                  </th>
                ))}
              </tr>

              {/* ── Linha 2: Nomes das colunas ── sticky top-[H_GRUPO] */}
              <tr>
                {/* Nome — sticky esquerda + topo */}
                <th style={{ top: H_GRUPO, left: 0, minWidth: W_NOME }}
                  className="sticky z-40 bg-gray-50 text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap border-b border-r border-gray-200">
                  Nome
                </th>
                {/* Tipo — sticky esquerda + topo */}
                <th style={{ top: H_GRUPO, left: W_NOME, minWidth: W_TIPO }}
                  className="sticky z-40 bg-gray-50 text-center px-2 py-2 font-semibold text-gray-600 whitespace-nowrap border-b border-r border-gray-200">
                  Tipo
                </th>
                {/* Ações — sticky esquerda + topo */}
                <th style={{ top: H_GRUPO, left: W_NOME + W_TIPO, minWidth: W_ACTIONS }}
                  className="sticky z-40 bg-gray-50 text-center px-2 py-2 font-semibold text-gray-600 whitespace-nowrap border-b border-r border-gray-200">
                </th>
                {/* Demais cabeçalhos */}
                {[
                  // Base
                  'MS %', 'R$/kg',
                  // Energia
                  'NEl', 'NDT %', 'CNF %', 'Amido %', 'kd Amid',
                  // Proteína
                  'PB %', 'PDR %', 'PNDR %',
                  // Fibra
                  'FDN %', 'eFDN %', 'FDNF %', 'FDA %',
                  // Gordura
                  'EE %',
                  // Macrominerais
                  'Ca %', 'P %', 'Mg %', 'K %', 'S %', 'Na %', 'Cl %',
                  // Microminerais
                  'Co', 'Cu', 'Mn', 'Zn', 'Se', 'I', 'Fe',
                  // Vitaminas
                  'Vit A', 'Vit D3', 'Vit E',
                  // Aditivos
                  'Biotina', 'Monen.', 'Cr', 'Leved.',
                ].map(h => (
                  <th key={h} style={{ top: H_GRUPO }}
                    className="sticky z-20 bg-gray-50 text-right px-2 py-2 font-semibold text-gray-600 whitespace-nowrap border-b border-x border-gray-100">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtrados.map(a => {
                const pdr = calcPDR(a);
                return (
                  <tr key={a.nome} className="hover:bg-blue-50/20 transition-colors">
                    {/* Nome — sticky esquerda */}
                    <td style={{ left: 0, minWidth: W_NOME }}
                      className="sticky z-10 bg-white px-3 py-2 font-semibold text-gray-800 whitespace-nowrap border-b border-r border-gray-100">
                      {a.nome}
                    </td>
                    {/* Tipo — sticky esquerda */}
                    <td style={{ left: W_NOME, minWidth: W_TIPO }}
                      className="sticky z-10 bg-white px-2 py-2 text-center border-b border-r border-gray-100">
                      <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tipoBg(a.tipo)}`}>
                        {a.tipo}
                      </span>
                    </td>
                    {/* Ações — sticky esquerda */}
                    <td style={{ left: W_NOME + W_TIPO, minWidth: W_ACTIONS }}
                      className="sticky z-10 bg-white px-1 py-2 text-center border-b border-r border-gray-100">
                      <div className="flex gap-0.5 justify-center">
                        <button onClick={() => setEditando(a)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => { if (confirm(`Excluir "${a.nome}"?`)) excluirAlimento(a.nome).catch(console.error); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                    {/* Base */}
                    <Td>{pct1(a.ms)}</Td>
                    <Td>{a.custo !== null ? a.custo.toFixed(3) : '—'}</Td>
                    {/* Energia */}
                    <Td>{a.nel !== null ? num(a.nel) : a.ndt !== null ? ((0.0245 * a.ndt * 100) - 0.12).toFixed(3) : '—'}</Td>
                    <Td>{a.ndt !== null ? pct1(a.ndt) : '—'}</Td>
                    <Td>{a.cnf !== null ? pct1(a.cnf) : '—'}</Td>
                    <Td>{a.amido !== null ? pct1(a.amido) : '—'}</Td>
                    <Td>{a.kd_amido !== null ? num(a.kd_amido, 1) : '—'}</Td>
                    {/* Proteína */}
                    <Td>{pct(a.pb)}</Td>
                    <Td>{pct(pdr)}</Td>
                    <Td>{a.pndr !== null ? pct(a.pndr) : '—'}</Td>
                    {/* Fibra */}
                    <Td>{a.fdn !== null ? pct1(a.fdn) : '—'}</Td>
                    <Td>{a.efdn !== null ? pct1(a.efdn) : '—'}</Td>
                    <Td>{a.fdnf !== null ? pct1(a.fdnf) : '—'}</Td>
                    <Td>{a.fda !== null ? pct1(a.fda) : '—'}</Td>
                    {/* Gordura */}
                    <Td>{a.ee !== null ? pct1(a.ee) : '—'}</Td>
                    {/* Macrominerais */}
                    <Td>{a.ca   !== null ? pct(a.ca)   : '—'}</Td>
                    <Td>{a.p    !== null ? pct(a.p)    : '—'}</Td>
                    <Td>{a.mg   !== null ? pct(a.mg)   : '—'}</Td>
                    <Td>{a.k    !== null ? pct(a.k)    : '—'}</Td>
                    <Td>{a.s    !== null ? pct(a.s)    : '—'}</Td>
                    <Td>{a.na   !== null ? pct(a.na)   : '—'}</Td>
                    <Td>{a.cl   !== null ? pct(a.cl)   : '—'}</Td>
                    {/* Microminerais */}
                    <Td>{mg(a.co)}</Td>
                    <Td>{mg(a.cu)}</Td>
                    <Td>{mg(a.mn_min)}</Td>
                    <Td>{mg(a.zn)}</Td>
                    <Td>{mg(a.se)}</Td>
                    <Td>{mg(a.i)}</Td>
                    <Td>{mg(a.fe)}</Td>
                    {/* Vitaminas */}
                    <Td>{a.vit_a  !== null ? a.vit_a.toFixed(0)  : '—'}</Td>
                    <Td>{a.vit_d3 !== null ? a.vit_d3.toFixed(0) : '—'}</Td>
                    <Td>{a.vit_e  !== null ? a.vit_e.toFixed(1)  : '—'}</Td>
                    {/* Aditivos */}
                    <Td>{mg(a.biotina)}</Td>
                    <Td>{mg(a.monensina)}</Td>
                    <Td>{mg(a.cr)}</Td>
                    <Td>{a.levedura !== null ? a.levedura.toExponential(1) : '—'}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
