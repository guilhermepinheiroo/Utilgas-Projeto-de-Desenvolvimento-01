import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/useAuth";
import { Sidebar } from "./components/Sidebar";

const Atendimento = lazy(() =>
  import("./pages/Atendimento").then(({ Atendimento }) => ({ default: Atendimento }))
);
const Clientes = lazy(() =>
  import("./pages/Clientes").then(({ Clientes }) => ({ default: Clientes }))
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then(({ Dashboard }) => ({ default: Dashboard }))
);
const Entregas = lazy(() =>
  import("./pages/Entregas").then(({ Entregas }) => ({ default: Entregas }))
);
const Estoque = lazy(() =>
  import("./pages/Estoque").then(({ Estoque }) => ({ default: Estoque }))
);
const Login = lazy(() => import("./pages/Login").then(({ Login }) => ({ default: Login })));
const Portaria = lazy(() =>
  import("./pages/Portaria").then(({ Portaria }) => ({ default: Portaria }))
);
const Vendas = lazy(() => import("./pages/Vendas").then(({ Vendas }) => ({ default: Vendas })));

function CarregandoPagina() {
  return (
    <div
      role="status"
      className="flex min-h-full items-center justify-center p-6 text-sm text-neutral-500"
    >
      Carregando página...
    </div>
  );
}

function LayoutPrincipal() {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<CarregandoPagina />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  const { usuario } = useAuth();

  if (!usuario) {
    return (
      <Suspense fallback={<CarregandoPagina />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
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
