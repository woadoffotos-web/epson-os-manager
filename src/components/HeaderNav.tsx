'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import InfogedLogo from '@/components/InfogedLogo';
import {
  LayoutGrid,
  FileSpreadsheet,
  Gauge,
  GraduationCap,
  Settings,
  ShieldCheck,
  UserCheck,
  LogOut,
  ChevronRight,
} from 'lucide-react';

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
    { label: 'Hub INFOGED', href: '/', icon: LayoutGrid, roles: ['ADMIN', 'GERENTE', 'TECNICO', 'ATENDENTE'], isHub: true },
    { label: 'Controle de O.S.', href: '/os', icon: FileSpreadsheet, roles: ['ADMIN', 'GERENTE', 'TECNICO', 'ATENDENTE'] },
    { label: 'Indicadores Epson', href: '/epson', icon: Gauge, roles: ['ADMIN', 'GERENTE', 'TECNICO', 'ATENDENTE'] },
    { label: 'Cursos', href: '/cursos', icon: GraduationCap, roles: ['ADMIN', 'GERENTE', 'TECNICO'] },
    { label: 'Gerência', href: '/gerencia', icon: Settings, roles: ['ADMIN', 'GERENTE'] },
    { label: 'Usuários & Logs', href: '/usuarios', icon: ShieldCheck, roles: ['ADMIN', 'GERENTE'] },
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));
  const currentDateFormatted = new Date().toLocaleDateString('pt-BR');

  // Identifica o contexto atual
  const isEpsonContext = pathname.startsWith('/os') || pathname.startsWith('/epson') || pathname.startsWith('/cursos');
  const isManagementContext = pathname.startsWith('/gerencia') || pathname.startsWith('/usuarios');
  const isHubContext = pathname === '/';

  return (
    <header className="w-full bg-[#082019] text-white shadow-md select-none sticky top-0 z-40 border-b border-emerald-900/40">
      {/* Barra Superior Corporativa INFOGED */}
      <div className="px-4 py-2 bg-[#051510] border-b border-emerald-950 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Logo Principal INFOGED */}
          <Link href="/" className="flex items-center gap-2 group transition hover:opacity-90" title="Ir para o Hub de Aplicativos INFOGED">
            <InfogedLogo white={true} height={26} alt="INFOGED" />
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-300">
              Plataforma
            </span>
          </Link>

          {/* Breadcrumb contextual do Módulo */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            {isHubContext ? (
              <span className="text-emerald-300 font-semibold">Central de Aplicativos</span>
            ) : isEpsonContext ? (
              <span className="inline-flex items-center gap-1.5 text-cyan-300 font-bold bg-[#002B49] px-2 py-0.5 rounded border border-cyan-800/60">
                <span>EPSON&reg; CSA</span>
              </span>
            ) : isManagementContext ? (
              <span className="text-purple-300 font-semibold bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                Administração INFOGED
              </span>
            ) : (
              <span className="text-slate-300">{pathname}</span>
            )}
          </div>

          <span className="hidden md:inline-block text-slate-400 font-mono text-[11px] bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">
            {currentDateFormatted}
          </span>
        </div>

        {/* Informações do Usuário e Botão de Logout */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#0A261D] px-3 py-1 rounded-lg border border-emerald-900/60 shadow-xs">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <div className="text-[11px]">
              <span className="text-slate-400 hidden sm:inline">Colaborador: </span>
              <span className="font-semibold text-white">{currentUser?.name?.split(' ')[0] || 'Usuário'}</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-bold">
                {currentUser?.role || 'TECNICO'}
              </span>
            </div>
          </div>

          {/* Botão Sair / Logout */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-800/50 transition font-medium text-[11px]"
            title="Encerrar sessão no sistema"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      {/* Barra de Abas e Navegação */}
      <nav className="px-4 flex items-center gap-1 overflow-x-auto text-xs py-1.5 bg-[#082019]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                isActive
                  ? item.isHub
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-[#002B49] text-cyan-200 shadow-sm border border-cyan-700/50'
                  : item.isHub
                  ? 'text-emerald-300 hover:bg-emerald-950/60'
                  : 'text-slate-300 hover:text-white hover:bg-emerald-950/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
