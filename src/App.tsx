import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DietaProvider } from './context/DietaContext';
import Header from './components/Header';
import Formulador from './pages/Formulador';
import Alimentos from './pages/Alimentos';
import Dietas from './pages/Dietas';

export default function App() {
  return (
    <BrowserRouter>
      <DietaProvider>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Formulador />} />
              <Route path="/alimentos" element={<Alimentos />} />
              <Route path="/dietas" element={<Dietas />} />
            </Routes>
          </main>
        </div>
      </DietaProvider>
    </BrowserRouter>
  );
}
