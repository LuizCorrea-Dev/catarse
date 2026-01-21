import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Sparkles,
  User,
  Building2,
  MessageCircle,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Feed", path: "/", icon: Home, color: "#50c878" },
  { label: "Átrio", path: "/atrio", icon: Sparkles, color: "#2dd4bf" },
  {
    label: "Conexões",
    path: "/connections",
    icon: MessageCircle,
    color: "#3b82f6",
  }, // Novo Item
  {
    label: "Comunidades",
    path: "/communities",
    icon: Building2,
    color: "#a855f7",
  },
  { label: "Perfil", path: "/profile", icon: User, color: "#FFC300" },
];

interface NavigationProps {
  onLogout?: () => void;
}

export const SideNavigation: React.FC<NavigationProps> = ({ onLogout }) => {
  return (
    <aside className="hidden xl:flex fixed left-0 top-[73px] bottom-0 w-24 flex-col items-center py-8 gap-8 bg-[#0f172a] border-r border-slate-800 z-40 shadow-xl">
      <nav className="flex flex-col gap-8 w-full flex-grow">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.path} {...item} variant="desktop" />
        ))}
      </nav>

      <button
        onClick={onLogout}
        className="flex flex-col items-center gap-2 group w-full mb-4"
        title="Sair"
        style={{
          transition: "all 0.3s ease",
        }}
      >
        <div className="p-3 rounded-2xl transition-colors bg-transparent group-hover:bg-red-500/10">
          <LogOut
            size={24}
            className="text-slate-500 group-hover:text-red-500 transition-colors"
          />
        </div>
        <span className="text-[10px] font-semibold tracking-wide text-slate-500 group-hover:text-red-500">
          Sair
        </span>
      </button>
    </aside>
  );
};

export const MobileNavigation: React.FC<NavigationProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLMenuElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const mobileNavItems = NAV_ITEMS;

  const offsetMenuBorder = (
    element: HTMLElement,
    menu: HTMLElement,
    border: HTMLElement,
  ) => {
    const offsetActiveItem = element.getBoundingClientRect();
    const menuOffset = menu.getBoundingClientRect();

    const left =
      Math.floor(
        offsetActiveItem.left -
          menuOffset.left -
          (border.offsetWidth - offsetActiveItem.width) / 2,
      ) + "px";

    border.style.transform = `translate3d(${left}, 0 , 0)`;
  };

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const border = borderRef.current;

    if (!menu || !border) return;

    const activeItem = menu.querySelector<HTMLElement>(`.menu__item.active`);

    if (activeItem) {
      offsetMenuBorder(activeItem, menu, border);
    }

    const handleResize = () => {
      menu.style.setProperty("--timeOut", "none");
      if (activeItem) {
        offsetMenuBorder(activeItem, menu, border);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [location.pathname]);

  const handleItemClick = (path: string) => {
    if (menuRef.current) {
      menuRef.current.style.removeProperty("--timeOut");
    }
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 xl:hidden bg-[#0f172a]">
      <menu className="menu" ref={menuRef}>
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              className={`menu__item ${isActive ? "active" : ""}`}
              style={{ "--bgColorItem": item.color } as React.CSSProperties}
              onClick={() => handleItemClick(item.path)}
            >
              <Icon
                size={24}
                className="icon relative z-10 text-slate-400"
                style={{
                  color: isActive ? "white" : undefined,
                }}
              />
            </button>
          );
        })}

        <div className="menu__border" ref={borderRef}></div>
      </menu>
    </nav>
  );
};

interface NavItemProps {
  label: string;
  path: string;
  icon: React.ElementType;
  variant: "desktop" | "mobile";
  isSpecial?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  label,
  path,
  icon: Icon,
  variant,
  isSpecial,
}) => {
  const location = useLocation();
  const isActive = location.pathname === path;

  const activeClass = isActive
    ? "text-[#50c878]"
    : isSpecial
      ? "text-[#50c878]"
      : "text-slate-400 hover:text-white group-hover:text-white";

  return (
    <Link
      to={path}
      className={`group flex flex-col items-center gap-2 w-full relative transition-transform duration-300 ${isActive ? "scale-110" : "hover:scale-105"}`}
    >
      {isActive && !isSpecial && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#50c878] rounded-r-full shadow-[0_0_10px_#50c878]"></div>
      )}

      <div
        className={`p-3 rounded-2xl transition-colors duration-300 ${
          isActive
            ? "bg-[#50c878]/10"
            : isSpecial
              ? "bg-[#50c878]/20 hover:bg-[#50c878]/30 shadow-[0_0_15px_rgba(80,200,120,0.15)]"
              : "bg-transparent"
        }`}
      >
        <Icon
          size={28}
          className={activeClass}
          strokeWidth={isActive || isSpecial ? 2.5 : 2}
        />
      </div>
      <span
        className={`text-[10px] font-semibold tracking-wide transition-colors duration-300 ${activeClass}`}
      >
        {label}
      </span>
    </Link>
  );
};
