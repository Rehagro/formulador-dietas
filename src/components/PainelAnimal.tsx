import type { AnimalLactacao } from '../types';
import { calcularCMSExigida } from '../utils/calculos';

interface Props {
  animal: AnimalLactacao;
  onChange: (animal: AnimalLactacao) => void;
}

function Campo({
  label, value, onChange, min, max, step, hint
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs font-medium text-gray-500">
        {label}{hint && <span className="text-gray-400 font-normal"> {hint}</span>}
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
  const set = (key: keyof AnimalLactacao) => (v: number | 0 | 1) =>
    onChange({ ...animal, [key]: v });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        🐄 Dados do Animal
      </h2>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Campo label="Peso vivo" hint="kg"  value={animal.peso}       min={200} max={900} step={5}    onChange={set('peso')} />
        <Campo label="DEL"       hint="dias" value={animal.del}        min={1}   max={365} step={1}    onChange={set('del')} />
        <Campo label="Produção"  hint="kg/d" value={animal.leite}      min={1}   max={80}  step={0.5}  onChange={set('leite')} />
        <Campo label="ECC"       hint="1–5"  value={animal.ecc}        min={1}   max={5}   step={0.25} onChange={set('ecc')} />
        <Campo label="Gordura"   hint="%"    value={animal.gordura}    min={1}   max={8}   step={0.1}  onChange={set('gordura')} />
        <Campo label="Proteína"  hint="%"    value={animal.proteina}   min={1}   max={6}   step={0.1}  onChange={set('proteina')} />
        <Campo label="Lactose"   hint="%"    value={animal.lactose}    min={1}   max={6}   step={0.1}  onChange={set('lactose')} />
        <Campo label="Preço leite" hint="R$/L" value={animal.precoLeite} min={0} max={10} step={0.05} onChange={set('precoLeite')} />
      </div>

      <div className="mb-3">
        <label className="text-xs font-medium text-gray-500 block mb-1">Paridade</label>
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

      {/* CMS Exigida em destaque */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
        <div className="text-xs text-green-700 font-semibold mb-0.5">CMS Exigida (NRC 2021)</div>
        <div className="text-4xl font-bold text-green-800 tabular-nums leading-tight">{cmsExigida.toFixed(1)}</div>
        <div className="text-xs text-green-600 mt-0.5">kg MS / dia</div>
      </div>
    </div>
  );
}
