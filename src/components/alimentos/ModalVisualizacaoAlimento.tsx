import { useState, type ReactNode } from 'react';
import { X, ChevronDown, ChevronUp, Lock, Copy } from 'lucide-react';
import type { Alimento } from '../../types';
import { fmtLock, origemAlimento, TIPO_LABEL } from './utils';

interface Props {
  alimento: Alimento;
  onUsarComoBase: (a: Alimento) => void;
  onFechar: () => void;
}

function Grupo({ titulo, defaultOpen = false, children }: { titulo: string; defaultOpen?: boolean; children: ReactNode }) {
  const [aberto, setAberto] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left bg-gray-50 hover:bg-gray-100"
      >
        <span className="text-sm font-semibold text-gray-700">{titulo}</span>
        {aberto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {aberto && <div className="p-4 bg-gray-50">{children}</div>}
    </div>
  );
}

function CampoRO({ label, valor, sufixo, lock = false }: { label: string; valor: number | string | null | undefined; sufixo?: string; lock?: boolean }) {
  const v = valor === null || valor === undefined
    ? '—'
    : typeof valor === 'number'
      ? (isFinite(valor) ? valor.toFixed(2) : '—')
      : valor;
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
        {lock && <Lock size={10} className="text-gray-400" />}
        {label}{sufixo && <span className="text-gray-400 font-normal"> {sufixo}</span>}
      </label>
      <div className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm tabular-nums bg-white text-gray-700">
        {v}
      </div>
    </div>
  );
}

const pct = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : (v * 100).toFixed(2);

export default function ModalVisualizacaoAlimento({ alimento, onUsarComoBase, onFechar }: Props) {
  const origem = origemAlimento(alimento);
  const badge = origem === 'nasem'
    ? <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">NASEM 2021</span>
    : <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Customizado</span>;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="min-w-0 flex items-center gap-2">
            <h2 className="font-bold text-gray-800 text-lg truncate">{alimento.nome}</h2>
            {badge}
          </div>
          <button onClick={onFechar} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">

          <Grupo titulo="1. Identificação" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <CampoRO label="Nome"          valor={alimento.nome} />
              <CampoRO label="Classificação" valor={alimento.classificacao} />
              <CampoRO label="Tipo"          valor={TIPO_LABEL[alimento.tipo]} />
              <CampoRO label="Custo R$/kg MN" valor={alimento.custo !== null ? alimento.custo.toFixed(3) : '—'} />
            </div>
          </Grupo>

          <Grupo titulo="2. Energia e Proteína Principal" defaultOpen>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CampoRO label="MS"       sufixo="%"        valor={pct(alimento.ms)} />
              <CampoRO label="PB"       sufixo="% MS"     valor={pct(alimento.pb)} />
              <CampoRO label="NDT"      sufixo="% MS"     valor={pct(alimento.ndt)} />
              <CampoRO label="NEL"      sufixo="Mcal/kg"  valor={alimento.nel} />
              <CampoRO label="EE"       sufixo="% MS"     valor={pct(alimento.ee)} />
              <CampoRO label="Cinza"    sufixo="% MS"     valor={pct(alimento.cinza)} />
              <CampoRO label="Amido"    sufixo="% MS"     valor={pct(alimento.amido)} />
              <CampoRO label="kd Amido" sufixo="%/h"      valor={alimento.kd_amido} />
            </div>
          </Grupo>

          <Grupo titulo="3. Fibra e Estrutura Física">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CampoRO label="FDN"      sufixo="% MS" valor={pct(alimento.fdn)} />
              <CampoRO label="eFDN"     sufixo="% MS" valor={pct(alimento.efdn)} />
              <CampoRO label="FDNF"     sufixo="% MS" valor={pct(alimento.fdnf)} />
              <CampoRO label="FDA"      sufixo="% MS" valor={pct(alimento.fda)} />
              <CampoRO label="mn8"      sufixo="%FDN" valor={pct(alimento.mn8)} />
              <CampoRO label="mn19"     sufixo="%FDN" valor={pct(alimento.mn19)} />
              <CampoRO label="EE Insat" sufixo="% MS" valor={pct(alimento.ee_insat)} />
            </div>
          </Grupo>

          <Grupo titulo="4. Frações Proteicas 🔒">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CampoRO label="Fração A"         sufixo="%PB"  valor={fmtLock(alimento.prot_a)}      lock />
              <CampoRO label="Fração B"         sufixo="%PB"  valor={fmtLock(alimento.prot_b)}      lock />
              <CampoRO label="Fração C"         sufixo="%PB"  valor={fmtLock(alimento.prot_c)}      lock />
              <CampoRO label="Kd (Fração B)"    sufixo="%/h"  valor={fmtLock(alimento.kd_prot)}     lock />
              <CampoRO label="Digest. RUP"      sufixo="%"    valor={alimento.rup_digest !== null && alimento.rup_digest !== undefined ? (alimento.rup_digest * 100).toFixed(2) : '—'} lock />
              <CampoRO label="IVNDFD48"         sufixo="%FDN" valor={fmtLock(alimento.ivndfd48)}    lock />
            </div>
          </Grupo>

          <Grupo titulo="5. Aminoácidos">
            <div className="grid grid-cols-2 gap-3">
              <CampoRO label="Metionina" sufixo="% MS" valor={pct(alimento.met)} />
              <CampoRO label="Lisina"    sufixo="% MS" valor={pct(alimento.lys)} />
            </div>
          </Grupo>

          <Grupo titulo="6. Macrominerais">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CampoRO label="Cálcio"   sufixo="% MS" valor={pct(alimento.ca)} />
              <CampoRO label="Fósforo"  sufixo="% MS" valor={pct(alimento.p)} />
              <CampoRO label="Magnésio" sufixo="% MS" valor={pct(alimento.mg)} />
              <CampoRO label="Potássio" sufixo="% MS" valor={pct(alimento.k)} />
              <CampoRO label="Enxofre"  sufixo="% MS" valor={pct(alimento.s)} />
              <CampoRO label="Sódio"    sufixo="% MS" valor={pct(alimento.na)} />
              <CampoRO label="Cloro"    sufixo="% MS" valor={pct(alimento.cl)} />
            </div>
          </Grupo>

          <Grupo titulo="7. Microminerais">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CampoRO label="Cobalto"  sufixo="mg/kg" valor={alimento.co} />
              <CampoRO label="Cobre"    sufixo="mg/kg" valor={alimento.cu} />
              <CampoRO label="Manganês" sufixo="mg/kg" valor={alimento.mn_min} />
              <CampoRO label="Zinco"    sufixo="mg/kg" valor={alimento.zn} />
              <CampoRO label="Selênio"  sufixo="mg/kg" valor={alimento.se} />
              <CampoRO label="Iodo"     sufixo="mg/kg" valor={alimento.i} />
              <CampoRO label="Ferro"    sufixo="mg/kg" valor={alimento.fe} />
            </div>
          </Grupo>

          <Grupo titulo="8. Vitaminas e Aditivos">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CampoRO label="Vitamina A"  sufixo="UI/kg"  valor={alimento.vit_a} />
              <CampoRO label="Vitamina D3" sufixo="UI/kg"  valor={alimento.vit_d3} />
              <CampoRO label="Vitamina E"  sufixo="UI/kg"  valor={alimento.vit_e} />
              <CampoRO label="Biotina"     sufixo="mg/kg"  valor={alimento.biotina} />
              <CampoRO label="Monensina"   sufixo="mg/kg"  valor={alimento.monensina} />
              <CampoRO label="Cromo"       sufixo="mg/kg"  valor={alimento.cr} />
              <CampoRO label="Levedura"    sufixo="UFC/kg" valor={alimento.levedura !== null && alimento.levedura !== undefined ? alimento.levedura.toExponential(1) : '—'} />
            </div>
          </Grupo>

          <Grupo titulo="9. Origem">
            <div className="text-sm text-gray-700 space-y-1.5">
              <div>
                <span className="text-gray-500">Alimento base: </span>
                <strong>{alimento.alimento_base ?? (origem === 'nasem' ? alimento.nome : '—')}</strong>
              </div>
              <div>
                <span className="text-gray-500">Fonte das frações proteicas: </span>
                <strong>NASEM 2021 — Tabela 19-1</strong>
              </div>
              {alimento.fonte_nasem && (
                <div>
                  <span className="text-gray-500">Nome original (NASEM): </span>
                  <em>{alimento.fonte_nasem}</em>
                </div>
              )}
            </div>
          </Grupo>

        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onFechar}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Fechar
          </button>
          <button
            onClick={() => onUsarComoBase(alimento)}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg"
          >
            <Copy size={15} /> Usar como base
          </button>
        </div>
      </div>
    </div>
  );
}
