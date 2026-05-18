import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Eye, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { useDieta } from '../context/DietaContext';
import type { Alimento } from '../types';
import ModalBuscaAlimentoBase from '../components/alimentos/ModalBuscaAlimentoBase';
import ModalEdicaoAlimento from '../components/alimentos/ModalEdicaoAlimento';
import ModalVisualizacaoAlimento from '../components/alimentos/ModalVisualizacaoAlimento';
import { isAlimentoBase, origemAlimento, TIPO_LABEL } from '../components/alimentos/utils';

// ───── Helpers ──────────────────────────────────────────────────────────────
const pct  = (v: number | null | undefined) => v !== null && v !== undefined ? (v * 100).toFixed(2) : '—';
const pct1 = (v: number | null | undefined) => v !== null && v !== undefined ? (v * 100).toFixed(1) : '—';
const mg   = (v: number | null | undefined) => v !== null && v !== undefined ? v.toFixed(1) : '—';
const num  = (v: number | null | undefined, d = 3) => v !== null && v !== undefined ? v.toFixed(d) : '—';

/** PDR = armazenado ou calculado (PB - PNDR) */
const calcPDR = (a: Alimento): number | null =>
  a.pdr !== null ? a.pdr : (a.pndr !== null ? a.pb - a.pndr : null);

// ───── Estrutura de grupos da tabela ───────────────────────────────────────
type ColDef = { label: string; render: (a: Alimento) => React.ReactNode };
type GrupoCols = { label: string; cols: ColDef[] };

const GRUPOS: GrupoCols[] = [
  { label: 'Base', cols: [
    { label: 'MS %',   render: a => pct1(a.ms) },
    { label: 'R$/kg',  render: a => a.custo !== null ? a.custo.toFixed(3) : '—' },
  ]},
  { label: 'Energia', cols: [
    { label: 'NEl',     render: a => a.nel !== null ? num(a.nel) : a.ndt !== null ? ((0.0245 * a.ndt * 100) - 0.12).toFixed(3) : '—' },
    { label: 'NDT %',   render: a => a.ndt !== null ? pct1(a.ndt) : '—' },
    { label: 'CNF %',   render: a => a.cnf !== null ? pct1(a.cnf) : '—' },
    { label: 'Amido %', render: a => a.amido !== null ? pct1(a.amido) : '—' },
    { label: 'kd Amid', render: a => a.kd_amido !== null ? num(a.kd_amido, 1) : '—' },
  ]},
  { label: 'Proteína', cols: [
    { label: 'PB %',   render: a => pct(a.pb) },
    { label: 'PDR %',  render: a => pct(calcPDR(a)) },
    { label: 'PNDR %', render: a => a.pndr !== null ? pct(a.pndr) : '—' },
  ]},
  { label: 'Fibra', cols: [
    { label: 'FDN %',  render: a => a.fdn !== null ? pct1(a.fdn) : '—' },
    { label: 'eFDN %', render: a => a.efdn !== null ? pct1(a.efdn) : '—' },
    { label: 'FDNF %', render: a => a.fdnf !== null ? pct1(a.fdnf) : '—' },
    { label: 'FDA %',  render: a => a.fda !== null ? pct1(a.fda) : '—' },
  ]},
  { label: 'Gordura', cols: [
    { label: 'EE %', render: a => a.ee !== null ? pct1(a.ee) : '—' },
  ]},
  { label: 'Macrominerais', cols: [
    { label: 'Ca %', render: a => a.ca !== null ? pct(a.ca) : '—' },
    { label: 'P %',  render: a => a.p  !== null ? pct(a.p)  : '—' },
    { label: 'Mg %', render: a => a.mg !== null ? pct(a.mg) : '—' },
    { label: 'K %',  render: a => a.k  !== null ? pct(a.k)  : '—' },
    { label: 'S %',  render: a => a.s  !== null ? pct(a.s)  : '—' },
    { label: 'Na %', render: a => a.na !== null ? pct(a.na) : '—' },
    { label: 'Cl %', render: a => a.cl !== null ? pct(a.cl) : '—' },
  ]},
  { label: 'Microminerais', cols: [
    { label: 'Co', render: a => mg(a.co) },
    { label: 'Cu', render: a => mg(a.cu) },
    { label: 'Mn', render: a => mg(a.mn_min) },
    { label: 'Zn', render: a => mg(a.zn) },
    { label: 'Se', render: a => mg(a.se) },
    { label: 'I',  render: a => mg(a.i) },
    { label: 'Fe', render: a => mg(a.fe) },
  ]},
  { label: 'Vitaminas', cols: [
    { label: 'Vit A',  render: a => a.vit_a  !== null ? a.vit_a.toFixed(0)  : '—' },
    { label: 'Vit D3', render: a => a.vit_d3 !== null ? a.vit_d3.toFixed(0) : '—' },
    { label: 'Vit E',  render: a => a.vit_e  !== null ? a.vit_e.toFixed(1)  : '—' },
  ]},
  { label: 'Aditivos', cols: [
    { label: 'Biotina', render: a => mg(a.biotina) },
    { label: 'Monen.',  render: a => mg(a.monensina) },
    { label: 'Cr',      render: a => mg(a.cr) },
    { label: 'Leved.',  render: a => a.levedura !== null ? a.levedura.toExponential(1) : '—' },
  ]},
];

// Larguras fixas das colunas congeladas
const W_NOME = 220;
const W_TIPO = 68;
const W_ACTIONS = 110;
const H_GRUPO = 30;

function Td({ children, align = 'right' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  return (
    <td className={`px-2 py-1.5 text-xs tabular-nums text-gray-700 border-x border-gray-50 text-${align} whitespace-nowrap`}>
      {children}
    </td>
  );
}

function BadgeOrigem({ alimento }: { alimento: Alimento }) {
  const origem = origemAlimento(alimento);
  if (origem === 'nasem') {
    return <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">NASEM 2021</span>;
  }
  return <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">Customizado</span>;
}

// ───────────────────────────────────────────────────────────────────────────

export default function Alimentos() {
  const { alimentos, adicionarAlimento, editarAlimento, excluirAlimento, atualizarNomeNosSlots } = useDieta();

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'C' | 'F' | 'M'>('todos');
  const [filtroOrigem, setFiltroOrigem] = useState<'todos' | 'nasem' | 'customizado'>('todos');

  // Estado dos grupos (todos abertos por padrão)
  const [grupoAberto, setGrupoAberto] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GRUPOS.map(g => [g.label, true]))
  );
  function toggleGrupo(label: string) {
    setGrupoAberto(prev => ({ ...prev, [label]: !(prev[label] ?? true) }));
  }

  // Modais
  const [mostrandoBusca, setMostrandoBusca] = useState(false);
  const [visualizando, setVisualizando] = useState<Alimento | null>(null);
  const [editando, setEditando] = useState<{ alimento: Alimento; modo: 'clone' | 'editar' } | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const filtrados = useMemo(() => alimentos.filter(a => {
    if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) return false;
    if (filtroOrigem === 'nasem' && !isAlimentoBase(a)) return false;
    if (filtroOrigem === 'customizado' && isAlimentoBase(a)) return false;
    if (busca && !a.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  }), [alimentos, busca, filtroTipo, filtroOrigem]);

  const tipoBg = (t: string) =>
    t === 'C' ? 'bg-blue-100 text-blue-700' :
    t === 'F' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700';

  // ───── Handlers ──────────────────────────────────────────────────────────
  function handleBuscaSelecionou(base: Alimento) {
    setMostrandoBusca(false);
    setEditando({ alimento: base, modo: 'clone' });
  }
  function handleUsarComoBase(a: Alimento) {
    setVisualizando(null);
    setEditando({ alimento: a, modo: 'clone' });
  }
  function handleEditar(a: Alimento) { setEditando({ alimento: a, modo: 'editar' }); }
  function handleExcluir(a: Alimento) {
    if (!confirm(`Excluir "${a.nome}"?`)) return;
    excluirAlimento(a.nome).catch(console.error);
  }
  async function handleSalvar(persistido: Alimento, baseNome: string | null) {
    if (!editando) return;
    if (editando.modo === 'clone') {
      await adicionarAlimento({ ...persistido, id: undefined });
      showToast(baseNome
        ? `✅ Alimento "${persistido.nome}" salvo. Frações proteicas baseadas em: ${baseNome}.`
        : `✅ Alimento "${persistido.nome}" salvo.`);
    } else {
      const nomeAntigo = editando.alimento.nome;
      await editarAlimento(nomeAntigo, persistido);
      if (nomeAntigo !== persistido.nome) atualizarNomeNosSlots(nomeAntigo, persistido.nome);
      showToast(`✅ Alimento "${persistido.nome}" atualizado.`);
    }
    setEditando(null);
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]">
          <div className="bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl">
            {toast}
          </div>
        </div>
      )}

      {mostrandoBusca && (
        <ModalBuscaAlimentoBase
          alimentos={alimentos}
          onSelecionar={handleBuscaSelecionou}
          onCancelar={() => setMostrandoBusca(false)}
        />
      )}

      {visualizando && (
        <ModalVisualizacaoAlimento
          alimento={visualizando}
          onUsarComoBase={handleUsarComoBase}
          onFechar={() => setVisualizando(null)}
        />
      )}

      {editando && (
        <ModalEdicaoAlimento
          alimentoBase={editando.alimento}
          modo={editando.modo}
          alimentos={alimentos}
          onSalvar={handleSalvar}
          onFechar={() => setEditando(null)}
        />
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-800">🥩 Banco de Alimentos</h1>
        <button
          onClick={() => setMostrandoBusca(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={15} /> Adicionar alimento
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full md:w-64"
        />
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap gap-1">
            {([
              ['todos', 'Todos'],
              ['F', '🌾 Forragem'],
              ['C', '🌽 Concentrado'],
              ['M', '🧂 Mineral/Aditivo'],
            ] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setFiltroTipo(v as typeof filtroTipo)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filtroTipo === v ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="w-px bg-gray-200 mx-1 my-1" />
          <div className="flex flex-wrap gap-1">
            {([
              ['todos', 'Todas origens'],
              ['nasem', 'NASEM 2021'],
              ['customizado', 'Customizado'],
            ] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setFiltroOrigem(v as typeof filtroOrigem)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filtroOrigem === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <span className="text-sm text-gray-400 self-center ml-auto">
          {filtrados.length} alimento{filtrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
          <table className="text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              {/* Linha 1: Grupos (clicáveis para sanfona) */}
              <tr>
                <th colSpan={2}
                  style={{ top: 0, left: 0, minWidth: W_NOME + W_TIPO }}
                  className="sticky z-50 bg-gray-50 text-center px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">
                  Identificação
                </th>
                <th style={{ top: 0, left: W_NOME + W_TIPO, minWidth: W_ACTIONS }}
                  className="sticky z-50 bg-gray-50 border-b border-r border-gray-200" />
                {GRUPOS.map(g => {
                  const aberto = grupoAberto[g.label] ?? true;
                  const colSpan = aberto ? g.cols.length : 1;
                  return (
                    <th
                      key={g.label}
                      colSpan={colSpan}
                      style={{ top: 0 }}
                      onClick={() => toggleGrupo(g.label)}
                      className="sticky z-30 cursor-pointer select-none px-2 py-1 text-[10px] font-bold text-gray-600 uppercase tracking-wider bg-gray-100 hover:bg-gray-200 border-x border-b border-gray-200 transition-colors"
                      title={aberto ? 'Clique para fechar' : 'Clique para abrir'}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {aberto ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        {g.label}
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* Linha 2: Subcolunas (só renderiza se grupo aberto) */}
              <tr>
                <th style={{ top: H_GRUPO, left: 0, minWidth: W_NOME }}
                  className="sticky z-40 bg-gray-50 text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap border-b border-r border-gray-200">
                  Nome
                </th>
                <th style={{ top: H_GRUPO, left: W_NOME, minWidth: W_TIPO }}
                  className="sticky z-40 bg-gray-50 text-center px-2 py-2 font-semibold text-gray-600 whitespace-nowrap border-b border-r border-gray-200">
                  Tipo
                </th>
                <th style={{ top: H_GRUPO, left: W_NOME + W_TIPO, minWidth: W_ACTIONS }}
                  className="sticky z-40 bg-gray-50 text-center px-2 py-2 font-semibold text-gray-600 whitespace-nowrap border-b border-r border-gray-200">
                  Ações
                </th>
                {GRUPOS.flatMap(g => {
                  const aberto = grupoAberto[g.label] ?? true;
                  if (!aberto) {
                    return [
                      <th key={g.label + '_placeholder'} style={{ top: H_GRUPO, width: 32, minWidth: 32 }}
                        className="sticky z-20 bg-gray-50 text-center text-gray-300 border-b border-x border-gray-100">
                        —
                      </th>
                    ];
                  }
                  return g.cols.map(c => (
                    <th key={g.label + '_' + c.label} style={{ top: H_GRUPO }}
                      className="sticky z-20 bg-gray-50 text-right px-2 py-2 font-semibold text-gray-600 whitespace-nowrap border-b border-x border-gray-100">
                      {c.label}
                    </th>
                  ));
                })}
              </tr>
            </thead>

            <tbody>
              {filtrados.map(a => {
                const ehBase = isAlimentoBase(a);
                return (
                  <tr key={a.id ?? a.nome} className="hover:bg-blue-50/20 transition-colors">
                    <td style={{ left: 0, minWidth: W_NOME }}
                      className="sticky z-10 bg-white px-3 py-2 border-b border-r border-gray-100">
                      <div className="font-semibold text-gray-800 whitespace-nowrap">{a.nome}</div>
                      <div className="mt-0.5"><BadgeOrigem alimento={a} /></div>
                    </td>
                    <td style={{ left: W_NOME, minWidth: W_TIPO }}
                      className="sticky z-10 bg-white px-2 py-2 text-center border-b border-r border-gray-100">
                      <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tipoBg(a.tipo)}`} title={TIPO_LABEL[a.tipo]}>
                        {a.tipo}
                      </span>
                    </td>
                    <td style={{ left: W_NOME + W_TIPO, minWidth: W_ACTIONS }}
                      className="sticky z-10 bg-white px-1 py-2 text-center border-b border-r border-gray-100">
                      <div className="flex gap-0.5 justify-center">
                        <button
                          onClick={() => setVisualizando(a)}
                          title="Ver detalhes"
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => setEditando({ alimento: a, modo: 'clone' })}
                          title="Usar como base"
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        >
                          <Copy size={13} />
                        </button>
                        {!ehBase && (
                          <>
                            <button
                              onClick={() => handleEditar(a)}
                              title="Editar"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleExcluir(a)}
                              title="Excluir"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    {GRUPOS.flatMap(g => {
                      const aberto = grupoAberto[g.label] ?? true;
                      if (!aberto) {
                        return [<Td key={g.label + '_placeholder'}><span className="text-gray-300">—</span></Td>];
                      }
                      return g.cols.map(c => (
                        <Td key={g.label + '_' + c.label}>{c.render(a)}</Td>
                      ));
                    })}
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
