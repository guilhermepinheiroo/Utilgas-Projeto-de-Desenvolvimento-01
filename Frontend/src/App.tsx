import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Atendimento } from "./pages/Atendimento";
import { Dashboard } from "./pages/Dashboard";
import { Clientes } from "./pages/Clientes";

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
  return (
    <Routes>
      <Route element={<LayoutPrincipal />}>
        <Route path="/" element={<Navigate to="/atendimento" replace />} />
        <Route path="/atendimento" element={<Atendimento />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/vendas" element={<div>Vendas</div>} />
        <Route path="/portaria" element={<div>Portaria</div>} />
        <Route path="/entregas" element={<div>Entregas</div>} />
        <Route path="/estoque" element={<div>Estoque</div>} />
      </Route>
      <Route path="*" element={<Navigate to="/atendimento" replace />} />
    </Routes>
  );
}