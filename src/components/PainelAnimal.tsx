import { useState } from 'react';
import { Info } from 'lucide-react';
import type { AnimalLactacao, Raca } from '../types';
import { calcularCMSExigida } from '../utils/calculos';

interface Props {
  animal: AnimalLactacao;
  onChange: (animal: AnimalLactacao) => void;
}

/** Defaults por raça (NASEM 2021 Tabela 6-X e Apêndices) */
const DEFAULTS_RACA: Record<Raca, { peso_bezerro: number; peso_maduro: number }> = {
  Holstein: { peso_bezerro: 45, peso_maduro: 700 },
  Jersey:   { peso_bezerro: 28, peso_maduro: 480 },
  Outra:    { peso_bezerro: 40, peso_maduro: 600 },
};

function CampoTooltip({ texto }: { texto: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <span
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={() => setAberto(false)}
      onClick={() => setAberto(v => !v)}
      className="relative inline-flex items-center ml-1 cursor-help"
    >
      <Info size={11} className="text-gray-400 hover:text-gray-600 flex-shrink-0" />
      {aberto && (
        <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-gray-800 text-white text-[11px] rounded-lg px-3 py-2 z-[9999] leading-snug shadow-2xl whitespace-pre-line">
          {texto}
        </span>
      )}
    </span>
  );
}

function Campo({
  label, hint, dica, value, onChange, min, max, step,
}: {
  label: string;
  hint?: string;
  dica?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs font-medium text-gray-500 flex items-center">
        {label}{hint && <span className="text-gray-400 font-normal ml-1">{hint}</span>}
        {dica && <CampoTooltip texto={dica} />}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 0.1}
        onFocus={e => e.target.select()}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
      />
    </div>
  );
}

export default function PainelAnimal({ animal, onChange }: Props) {
  const cmsExigida = calcularCMSExigida(animal);

  const dias_gest = animal.dias_gestacao ?? 0;
  const peso_bez  = animal.peso_bezerro_alvo ?? DEFAULTS_RACA[animal.raca ?? 'Holstein'].peso_bezerro;
  const raca      = animal.raca ?? 'Holstein';

  const set = <K extends keyof AnimalLactacao>(key: K) => (v: AnimalLactacao[K]) =>
    onChange({ ...animal, [key]: v });

  // Quando muda a raça, atualiza peso_bezerro_alvo se ainda estiver no default da raça anterior
  function handleRaca(nova: Raca) {
    const oldDef = DEFAULTS_RACA[raca].peso_bezerro;
    const newDef = DEFAULTS_RACA[nova].peso_bezerro;
    onChange({
      ...animal,
      raca: nova,
      peso_bezerro_alvo: peso_bez === oldDef ? newDef : peso_bez,
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        🐄 Dados do Animal
      </h2>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Campo label="Peso vivo"  hint="kg"   value={animal.peso}     min={200} max={900} step={5}    onChange={set('peso')}
          dica="Peso vivo atual da vaca em kg. Usado em CMS, manutenção energética e proteica." />
        <Campo label="DEL"        hint="dias" value={animal.del}      min={1}   max={365} step={1}    onChange={set('del')}
          dica="Dias em lactação. 0 = parto recente. Afeta o cálculo do CMS pré-pico (curva de subida)." />
        <Campo label="Produção"   hint="kg/d" value={animal.leite}    min={1}   max={80}  step={0.5}  onChange={set('leite')}
          dica="Produção atual de leite (kg/d). Influencia o CMS exigido e referências de PB/CNF." />
        <Campo label="ECC"        hint="1–5"  value={animal.ecc}      min={1}   max={5}   step={0.25} onChange={set('ecc')}
          dica="Escore de Condição Corporal (escala 1=magra, 5=obesa). Padrão 3,0 para vaca em lactação." />
        <Campo label="Gordura"    hint="%"    value={animal.gordura}  min={1}   max={8}   step={0.1}  onChange={set('gordura')}
          dica="Teor de gordura do leite produzido (%). Usado para calcular NEL por kg de leite." />
        <Campo label="Proteína"   hint="%"    value={animal.proteina} min={1}   max={6}   step={0.1}  onChange={set('proteina')}
          dica="Teor de proteína bruta do leite (%). Usado em NEL/kg leite e no leite potencial pela PM." />
        <Campo label="Lactose"    hint="%"    value={animal.lactose}  min={1}   max={6}   step={0.1}  onChange={set('lactose')}
          dica="Teor de lactose do leite (%). Geralmente 4,6–4,8% em vacas saudáveis." />
        <Campo label="Preço leite" hint="R$/L" value={animal.precoLeite} min={0} max={10} step={0.05} onChange={set('precoLeite')}
          dica="Preço de venda do leite (R$/litro). Usado só para calcular receita/dia." />
      </div>

      <div className="mb-3">
        <label className="text-xs font-medium text-gray-500 block mb-1 flex items-center">
          Paridade
          <CampoTooltip texto="Novilha = primeira lactação (parity 0). Vaca adulta = segunda lactação ou mais. Afeta o CMS e a manutenção." />
        </label>
        <div className="flex gap-2">
          {([0, 1] as const).map(p => (
            <button
              key={p}
              onClick={() => onChange({ ...animal, paridade: p })}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                animal.paridade === p
                  ? 'bg-green-600 text-white border-green-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
              }`}
            >
              {p === 0 ? '🐮 Novilha' : '🐄 Vaca adulta'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bloco de Gestação (novo) ─────────────────────────────────────── */}
      <div className="mb-3 border border-amber-100 bg-amber-50/40 rounded-lg p-2.5">
        <div className="text-xs font-bold text-amber-800 mb-2 flex items-center">
          🤰 Gestação
          <CampoTooltip texto={
            "Vacas prenhes consomem proteína metabolizável para o crescimento do útero e do feto. " +
            "Sem informar dias de gestação, o leite potencial pela proteína fica superestimado. " +
            "Se a vaca NÃO está prenhe, deixe 'Dias gestação' = 0."
          } />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-500 block mb-1 flex items-center">
              Raça
              <CampoTooltip texto="Define o peso do bezerro ao nascer e o peso adulto da vaca. Holstein é o default." />
            </label>
            <select
              value={raca}
              onChange={e => handleRaca(e.target.value as Raca)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="Holstein">Holstein</option>
              <option value="Jersey">Jersey</option>
              <option value="Outra">Outra (Gir, Girolando, etc.)</option>
            </select>
          </div>
          <Campo label="Dias gestação" hint="d" value={dias_gest} min={0} max={300} step={1}
            onChange={v => onChange({ ...animal, dias_gestacao: Math.max(0, v) })}
            dica={"Dias desde a concepção. 0 = não prenhe (vacas no início da lactação). Em vacas prenhes >150 dias, esse valor afeta significativamente o leite potencial pela proteína."} />
          <Campo label="Peso bezerro" hint="kg" value={peso_bez} min={15} max={70} step={1}
            onChange={v => onChange({ ...animal, peso_bezerro_alvo: v })}
            dica={"Peso esperado do bezerro ao nascimento. Holstein ≈ 45 kg, Jersey ≈ 28 kg. Se não souber, use o default da raça."} />
        </div>
      </div>

      {/* CMS Exigida em destaque */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
        <div className="text-xs text-green-700 font-semibold mb-0.5">CMS Exigida (NASEM 2021)</div>
        <div className="text-4xl font-bold text-green-800 tabular-nums leading-tight">{cmsExigida.toFixed(1)}</div>
        <div className="text-xs text-green-600 mt-0.5">kg MS / dia</div>
      </div>
    </div>
  );
}
