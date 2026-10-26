'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import InfogedLogo from '@/components/InfogedLogo';
import {
  LayoutDashboard,
  FileSpreadsheet,
  GraduationCap,
  Settings,
  ShieldCheck,
  UserCheck,
  LogOut,
  LayoutGrid,
  Users,
} from 'lucide-react';

interface HeaderNavProps {
  currentUser: any;
  onSwitchUser?: (user: any) => void;
  onLogout: () => void;
  availableUsers: any[];
}

export default function HeaderNav({ currentUser, onSwitchUser, onLogout, availableUsers }: HeaderNavProps) {
  const pathname = usePathname();
  const isHub = pathname === '/';
  const isUsersPage = pathname === '/usuarios';
  const isVipzPage = pathname.startsWith('/vipz');
  const isInfogedGlobal = isHub || isUsersPage || isVipzPage;

  const userRole = (currentUser?.role || 'TECNICO').toUpperCase();
  const isAdminOrManager = userRole === 'ADMIN' || userRole === 'GERENTE';

  // Itens de menu estritamente operacionais da Epson (Usuários foi transferido para a gestão global INFOGED)
  const epsonNavItems = [
    { label: 'Dashboard', href: '/epson', icon: LayoutDashboard, roles: ['ADMIN', 'GERENTE', 'TECNICO', 'ATENDENTE'] },
    { label: 'Controle de O.S.', href: '/os', icon: FileSpreadsheet, roles: ['ADMIN', 'GERENTE', 'TECNICO', 'ATENDENTE'] },
    { label: 'Cursos', href: '/cursos', icon: GraduationCap, roles: ['ADMIN', 'GERENTE', 'TECNICO'] },
    { label: 'Gerência', href: '/gerencia', icon: Settings, roles: ['ADMIN', 'GERENTE'] },
  ];

  const filteredEpsonItems = epsonNavItems.filter((item) => item.roles.includes(userRole));
  const currentDateFormatted = new Date().toLocaleDateString('pt-BR');

  // ==============================================================
  // ESTADO 1: QUANDO ESTIVER NO HUB DE APLICATIVOS (/) OU EM MÓDULOS GLOBAIS INFOGED (/usuarios, /vipz)
  // ==============================================================
  if (isInfogedGlobal) {
    let moduleBadge = 'Central de Aplicativos';
    if (isUsersPage) moduleBadge = 'Gestão Corporativa';
    if (isVipzPage) moduleBadge = 'Vipz Infoged • Fidelidade';

    return (
      <header className="w-full bg-[#07241A] text-white shadow-md select-none sticky top-0 z-40 border-b border-emerald-900/50">
        <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Logo INFOGED Oficial em Branco Puro */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group transition" title="Central de Aplicativos INFOGED">
              <InfogedLogo white={true} height={30} alt="INFOGED Soluções Tecnológicas" />
              <span className={`hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                isVipzPage 
                  ? 'bg-amber-950/80 border-amber-500/40 text-amber-300' 
                  : 'bg-emerald-950 border-emerald-500/30 text-emerald-300'
              }`}>
                {moduleBadge}
              </span>
            </Link>

            {!isHub ? (
              <Link
                href="/"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-500/40 text-[11px] font-bold transition"
                title="Voltar para a Central de Aplicativos"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hub de Aplicativos</span>
              </Link>
            ) : (
              <span className="text-emerald-200 font-mono text-[11px] bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-800/40">
                {currentDateFormatted}
              </span>
            )}
          </div>

          {/* Atalho para Usuários & Logs (se for Admin/Gerente no Hub) + Informações do Usuário e Logout */}
          <div className="flex items-center gap-2">
            {isHub && isAdminOrManager && (
              <Link
                href="/usuarios"
                className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-600/40 font-bold text-xs transition shadow-xs"
                title="Gestão de Usuários e Permissões de Acesso aos Aplicativos"
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gestão de Usuários</span>
              </Link>
            )}

            <div className="flex items-center gap-2 bg-[#051812] px-3 py-1 rounded-lg border border-emerald-800/40">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <div className="text-[11px]">
                <span className="text-slate-400 hidden sm:inline">Colaborador: </span>
                <span className="font-semibold text-white">{currentUser?.name?.split(' ')[0] || 'Usuário'}</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-bold">
                  {currentUser?.role || 'TECNICO'}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-800/50 transition font-medium text-[11px]"
              title="Sair do sistema"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // ==============================================================
  // ESTADO 2: DENTRO DO MÓDULO EPSON (/os, /epson, /cursos, /gerencia)
  // VISUAL ORIGINAL EPSON AZUL MARINHO (#002B49) E MENUS RESTRITOS À OPERAÇÃO
  // ==============================================================
  return (
    <header className="w-full bg-[#002B49] text-white shadow-md select-none sticky top-0 z-40">
      {/* 1. Linha Superior: Logo Epson, Botão Voltar ao Hub, Usuário e Logout */}
      <div className="px-4 py-2 border-b border-blue-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Logo EPSON Original */}
          <div className="flex items-center gap-1.5 font-black text-2xl tracking-tighter text-white mr-1">
            EPSON<span className="text-[10px] text-cyan-300 font-normal align-top">&reg;</span>
          </div>

          <span className="text-cyan-200 font-mono text-[11px] bg-blue-950/80 px-2.5 py-1 rounded border border-cyan-800/40">
            {currentDateFormatted}
          </span>

          {/* Botão de Retorno ao Hub INFOGED */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#001B30] hover:bg-emerald-950 text-emerald-300 hover:text-white border border-emerald-500/40 text-[11px] font-bold transition shadow-xs"
            title="Voltar para a Central de Aplicativos INFOGED"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hub INFOGED</span>
          </Link>
        </div>

        {/* Informações do Usuário e Botão de Logout */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#001B30] px-3 py-1 rounded-lg border border-cyan-800/40">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <div className="text-[11px]">
              <span className="text-slate-400 hidden sm:inline">Usuário: </span>
              <span className="font-semibold text-white">{currentUser?.name || 'Usuário'}</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                {currentUser?.role || 'TECNICO'}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-800/50 transition font-medium text-[11px]"
            title="Sair do sistema"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      {/* 2. Linha Inferior: Menus Oficiais Epson (Dashboard, O.S., Cursos, Gerência) */}
      <nav className="px-4 flex items-center gap-1 overflow-x-auto text-xs py-1 bg-[#00223A]">
        {filteredEpsonItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition font-semibold shrink-0 ${
                isActive
                  ? 'border-b-2 border-cyan-400 font-bold text-white bg-blue-900/50'
                  : 'text-slate-300 hover:text-white hover:bg-blue-900/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-cyan-400" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
