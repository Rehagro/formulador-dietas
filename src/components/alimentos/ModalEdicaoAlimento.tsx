import { useMemo, useState, type ReactNode } from 'react';
import { X, Check, ChevronDown, ChevronUp, Lock, Info } from 'lucide-react';
import type { Alimento } from '../../types';
import { toDisplay, toStore, classificacoesDistintas, fmtLock, TIPO_LABEL } from './utils';

interface Props {
  alimentoBase: Alimento;
  modo: 'clone' | 'editar';
  alimentos: Alimento[];
  onSalvar: (a: Alimento, baseNome: string | null) => void | Promise<void>;
  onFechar: () => void;
}

// ───────────────────────────────────────────────────────────────────────────
// Componentes internos
// ───────────────────────────────────────────────────────────────────────────

interface GrupoProps {
  titulo: string;
  defaultOpen?: boolean;
  badge?: string;
  destaque?: 'lock' | null;
  children: ReactNode;
}
function Grupo({ titulo, defaultOpen = false, badge, destaque, children }: GrupoProps) {
  const [aberto, setAberto] = useState(defaultOpen);
  return (
    <div className={`border rounded-xl overflow-hidden ${destaque === 'lock' ? 'border-gray-300' : 'border-gray-200'}`}>
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
          destaque === 'lock' ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          {titulo}
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {badge}
            </span>
          )}
        </span>
        {aberto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {aberto && <div className={`p-4 ${destaque === 'lock' ? 'bg-gray-50' : 'bg-white'}`}>{children}</div>}
    </div>
  );
}

function CampoEdit({
  label, valor, onChange, sufixo,
}: {
  label: string;
  valor: number | string | null | undefined;
  onChange: (v: number | string | null) => void;
  sufixo?: string;
}) {
  const [localStr, setLocalStr] = useState<string | null>(null);
  const display = localStr !== null ? localStr : (valor === null || valor === undefined ? '' : String(valor));

  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[11px] font-medium text-gray-500">
        {label}{sufixo && <span className="text-gray-400 font-normal"> {sufixo}</span>}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={display}
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
          const norm = raw.replace(',', '.');
          const parsed = parseFloat(norm);
          if (!isNaN(parsed)) onChange(parsed);
        }}
        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm tabular-nums bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  );
}

function CampoLock({
  label, valor, sufixo,
}: {
  label: string;
  valor: number | null | undefined;
  sufixo?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
        <Lock size={10} className="text-gray-400" />
        {label}{sufixo && <span className="text-gray-400 font-normal"> {sufixo}</span>}
      </label>
      <div className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm tabular-nums bg-gray-100 text-gray-700">
        {fmtLock(valor as number | null | undefined)}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Modal principal
// ───────────────────────────────────────────────────────────────────────────

export default function ModalEdicaoAlimento({
  alimentoBase, modo, alimentos, onSalvar, onFechar,
}: Props) {
  const baseNome = alimentoBase.nome;
  const isClone = modo === 'clone';

  // Form em formato display (frações como % 0-100)
  const [form, setForm] = useState<Alimento>(() => {
    const inicial = toDisplay(alimentoBase);
    if (isClone) {
      return {
        ...inicial,
        id: undefined,
        nome: `Cópia de ${alimentoBase.nome}`,
        custo: null,
        alimento_base: alimentoBase.nome,
      };
    }
    return inicial;
  });

  const [erroNome, setErroNome] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const set = (key: keyof Alimento) => (v: unknown) =>
    setForm(f => ({ ...f, [key]: v }));

  const classificacoes = useMemo(() => {
    const conjunto = new Set(classificacoesDistintas(alimentos));
    if (form.classificacao) conjunto.add(form.classificacao);
    return [...conjunto].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [alimentos, form.classificacao]);

  function validarNomeUnico(nome: string): string | null {
    const limpo = nome.trim();
    if (!limpo) return 'O nome é obrigatório.';
    // Em modo edição, ignora o próprio id
    const conflito = alimentos.find(a =>
      a.nome.trim().toLowerCase() === limpo.toLowerCase() && a.id !== form.id
    );
    if (conflito) return 'Já existe um alimento com este nome. Escolha outro nome.';
    return null;
  }

  async function handleSalvar() {
    const erro = validarNomeUnico(form.nome);
    if (erro) { setErroNome(erro); return; }
    setErroNome(null);
    setSalvando(true);
    try {
      // Garante que frações proteicas vêm do alimento base (lock)
      const persistido: Alimento = toStore({
        ...form,
        prot_a: alimentoBase.prot_a,
        prot_b: alimentoBase.prot_b,
        prot_c: alimentoBase.prot_c,
        kd_prot: alimentoBase.kd_prot,
        rup_digest: alimentoBase.rup_digest,
        ivndfd48: alimentoBase.ivndfd48 ?? null,
        fonte_nasem: alimentoBase.fonte_nasem ?? null,
        alimento_base: isClone ? alimentoBase.nome : (form.alimento_base ?? null),
      });
      await onSalvar(persistido, isClone ? alimentoBase.nome : (form.alimento_base ?? null));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-lg">
            {isClone ? 'Novo alimento (cópia)' : 'Editar alimento'}
          </h2>
          <button onClick={onFechar} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Body — 9 grupos */}
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">

          {/* Grupo 1 — Identificação */}
          <Grupo titulo="1. Identificação" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-[11px] font-medium text-gray-500">Nome do alimento *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => { set('nome')(e.target.value); setErroNome(null); }}
                  className={`mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 ${
                    erroNome ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-green-500'
                  }`}
                />
                {erroNome && <div className="text-xs text-red-600 mt-1">{erroNome}</div>}
                {!isClone && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                    Alterar o nome pode desvincular este alimento de dietas salvas anteriormente.
                  </div>
                )}
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500">Classificação</label>
                <select
                  value={form.classificacao}
                  onChange={e => set('classificacao')(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {classificacoes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={e => set('tipo')(e.target.value as 'C' | 'F' | 'M')}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="F">Forragem (F)</option>
                  <option value="C">Concentrado (C)</option>
                  <option value="M">Mineral/Aditivo (M)</option>
                </select>
              </div>
              <div>
                <CampoEdit label="Custo" sufixo="R$/kg MN" valor={form.custo} onChange={v => set('custo')(v)} />
              </div>
            </div>
          </Grupo>

          {/* Grupo 2 — Energia e Proteína Principal */}
          <Grupo titulo="2. Energia e Proteína Principal" defaultOpen>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CampoEdit label="MS"        sufixo="%"        valor={form.ms}       onChange={set('ms')} />
              <CampoEdit label="PB"        sufixo="% MS"     valor={form.pb}       onChange={set('pb')} />
              <CampoEdit label="NDT"       sufixo="% MS"     valor={form.ndt}      onChange={set('ndt')} />
              <CampoEdit label="NEL"       sufixo="Mcal/kg"  valor={form.nel}      onChange={set('nel')} />
              <CampoEdit label="DE base"   sufixo="Mcal/kg"  valor={form.de_base}  onChange={set('de_base')} />
              <CampoEdit label="EE"        sufixo="% MS"     valor={form.ee}       onChange={set('ee')} />
              <CampoEdit label="Cinza"     sufixo="% MS"     valor={form.cinza}    onChange={set('cinza')} />
              <CampoEdit label="Amido"     sufixo="% MS"     valor={form.amido}    onChange={set('amido')} />
              <CampoEdit label="kd Amido"  sufixo="%/h"      valor={form.kd_amido} onChange={set('kd_amido')} />
              <CampoEdit label="WSC"       sufixo="% MS"     valor={form.wsc}      onChange={set('wsc')} />
            </div>
          </Grupo>

          {/* Grupo 3 — Fibra */}
          <Grupo titulo="3. Fibra e Estrutura Física">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CampoEdit label="FDN"       sufixo="% MS" valor={form.fdn}      onChange={set('fdn')} />
              <CampoEdit label="eFDN"      sufixo="% MS" valor={form.efdn}     onChange={set('efdn')} />
              <CampoEdit label="FDNF"      sufixo="% MS" valor={form.fdnf}     onChange={set('fdnf')} />
              <CampoEdit label="FDA"       sufixo="% MS" valor={form.fda}      onChange={set('fda')} />
              <CampoEdit label="Lignina"   sufixo="% MS" valor={form.lignin}   onChange={set('lignin')} />
              <CampoEdit label="EE Insat"  sufixo="% MS" valor={form.ee_insat} onChange={set('ee_insat')} />
            </div>
          </Grupo>

          {/* Grupo 4 — Frações Proteicas (LOCK) */}
          <Grupo titulo="4. Frações Proteicas 🔒" badge="NASEM 2021" destaque="lock">
            <div className="flex items-start gap-2 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <div>
                Valores herdados de <strong>{baseNome}</strong> — NASEM 2021.
                Necessários para o cálculo de proteína metabolizável. Não editáveis.
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CampoLock label="Fração A"            sufixo="%PB"  valor={alimentoBase.prot_a} />
              <CampoLock label="Fração B"            sufixo="%PB"  valor={alimentoBase.prot_b} />
              <CampoLock label="Fração C"            sufixo="%PB"  valor={alimentoBase.prot_c} />
              <CampoLock label="Kd (Fração B)"       sufixo="%/h"  valor={alimentoBase.kd_prot} />
              <CampoLock label="Digest. intestinal RUP" sufixo="%" valor={alimentoBase.rup_digest !== null && alimentoBase.rup_digest !== undefined ? alimentoBase.rup_digest * 100 : null} />
              <CampoLock label="IVNDFD48"            sufixo="%FDN" valor={alimentoBase.ivndfd48} />
              <CampoLock label="Prot. Solúvel"       sufixo="%PB"  valor={alimentoBase.soluble_protein !== null && alimentoBase.soluble_protein !== undefined ? alimentoBase.soluble_protein * 100 : null} />
              <CampoLock label="ADIP"                sufixo="% MS" valor={alimentoBase.adip !== null && alimentoBase.adip !== undefined ? alimentoBase.adip * 100 : null} />
              <CampoLock label="NDIP"                sufixo="% MS" valor={alimentoBase.ndip !== null && alimentoBase.ndip !== undefined ? alimentoBase.ndip * 100 : null} />
            </div>
          </Grupo>

          {/* Grupo 5 — Aminoácidos */}
          <Grupo titulo="5. Aminoácidos">
            <div className="grid grid-cols-2 gap-3">
              <CampoEdit label="Metionina" sufixo="% MS" valor={form.met} onChange={set('met')} />
              <CampoEdit label="Lisina"    sufixo="% MS" valor={form.lys} onChange={set('lys')} />
            </div>
          </Grupo>

          {/* Grupo 6 — Macrominerais */}
          <Grupo titulo="6. Macrominerais">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CampoEdit label="Cálcio"    sufixo="% MS" valor={form.ca} onChange={set('ca')} />
              <CampoEdit label="Fósforo"   sufixo="% MS" valor={form.p}  onChange={set('p')} />
              <CampoEdit label="Magnésio"  sufixo="% MS" valor={form.mg} onChange={set('mg')} />
              <CampoEdit label="Potássio"  sufixo="% MS" valor={form.k}  onChange={set('k')} />
              <CampoEdit label="Enxofre"   sufixo="% MS" valor={form.s}  onChange={set('s')} />
              <CampoEdit label="Sódio"     sufixo="% MS" valor={form.na} onChange={set('na')} />
              <CampoEdit label="Cloro"     sufixo="% MS" valor={form.cl} onChange={set('cl')} />
            </div>
          </Grupo>

          {/* Grupo 7 — Microminerais */}
          <Grupo titulo="7. Microminerais">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CampoEdit label="Cobalto"   sufixo="mg/kg" valor={form.co}      onChange={set('co')} />
              <CampoEdit label="Cobre"     sufixo="mg/kg" valor={form.cu}      onChange={set('cu')} />
              <CampoEdit label="Manganês"  sufixo="mg/kg" valor={form.mn_min}  onChange={set('mn_min')} />
              <CampoEdit label="Zinco"     sufixo="mg/kg" valor={form.zn}      onChange={set('zn')} />
              <CampoEdit label="Selênio"   sufixo="mg/kg" valor={form.se}      onChange={set('se')} />
              <CampoEdit label="Iodo"      sufixo="mg/kg" valor={form.i}       onChange={set('i')} />
              <CampoEdit label="Ferro"     sufixo="mg/kg" valor={form.fe}      onChange={set('fe')} />
              <CampoEdit label="Molibdênio" sufixo="mg/kg" valor={form.mo}     onChange={set('mo')} />
            </div>
          </Grupo>

          {/* Grupo 8 — Vitaminas e Aditivos */}
          <Grupo titulo="8. Vitaminas e Aditivos">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CampoEdit label="Vitamina A"  sufixo="UI/kg"  valor={form.vit_a}     onChange={set('vit_a')} />
              <CampoEdit label="Vitamina D3" sufixo="UI/kg"  valor={form.vit_d3}    onChange={set('vit_d3')} />
              <CampoEdit label="Vitamina E"  sufixo="UI/kg"  valor={form.vit_e}     onChange={set('vit_e')} />
              <CampoEdit label="Biotina"     sufixo="mg/kg"  valor={form.biotina}   onChange={set('biotina')} />
              <CampoEdit label="Monensina"   sufixo="mg/kg"  valor={form.monensina} onChange={set('monensina')} />
              <CampoEdit label="Cromo"       sufixo="mg/kg"  valor={form.cr}        onChange={set('cr')} />
              <CampoEdit label="Levedura"    sufixo="UFC/kg" valor={form.levedura}  onChange={set('levedura')} />
            </div>
          </Grupo>

          {/* Grupo 9 — Origem (LOCK) */}
          <Grupo titulo="9. Origem" destaque="lock">
            <div className="text-sm text-gray-700 space-y-1.5">
              <div>
                <span className="text-gray-500">Alimento base: </span>
                <strong>{isClone ? alimentoBase.nome : (form.alimento_base ?? '—')}</strong>
              </div>
              <div>
                <span className="text-gray-500">Fonte das frações proteicas: </span>
                <strong>NASEM 2021 — Tabela 19-1</strong>
              </div>
              {alimentoBase.fonte_nasem && (
                <div>
                  <span className="text-gray-500">Nome original (NASEM): </span>
                  <em>{alimentoBase.fonte_nasem}</em>
                </div>
              )}
              <div>
                <span className="text-gray-500">Tipo: </span>
                <span>{TIPO_LABEL[form.tipo]}</span>
              </div>
            </div>
          </Grupo>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onFechar}
            disabled={salvando}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              salvando ? 'bg-emerald-500 text-white cursor-default' : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <Check size={15} /> {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
