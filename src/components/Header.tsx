import { NavLink } from 'react-router-dom';
import { FlaskConical, Beef, BookOpen, Calculator, LogOut } from 'lucide-react';
import { useDieta } from '../context/DietaContext';

export default function Header() {
  const { usuario, logout } = useDieta();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-green-600 text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  const nomeExibido = usuario?.user_metadata?.nome
    ?? usuario?.email?.split('@')[0]
    ?? '';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 flex items-center gap-4 h-14">
        <div className="flex items-center gap-2 mr-4">
          <span className="text-2xl">🐄</span>
          <div>
            <div className="text-sm font-bold text-gray-800 leading-tight">Formulador de Dietas</div>
            <div className="text-xs text-gray-500 leading-tight">Vacas Leiteiras · NRC 2021</div>
          </div>
        </div>

        <nav className="flex gap-1">
          <NavLink to="/" end className={linkClass}>
            <FlaskConical size={15} />
            Formulador
          </NavLink>
          <NavLink to="/alimentos" className={linkClass}>
            <Beef size={15} />
            Alimentos
          </NavLink>
          <NavLink to="/dietas" className={linkClass}>
            <BookOpen size={15} />
            Minhas Dietas
          </NavLink>
          <NavLink to="/calculos" className={linkClass}>
            <Calculator size={15} />
            Cálculos
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {nomeExibido && (
            <span className="text-xs text-gray-500 hidden sm:block">
              {nomeExibido}
            </span>
          )}
          <button
            onClick={logout}
            title="Sair"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
