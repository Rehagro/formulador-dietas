import { useState } from 'react';
import { Camera, CameraOff, RotateCcw, Check, X } from 'lucide-react';

interface Props {
  temFoto: boolean;
  comparando: boolean;
  criadaEm?: string;
  onTirarFoto: () => void;       // tira/substitui a foto (substituição confirmada aqui dentro)
  onToggleComparar: () => void;
  onVoltarParaFoto: () => void;  // "Voltar para a foto" (restaura e descarta a foto)
  onReaplicarFoto: () => void;   // "Reaplicar foto como dieta" (restaura e mantém a foto)
  onDescartarFoto: () => void;   // "Manter atual" (descarta só a foto)
}

function horaFoto(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function FotoControles({
  temFoto, comparando, criadaEm,
  onTirarFoto, onToggleComparar, onVoltarParaFoto, onReaplicarFoto, onDescartarFoto,
}: Props) {
  const [confirmarSubstituir, setConfirmarSubstituir] = useState(false);

  // Sem foto: um único botão para tirar a foto inicial.
  if (!temFoto) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-500 flex items-center gap-1.5">
          <Camera size={15} className="text-gray-400" />
          Tire uma <strong className="text-gray-700">foto da dieta</strong> para comparar o antes e o depois das suas mudanças.
        </span>
        <button
          onClick={onTirarFoto}
          className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-all hover:scale-105 active:scale-95"
        >
          <Camera size={15} /> Tirar foto
        </button>
      </div>
    );
  }

  // Com foto: status + toggle Comparar + ações (reaplicar / voltar / manter atual).
  return (
    <>
      <div className={`border rounded-xl shadow-sm px-4 py-2.5 flex items-center gap-2 flex-wrap transition-colors ${
        comparando ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'
      }`}>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-indigo-800">
          <Camera size={15} />
          Foto de {horaFoto(criadaEm)}
        </span>

        <button
          onClick={onToggleComparar}
          title={comparando ? 'Desligar comparação' : 'Comparar foto vs. dieta atual'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95 ${
            comparando
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
          }`}
        >
          {comparando ? <Camera size={14} /> : <CameraOff size={14} />}
          {comparando ? 'Comparando' : 'Comparar'}
        </button>

        <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />

        <button
          onClick={() => setConfirmarSubstituir(true)}
          title="Substituir a foto pela dieta atual"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all active:scale-95"
        >
          <Camera size={14} /> Nova foto
        </button>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={onReaplicarFoto}
            title="Restaura a dieta fotografada e mantém a foto"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95"
          >
            <Check size={14} /> Reaplicar foto
          </button>
          <button
            onClick={onVoltarParaFoto}
            title="Restaura a dieta fotografada e descarta a foto"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 transition-all active:scale-95"
          >
            <RotateCcw size={14} /> Voltar para a foto
          </button>
          <button
            onClick={onDescartarFoto}
            title="Mantém a dieta atual e descarta a foto"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all active:scale-95"
          >
            <X size={14} /> Manter atual
          </button>
        </div>
      </div>

      {/* Modal — confirmar substituição da foto (padrão estilizado do projeto) */}
      {confirmarSubstituir && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <Camera size={20} className="text-indigo-600" />
              <h2 className="font-bold text-gray-800 text-lg">Substituir a foto?</h2>
            </div>
            <div className="p-5 text-sm text-gray-600">
              Já existe uma foto desta dieta (de {horaFoto(criadaEm)}). Tirar uma nova
              foto vai <strong>substituir</strong> a anterior pela dieta atual.
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
              <button
                onClick={() => setConfirmarSubstituir(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setConfirmarSubstituir(false); onTirarFoto(); }}
                className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium"
              >
                Substituir foto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
