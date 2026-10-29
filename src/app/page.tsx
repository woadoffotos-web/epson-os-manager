'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/app/ClientLayout';
import InfogedLogo from '@/components/InfogedLogo';
import {
  FileSpreadsheet,
  Gauge,
  Package,
  Headphones,
  ShieldCheck,
  Users,
  Settings,
  ArrowRight,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  Crown,
  Gift,
  Award,
  Printer,
} from 'lucide-react';

export default function InfogedHubPage() {
  const { currentUser } = useApp();
  const [quickMetrics, setQuickMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const userRole = (currentUser?.role || 'TECNICO').toUpperCase();
  const isAdminOrManager = userRole === 'ADMIN' || userRole === 'GERENTE';

  // Obter lista de permissões do usuário
  const userPermissions: string[] = React.useMemo(() => {
    try {
      if (Array.isArray(currentUser?.permissions)) return currentUser.permissions;
      return JSON.parse(currentUser?.permissions || '[]');
    } catch {
      return [];
    }
  }, [currentUser]);

  // Função para verificar se o usuário tem permissão para o aplicativo
  const hasAccessTo = (appId: string) => {
    if (userRole === 'ADMIN') return true;
    if (userPermissions.includes('ALL')) return true;
    if (userPermissions.includes(appId)) return true;
    // Fallback para Epson CSA para usuários legados
    if (appId === 'APP_EPSON_OS' && !userPermissions.some((p: string) => p.startsWith('APP_'))) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    const fetchQuickMetrics = async () => {
      try {
        const res = await fetch('/api/metrics');
        if (res.ok) {
          const data = await res.json();
          setQuickMetrics(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchQuickMetrics();
  }, []);

  const totalOrders = quickMetrics?.annualTotalOrders ?? 10;
  const tmfVal = quickMetrics?.kpis?.tmf ?? 8.7;
  const currentTier = quickMetrics?.classMensal ?? 'GOLD';

  const canAccessEpson = hasAccessTo('APP_EPSON_OS');
  const canAccessVipz = hasAccessTo('APP_VIPZ');
  const canAccessEstoque = hasAccessTo('APP_ESTOQUE');
  const canAccessOutsourcing = hasAccessTo('APP_OUTSOURCING') || canAccessEstoque || isAdminOrManager;
  const canAccessChamados = hasAccessTo('APP_CHAMADOS');
  const canAccessGestao = isAdminOrManager || hasAccessTo('APP_GESTAO');

  return (
    <div className="space-y-8 pb-10">
      {/* Banner Principal de Boas-Vindas INFOGED */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#07241A] via-[#0E3A2B] to-[#0A261D] text-white p-6 sm:p-8 md:p-10 shadow-xl border border-emerald-900/40">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Portal Unificado INFOGED</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Olá, <span className="text-emerald-300">{currentUser?.name?.split(' ')[0] || 'Colaborador'}</span>!
            </h1>

            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Bem-vindo à sua central de aplicativos corporativos. Aqui você acessa os sistemas autorizados para o seu perfil.
            </p>
          </div>

          {/* Card de Perfil Resumido */}
          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 md:p-5 backdrop-blur-md flex items-center gap-4 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="text-xs text-slate-300 font-medium">{currentUser?.email}</div>
              <div className="text-sm font-bold text-white mt-0.5">{currentUser?.name}</div>
              <div className="inline-flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  {userRole} &bull; Sessão Ativa
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Aplicativos da Plataforma */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-700" />
              <span>Aplicativos & Módulos Disponíveis</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Apenas os aplicativos liberados para o seu cadastro aparecem habilitados abaixo.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
            {canAccessGestao ? '4 Módulos' : '3 Módulos'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* ============================================================== */}
          {/* MÓDULO 1: EPSON CSA - GESTÃO DE O.S. & SLA (ATIVO E COMPLETO) */}
          {/* ============================================================== */}
          <div
            className={`group relative bg-white rounded-2xl p-6 shadow-sm border transition-all duration-300 flex flex-col justify-between overflow-hidden ${
              canAccessEpson
                ? 'hover:shadow-xl border-slate-200 hover:border-emerald-500'
                : 'opacity-70 border-slate-200 bg-slate-50/60'
            }`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 via-cyan-500/5 to-transparent rounded-bl-full pointer-events-none transition group-hover:scale-125" />

            <div>
              {/* Topo do Card */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#002B49] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                  <FileSpreadsheet className="w-6 h-6 text-cyan-300" />
                </div>
                {canAccessEpson ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Em Produção</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold">
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>Não Liberado</span>
                  </div>
                )}
              </div>

              {/* Informações */}
              <div className="mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 block">
                  Operacional Especializado
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-emerald-800 transition">
                  Epson CSA &bull; Gestão de O.S.
                </h3>
              </div>

              <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                Controle integral de ordens de serviço, alertas visuais de prazos, cálculo automático de TMF, consumo de peças e manômetros SLA Epson.
              </p>

              {/* Indicadores em Tempo Real */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-5 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block">O.S. Registradas</span>
                  <span className="text-sm font-black text-slate-800">
                    {loading ? '...' : totalOrders}
                  </span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="text-[10px] text-slate-500 block">TMF Atual</span>
                  <span className="text-sm font-black text-blue-700">
                    {loading ? '...' : `${tmfVal}d`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Classificação</span>
                  <span className="text-sm font-black text-emerald-700">
                    {loading ? '...' : currentTier}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {canAccessEpson ? (
                <>
                  <Link
                    href="/os"
                    className="w-full py-2.5 px-4 bg-[#002B49] hover:bg-[#001B30] text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-2 group-hover:bg-emerald-800"
                  >
                    <span>Acessar Painel de O.S.</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/epson"
                    className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Gauge className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ver Indicadores & Manômetros</span>
                  </Link>
                </>
              ) : (
                <div className="p-2 text-center text-xs text-slate-500 bg-slate-100 rounded-xl font-medium">
                  Contate o administrador para liberar este módulo.
                </div>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* MÓDULO: VIPZ INFOGED • CLUBE DE BENEFÍCIOS & FIDELIDADE        */}
          {/* ============================================================== */}
          <div
            className={`relative bg-white rounded-2xl p-6 shadow-sm border transition flex flex-col justify-between overflow-hidden group ${
              canAccessVipz
                ? 'border-amber-300/80 hover:shadow-xl hover:border-amber-500'
                : 'border-slate-200 opacity-60'
            }`}
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-amber-500/15 via-yellow-500/10 to-transparent rounded-bl-full pointer-events-none transition group-hover:scale-125" />

            <div>
              {/* Topo do Card */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                  <Crown className="w-6 h-6 text-amber-100" />
                </div>
                {canAccessVipz ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    <span>Vipz Ativo</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold">
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>Não Liberado</span>
                  </div>
                )}
              </div>

              {/* Informações */}
              <div className="mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
                  Fidelização & Recompensas
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-amber-700 transition">
                  Vipz Infoged &bull; Clube de Benefícios
                </h3>
              </div>

              <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                Gestão completa de fidelidade: consulta por CPF, conversão de faturamento ERP em pontos, catálogo de prêmios com estoque e emissão de vouchers de resgate.
              </p>

              {/* Destaques das Funcionalidades */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 mb-5 text-center">
                <div>
                  <span className="text-[10px] text-amber-800 font-medium block">Níveis VIP</span>
                  <span className="text-xs font-black text-amber-900">Bronze a Black</span>
                </div>
                <div className="border-x border-amber-200">
                  <span className="text-[10px] text-amber-800 font-medium block">ERP Gestão</span>
                  <span className="text-xs font-black text-amber-900">Pronto p/ API</span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-800 font-medium block">Segurança</span>
                  <span className="text-xs font-black text-emerald-800">100% LGPD</span>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {canAccessVipz ? (
                <Link
                  href="/vipz"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4 text-amber-200" />
                  <span>Acessar Vipz Infoged</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="p-2 text-center text-xs text-slate-500 bg-slate-100 rounded-xl font-medium">
                  Contate o administrador para liberar este módulo.
                </div>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* MÓDULO 3: PEDIDO DE PRODUTOS & CENTRAL DE COTAÇÕES (ATIVO)     */}
          {/* ============================================================== */}
          <div
            className={`relative bg-white rounded-2xl p-6 shadow-sm border transition flex flex-col justify-between overflow-hidden group ${
              canAccessEstoque || isAdminOrManager
                ? 'border-cyan-300/80 hover:shadow-xl hover:border-cyan-500'
                : 'border-slate-200 opacity-60'
            }`}
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-cyan-500/15 via-blue-500/10 to-transparent rounded-bl-full pointer-events-none transition group-hover:scale-125" />

            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600 to-[#002B49] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                  <Package className="w-6 h-6 text-cyan-200" />
                </div>
                {canAccessEstoque || isAdminOrManager ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-300 text-cyan-900 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Módulo Ativo</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold">
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>Não Liberado</span>
                  </div>
                )}
              </div>

              <div className="mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 block">
                  Compras & Suprimentos ERP
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-cyan-800 transition">
                  Pedido de Produtos & Cotação
                </h3>
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Análise de giro de vendas por período, controle de estoque mínimo e máximo, montagem de cotações com exportação em Excel/PDF e histórico sequencial de cotações feitas.
              </p>

              {/* Destaques das 3 Funcionalidades */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-cyan-50/60 rounded-xl border border-cyan-200/60 mb-5 text-center">
                <div>
                  <span className="text-[10px] text-cyan-800 font-medium block">Menu 1</span>
                  <span className="text-xs font-black text-cyan-950">Últimas Vendas</span>
                </div>
                <div className="border-x border-cyan-200">
                  <span className="text-[10px] text-cyan-800 font-medium block">Menu 2</span>
                  <span className="text-xs font-black text-amber-900">Montar Cotação</span>
                </div>
                <div>
                  <span className="text-[10px] text-cyan-800 font-medium block">Menu 3</span>
                  <span className="text-xs font-black text-emerald-900">Cotações Feitas</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              {canAccessEstoque || isAdminOrManager ? (
                <Link
                  href="/pedidos"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-[#002B49] to-cyan-800 hover:from-[#001D33] hover:to-cyan-900 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4 text-cyan-200" />
                  <span>Acessar Pedido de Produtos</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="p-2 text-center text-xs text-slate-500 bg-slate-100 rounded-xl font-medium">
                  Contate o administrador para liberar este módulo.
                </div>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* MÓDULO 4: OUTSOURCING DE IMPRESSÃO (ATIVO)                    */}
          {/* ============================================================== */}
          <div
            className={`relative bg-white rounded-2xl p-6 shadow-sm border transition flex flex-col justify-between overflow-hidden group ${
              canAccessOutsourcing || isAdminOrManager
                ? 'border-blue-300/80 hover:shadow-xl hover:border-blue-500'
                : 'border-slate-200 opacity-60'
            }`}
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-blue-500/15 via-cyan-500/10 to-transparent rounded-bl-full pointer-events-none transition group-hover:scale-125" />

            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-[#002B49] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                  <Printer className="w-6 h-6 text-cyan-200" />
                </div>
                {canAccessOutsourcing || isAdminOrManager ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-300 text-blue-900 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Módulo Ativo</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold">
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>Não Liberado</span>
                  </div>
                )}
              </div>

              <div className="mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                  Contratos & Locações ERP
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-blue-800 transition">
                  Outsourcing de Impressão
                </h3>
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Gestão de contratos de locação integrados com o Gestão Click: apuração mensal de contadores, cálculo automático por franquia/página e histórico de trocas de equipamentos.
              </p>

              <div className="grid grid-cols-3 gap-2 p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 mb-5 text-center">
                <div>
                  <span className="text-[10px] text-blue-800 font-medium block">Menu 1</span>
                  <span className="text-xs font-black text-blue-950">Dashboard</span>
                </div>
                <div className="border-x border-blue-200">
                  <span className="text-[10px] text-blue-800 font-medium block">Menu 2</span>
                  <span className="text-xs font-black text-cyan-900">Locações</span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-800 font-medium block">ERP Gestão</span>
                  <span className="text-xs font-black text-emerald-900">Sync Ativo</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              {canAccessOutsourcing || isAdminOrManager ? (
                <Link
                  href="/outsourcing"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-700 to-[#002B49] hover:from-blue-800 hover:to-[#001D33] text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4 text-cyan-200" />
                  <span>Acessar Outsourcing</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="p-2 text-center text-xs text-slate-500 bg-slate-100 rounded-xl font-medium">
                  Contate o administrador para liberar este módulo.
                </div>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* MÓDULO 3: CHAMADOS DE TI & ATENDIMENTO (PLANEJADO)              */}
          {/* ============================================================== */}
          <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                  <Headphones className="w-6 h-6 text-purple-600" />
                </div>
                <div className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold">
                  <span>Planejado</span>
                </div>
              </div>

              <div className="mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">
                  Atendimento & Suporte
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Chamados & Suporte TI
                </h3>
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Central de tickets para suporte técnico, certificados digitais, atendimento a clientes corporativos e controle de SLA de chamados.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 mb-5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Módulo planejado para o ecossistema INFOGED.</span>
              </div>
            </div>

            <button
              disabled
              className="w-full py-2.5 px-4 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>{canAccessChamados ? 'Em Breve' : 'Não Liberado'}</span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* MÓDULO 4: GESTÃO CORPORATIVA & SEGURANÇA (ADMIN / GERENTE)      */}
          {/* ============================================================== */}
          {canAccessGestao && (
            <div className="relative bg-gradient-to-br from-slate-900 to-[#07241A] rounded-2xl p-6 shadow-sm border border-emerald-900/60 text-white flex flex-col justify-between md:col-span-2 lg:col-span-3 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Gestão Central da Plataforma INFOGED</span>
                  </div>
                  <h3 className="text-lg font-black text-white">
                    Gestão Geral de Usuários & Permissões por Aplicativo
                  </h3>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Cadastre novos colaboradores, selecione a quais aplicativos cada usuário terá acesso, desbloqueie contas e audite o histórico de ações.
                  </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-2.5 shrink-0">
                  <Link
                    href="/usuarios"
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    <span>Acessar Gestão de Usuários</span>
                  </Link>

                  <Link
                    href="/gerencia"
                    className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-2 border border-white/20"
                  >
                    <Settings className="w-4 h-4 text-emerald-300" />
                    <span>Parâmetros</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
