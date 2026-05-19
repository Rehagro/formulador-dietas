import { X, Copy, FileUp } from 'lucide-react';

interface Props {
  onClonar: () => void;
  onImportarXML: () => void;
  onFechar: () => void;
}

/**
 * Modal inicial de "Adicionar Alimento" — escolhe entre clone manual ou
 * importação de XML do laudo de análise (3R Lab, Dairy One, CVAS, etc.).
 */
export default function ModalEscolherAdicionar({ onClonar, onImportarXML, onFechar }: Props) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
         onClick={onFechar}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">➕ Adicionar Alimento</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-700 p-1">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">Como você quer cadastrar este alimento?</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={onClonar}
            className="border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 rounded-xl p-4 text-left transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <Copy size={20} className="text-emerald-600" />
              <span className="font-semibold text-gray-800">Clonar e editar</span>
            </div>
            <p className="text-xs text-gray-600 leading-snug">
              Escolha um alimento do banco NASEM como modelo e edite os valores que tiver da sua análise.
            </p>
          </button>

          <button
            onClick={onImportarXML}
            className="border-2 border-gray-200 hover:border-sky-500 hover:bg-sky-50 rounded-xl p-4 text-left transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <FileUp size={20} className="text-sky-600" />
              <span className="font-semibold text-gray-800">Importar XML do laudo</span>
            </div>
            <p className="text-xs text-gray-600 leading-snug">
              Envie o arquivo XML do laboratório (3R Lab, Dairy One, CVAS) — preenche tudo automaticamente.
            </p>
          </button>
        </div>

        <div className="mt-4 text-[11px] text-gray-500 leading-snug text-center">
          Os campos NASEM avançados (frações proteicas, kd, etc.) que o laudo não traz
          são herdados de um template do banco que você escolhe.
        </div>
      </div>
    </div>
  );
}
