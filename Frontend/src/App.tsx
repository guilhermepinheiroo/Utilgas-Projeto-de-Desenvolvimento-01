import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Atendimento } from "./pages/Atendimento";
import { Dashboard } from "./pages/Dashboard";
import { Clientes } from "./pages/Clientes";
import { Vendas } from "./pages/Vendas";
import { Portaria } from "./pages/Portaria";
import { Entregas } from "./pages/Entregas";

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
        <Route path="/vendas" element={<Vendas />} />
        <Route path="/portaria" element={<Portaria />} />
        <Route path="/entregas" element={<Entregas />} />
        <Route path="/estoque" element={<div>Estoque</div>} />
      </Route>
      <Route path="*" element={<Navigate to="/atendimento" replace />} />
    </Routes>
  );
}