'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileSpreadsheet, GraduationCap, Settings, ShieldCheck, UserCheck, LogOut } from 'lucide-react';

interface HeaderNavProps {
  currentUser: any;
  onSwitchUser?: (user: any) => void;
  onLogout: () => void;
  availableUsers: any[];
}

export default function HeaderNav({ currentUser, onSwitchUser, onLogout, availableUsers }: HeaderNavProps) {
  const pathname = usePathname();

  const userRole = (currentUser?.role || 'TECNICO').toUpperCase();

  const allNavItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['ADMIN', 'GERENTE', 'TECNICO', 'ATENDENTE'] },
    { label: 'Controle de O.S.', href: '/os', icon: FileSpreadsheet, roles: ['ADMIN', 'GERENTE', 'TECNICO', 'ATENDENTE'] },
    { label: 'Cursos', href: '/cursos', icon: GraduationCap, roles: ['ADMIN', 'GERENTE', 'TECNICO'] },
    { label: 'Gerência', href: '/gerencia', icon: Settings, roles: ['ADMIN', 'GERENTE'] },
    { label: 'Usuários & Logs', href: '/usuarios', icon: ShieldCheck, roles: ['ADMIN', 'GERENTE'] },
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));

  const currentDateFormatted = new Date().toLocaleDateString('pt-BR');

  return (
    <header className="w-full bg-[#002B49] text-white shadow-md select-none sticky top-0 z-40">
      {/* Barra de Filtros Corporativos Epson (Fiel à imagem de referência) */}
      <div className="px-4 py-2 border-b border-blue-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Logo EPSON */}
          <div className="flex items-center gap-1.5 font-black text-2xl tracking-tighter text-white mr-2">
            EPSON<span className="text-[10px] text-cyan-300 font-normal align-top">®</span>
          </div>

          <span className="text-cyan-200 font-mono text-[11px] bg-blue-950/80 px-2.5 py-1 rounded border border-cyan-800/40">
            {currentDateFormatted}
          </span>
        </div>

        {/* Seletor de Usuário Ativo / Perfil e Botão Sair */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#001B30] px-3 py-1 rounded-lg border border-cyan-800/40">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <div className="text-[11px]">
              <span className="text-slate-400">Usuário: </span>
              <span className="font-semibold text-white">{currentUser?.name || 'Usuário'}</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                {currentUser?.role || 'TECNICO'}
              </span>
            </div>
          </div>

          {/* Botão Sair / Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 text-rose-200 text-xs font-semibold transition"
            title="Sair do sistema"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Barra de Menus Principais de Navegação */}
      <nav className="px-4 py-1.5 flex items-center gap-1 bg-[#001B30] overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
