import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { DietaProvider } from './context/DietaContext';
import Header from './components/Header';
import Formulador from './pages/Formulador';
import Alimentos from './pages/Alimentos';
import Dietas from './pages/Dietas';
import Calculos from './pages/Calculos';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAutenticado(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAutenticado(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (autenticado === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <span className="text-4xl">🐄</span>
          <p className="text-gray-500 text-sm mt-3">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!autenticado ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/cadastro" element={!autenticado ? <Cadastro /> : <Navigate to="/" replace />} />
        <Route
          path="/"
          element={
            autenticado
              ? <DietaProvider><Layout /></DietaProvider>
              : <Navigate to="/login" replace />
          }
        >
          <Route index element={<Formulador />} />
          <Route path="alimentos" element={<Alimentos />} />
          <Route path="dietas" element={<Dietas />} />
          <Route path="calculos" element={<Calculos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
