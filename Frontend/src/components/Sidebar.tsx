import { NavLink } from "react-router-dom";

import iconeAtendimento from "../assents/icon-atendimento-sidebar.png";
import iconeDashboard from "../assents/icon-dashboard-sidebar.png";
import iconeClientes from "../assents/icon-clientes-sidebar.png";
import iconeVendas from "../assents/icon-vendar-sidebar.png";
import iconeEntregas from "../assents/icon-entregar-sidebar.png";
import iconeEstoque from "../assents/icon-estoque-sidebar.png";
import iconePerfil from "../assents/icon-portaria-sidebar.png";

interface ItemMenuProps {
  rotulo: string;
  caminho: string;
  icone: string;
}

const itensMenu: ItemMenuProps[] = [
  { rotulo: "Atendimento", caminho: "/atendimento", icone: iconeAtendimento },
  { rotulo: "Dashboard", caminho: "/dashboard", icone: iconeDashboard },
  { rotulo: "Clientes", caminho: "/clientes", icone: iconeClientes },
  { rotulo: "Vendas", caminho: "/vendas", icone: iconeVendas },
  { rotulo: "Portaria", caminho: "/portaria", icone: iconePerfil },
  { rotulo: "Entregas", caminho: "/entregas", icone: iconeEntregas },
  { rotulo: "Estoque", caminho: "/estoque", icone: iconeEstoque },
];

function ItemMenu({ rotulo, caminho, icone }: ItemMenuProps) {
  return (
    <NavLink
      to={caminho}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-md px-3 py-2 text-xs text-white transition-colors ${
          isActive
            ? "bg-sidebar-ativo"
            : "opacity-80 hover:bg-sidebar-ativo/50 hover:opacity-100"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute -left-2 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-destaque" />
          )}
          <img src={icone} alt="" className="size-4 object-contain" />
          {rotulo}
        </>
      )}
    </NavLink>
  );
}

function PerfilUsuario({ nome, cargo }: { nome: string; cargo: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-sidebar-ativo px-3 py-2">
      <div className="flex size-7 items-center justify-center rounded-full bg-white/10">
        <img src={iconePerfil} alt="" className="size-3.5 object-contain" />
      </div>
      <div className="leading-tight">
        <p className="text-[11px] font-semibold text-white">{nome}</p>
        <p className="text-[10px] text-white/60">{cargo}</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col bg-sidebar p-3">
      <img src="/images/logo.png" alt="UtilGás" className="mx-2 my-4 h-10 w-auto self-start" />
 
      <nav aria-label="Navegação principal" className="mt-10 flex flex-col gap-1 pl-2">
        {itensMenu.map((item) => (
          <ItemMenu key={item.caminho} {...item} />
        ))}
      </nav>

      <div className="mt-auto">
        <PerfilUsuario nome="Usuário Gás" cargo="Operador" />
      </div>
    </aside>
  );
}