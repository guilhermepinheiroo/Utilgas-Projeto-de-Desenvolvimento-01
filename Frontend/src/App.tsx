import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/useAuth";
import { Sidebar } from "./components/Sidebar";
import { Atendimento } from "./pages/Atendimento";
import { Clientes } from "./pages/Clientes";
import { Dashboard } from "./pages/Dashboard";
import { Entregas } from "./pages/Entregas";
import { Estoque } from "./pages/Estoque";
import { Login } from "./pages/Login";
import { Portaria } from "./pages/Portaria";
import { Vendas } from "./pages/Vendas";

function LayoutPrincipal() {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  const { usuario } = useAuth();

  if (!usuario) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<LayoutPrincipal />}>
        <Route path="/" element={<Navigate to="/atendimento" replace />} />
        <Route path="/atendimento" element={<Atendimento />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/vendas" element={<Vendas />} />
        <Route path="/portaria" element={<Portaria />} />
        <Route path="/entregas" element={<Entregas />} />
        <Route path="/estoque" element={<Estoque />} />
      </Route>
      <Route path="*" element={<Navigate to="/atendimento" replace />} />
    </Routes>
  );
}
