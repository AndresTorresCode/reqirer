import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Proyectos from './pages/Proyectos';
import RegistroRequerimiento from './pages/RegistroRequerimiento';
import Listado from './pages/Listado';
import Tablero from './pages/Tablero';
import DetalleRequerimiento from './pages/DetalleRequerimiento';

// Envuelve una pagina con el layout protegido.
function Privado({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/proyectos" element={<Privado><Proyectos /></Privado>} />
      <Route path="/requerimientos" element={<Privado><Listado /></Privado>} />
      <Route path="/requerimientos/nuevo" element={<Privado><RegistroRequerimiento /></Privado>} />
      <Route path="/requerimientos/:id" element={<Privado><DetalleRequerimiento /></Privado>} />
      <Route path="/tablero" element={<Privado><Tablero /></Privado>} />
      <Route path="/" element={<Navigate to="/tablero" replace />} />
      <Route path="*" element={<Navigate to="/tablero" replace />} />
    </Routes>
  );
}
