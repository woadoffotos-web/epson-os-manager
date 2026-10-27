'use client';

import React, { useState, useEffect } from 'react';
import CreateOsModal from '@/components/CreateOsModal';
import EditOsModal from '@/components/EditOsModal';
import { useApp } from '@/app/ClientLayout';
import { getOsSlaAlerts, computeTmfDays } from '@/lib/sla-alerts';
import {
  PlusCircle,
  Table as TableIcon,
  Search as SearchIcon,
  CheckCircle,
  Loader2,
  Calendar,
  AlertCircle,
  FileDown,
  Filter,
  Trash2,
  Pencil,
} from 'lucide-react';

export default function WorkOrdersPage() {
  const { currentUser } = useApp();

  // Abas do Controle de O.S. (Conforme especificado pelo usuário)
  const [activeTab, setActiveTab] = useState<'gerenciar' | 'pesquisa'>('gerenciar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  // Mês e Ano Selecionados (Gerenciar O.S.)
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  // Dados carregados
  const [orders, setOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [situations, setSituations] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado de feedback de salvamento automático
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);
  const [errorCriticism, setErrorCriticism] = useState<string | null>(null);

  // Estados de Pesquisa Avançada
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSituation, setFilterSituation] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterTechnician, setFilterTechnician] = useState('');
  const [filterRecurrent, setFilterRecurrent] = useState('');

  // 1. Carregar Dados de Configuração
  const loadConfigurations = async () => {
    try {
      const [mRes, uRes] = await Promise.all([
        fetch('/api/management'),
        fetch('/api/auth?action=technicians'),
      ]);
      const mData = await mRes.json();
      const uData = await uRes.json();

      setSituations(mData.situations || []);
      setLocations(mData.locations || []);
      setModels(mData.models || []);
      setTechnicians(uData.technicians || []);
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Carregar Ordens e Métricas do Mês
  const loadMonthData = async () => {
    try {
      setLoading(true);
      const [oRes, kRes] = await Promise.all([
        fetch(`/api/work-orders?month=${selectedMonth}&year=${selectedYear}`),
        fetch(`/api/metrics?month=${selectedMonth}&year=${selectedYear}`),
      ]);

      const oData = await oRes.json();
      const kData = await kRes.json();

      setOrders(oData.orders || []);
      setMetrics(kData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigurations();
  }, []);

  useEffect(() => {
    if (activeTab === 'gerenciar') {
      loadMonthData();
    }
  }, [selectedMonth, selectedYear, activeTab]);

  // 3. Salvamento Automático Instantâneo de Campo (Inline Auto-save)
  const handleAutoSave = async (orderId: string, field: string, value: any) => {
    try {
      setSavingId(orderId);
      setErrorCriticism(null);

      const updates: any = { [field]: value };

      const res = await fetch('/api/work-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          updates,
          userId: currentUser?.id,
          userAuthor: currentUser?.name || 'Administrador',
          userEmail: currentUser?.email || 'admin@epson.com.br',
          userRole: currentUser?.role || 'ADMIN',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 423) {
          alert(data.error);
        }
        setErrorCriticism(data.error || 'Erro na validação do campo.');
        return;
      }

      // Atualizar lista local com o objeto atualizado e recalcular indicadores
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...data.order } : o))
      );

      // Feedback visual
      setSaveSuccessId(orderId);
      setTimeout(() => setSaveSuccessId(null), 2500);

      // Recarregar métricas do topo
      const kRes = await fetch(`/api/metrics?month=${selectedMonth}&year=${selectedYear}`);
      const kData = await kRes.json();
      setMetrics(kData);
    } catch (err: any) {
      setErrorCriticism('Falha ao comunicar com o servidor.');
    } finally {
      setSavingId(null);
    }
  };

  // Permissão de exclusão e edição: Grupos ADMIN e GERÊNCIA
  const canDelete = currentUser?.role === 'ADMIN' || currentUser?.role === 'GERENTE';

  // 4. Apagar Ordem de Serviço Individualmente (ADMIN e GERÊNCIA)
  const handleDeleteOrder = async (orderId: string, osNumber: string) => {
    if (!canDelete) {
      alert('Acesso negado: Somente usuários dos perfis ADMIN e GERÊNCIA podem apagar ordens de serviço.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja apagar a Ordem de Serviço nº "${osNumber}"? Esta ação removerá o registro do sistema.`)) {
      return;
    }

    try {
      setSavingId(orderId);
      const res = await fetch(`/api/work-orders?id=${orderId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          userAuthor: currentUser?.name || 'Administrador',
          userEmail: currentUser?.email || 'admin@epson.com.br',
          userRole: currentUser?.role || 'ADMIN',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao apagar ordem de serviço.');
        return;
      }

      // Remover da lista de ordens localmente
      setOrders((prev) => prev.filter((o) => o.id !== orderId));

      // Recarregar os indicadores / métricas
      const kRes = await fetch(`/api/metrics?month=${selectedMonth}&year=${selectedYear}`);
      const kData = await kRes.json();
      setMetrics(kData);
    } catch (err: any) {
      console.error(err);
      alert('Falha de comunicação ao tentar apagar a ordem de serviço.');
    } finally {
      setSavingId(null);
    }
  };

  // 5. Abrir Modal de Edição Completa da O.S. (Campos acessíveis conforme o perfil de login)
  const handleOpenEditModal = async (order: any) => {
    // Verificar e adquirir bloqueio de concorrência antes de abrir a edição
    try {
      const res = await fetch('/api/locks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acquire',
          entityType: 'WorkOrder',
          entityId: order.id,
          userId: currentUser?.id || 'anonymous',
          userName: currentUser?.name || 'Usuário',
          userEmail: currentUser?.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Não é possível editar no momento: outro usuário está alterando este registro.');
        return;
      }
    } catch (e) {
      console.error('Erro ao verificar bloqueio:', e);
    }

    setEditingOrder(order);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = async () => {
    if (editingOrder) {
      try {
        await fetch('/api/locks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'release',
            entityType: 'WorkOrder',
            entityId: editingOrder.id,
            userId: currentUser?.id || 'anonymous',
          }),
        });
      } catch (e) {
        console.error('Erro ao liberar bloqueio:', e);
      }
    }
    setIsEditModalOpen(false);
    setEditingOrder(null);
  };

  const handleEditSuccess = () => {
    loadMonthData();
  };

  // Helper para formatar data ISO para input date (YYYY-MM-DD)
  const toInputDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toISOString().split('T')[0];
  };

  // Filtragem da Pesquisa Avançada
  const filteredOrders = orders.filter((o) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        o.osNumber.toLowerCase().includes(q) ||
        o.serialNumber.toLowerCase().includes(q) ||
        o.model?.name?.toLowerCase().includes(q) ||
        (o.notes && o.notes.toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (filterSituation && o.situationId !== filterSituation) return false;
    if (filterModel && o.modelId !== filterModel) return false;
    if (filterTechnician && o.technicianId !== filterTechnician) return false;
    if (filterRecurrent !== '') {
      const isRec = filterRecurrent === 'true';
      if (o.isRecurrent !== isRec) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Barra de Navegação dos 3 Botões de Controle de O.S. */}
      <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Botão 1: Cadastrar O.S. (Abre Pop-up Modal) */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#002B49] hover:bg-[#001B30] text-white rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4 text-cyan-400" />
            Cadastrar O.S.
          </button>

          {/* Botão 2: Gerenciar O.S. */}
          <button
            onClick={() => setActiveTab('gerenciar')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition ${
              activeTab === 'gerenciar'
                ? 'bg-cyan-700 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            Gerenciar O.S.
          </button>

          {/* Botão 3: Pesquisa */}
          <button
            onClick={() => setActiveTab('pesquisa')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition ${
              activeTab === 'pesquisa'
                ? 'bg-cyan-700 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <SearchIcon className="w-4 h-4" />
            Pesquisa Avançada
          </button>
        </div>

        {/* Seletor de Mês e Ano (Sempre disponível, padrão mês vigente) */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">Período:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="bg-white border border-slate-300 text-xs font-semibold text-slate-800 rounded px-2 py-1 focus:outline-none"
          >
            <option value={1}>Janeiro</option>
            <option value={2}>Fevereiro</option>
            <option value={3}>Março</option>
            <option value={4}>Abril</option>
            <option value={5}>Maio</option>
            <option value={6}>Junho</option>
            <option value={7}>Julho</option>
            <option value={8}>Agosto</option>
            <option value={9}>Setembro</option>
            <option value={10}>Outubro</option>
            <option value={11}>Novembro</option>
            <option value={12}>Dezembro</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-white border border-slate-300 text-xs font-semibold text-slate-800 rounded px-2 py-1 focus:outline-none"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>
        </div>
      </div>

      {/* Alerta de Crítica de Regra de Negócio */}
      {errorCriticism && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorCriticism}</span>
          </div>
          <button onClick={() => setErrorCriticism(null)} className="text-red-500 hover:text-red-800">
            ✕
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 1: GERENCIAR O.S.                                          */}
      {/* ============================================================== */}
      {activeTab === 'gerenciar' && (() => {
        const kpis = metrics?.kpis || {};
        const notaClassMensal = metrics?.notaClassMensal ?? metrics?.evaluation?.totalScore ?? 0;
        const classMensal = metrics?.classMensal ?? metrics?.evaluation?.tier ?? 'BASIC';
        const saldoCabecas = metrics?.saldoCabecasPedir ?? kpis?.saldoCabecasPedir ?? 0;
        const saldoPecas = metrics?.saldoPecasPedir ?? kpis?.saldoPecasPedir ?? 0;

        return (
          <div className="space-y-3">
            {/* Faixa dos Indicadores do Mês + Class Mensal + Saldos de Peças/Cabeça */}
            <div className="bg-white rounded-lg p-2.5 shadow-sm border border-slate-200 overflow-x-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2 text-center divide-x divide-slate-100">
                {/* 1. Ordens Atendidas */}
                <div className="px-2">
                  <span className="text-[11px] font-semibold text-slate-500 block">Ordens atendidas</span>
                  <span className="text-base font-black text-[#002B49]">{kpis.ordensAtendidas ?? 0}</span>
                </div>

                {/* 2. TMF */}
                <div className="px-2">
                  <span className="text-[11px] font-semibold text-slate-500 block">TMF</span>
                  <span className="text-base font-black text-cyan-700">
                    {(kpis.tmf ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 3. Cabeça */}
                <div className="px-2">
                  <span className="text-[11px] font-semibold text-slate-500 block">Cabeça</span>
                  <span className="text-base font-black text-slate-800">
                    {(kpis.cabecaPercent ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </span>
                </div>

                {/* 4. Cabeças a Pedir (Saldo para manter 5 pts) */}
                <div className="px-2 bg-slate-50/80 rounded">
                  <span className="text-[10px] font-bold text-slate-600 block" title="Cabeças que ainda pode faturar sem perder pontos (teto de 18% para 5,0 pts)">
                    Cabeças a Pedir
                  </span>
                  <span
                    className={`text-base font-black ${
                      saldoCabecas >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {saldoCabecas >= 0 ? '+' : ''}
                    {saldoCabecas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-slate-400 block -mt-0.5">Meta $\le$ 18%</span>
                </div>

                {/* 5. Reincidência */}
                <div className="px-2">
                  <span className="text-[11px] font-semibold text-slate-500 block">Reincidência</span>
                  <span className="text-base font-black text-slate-800">
                    {(kpis.reincidenciaPercent ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </span>
                </div>

                {/* 6. Peças */}
                <div className="px-2">
                  <span className="text-[11px] font-semibold text-slate-500 block">Peças</span>
                  <span className="text-base font-black text-slate-800">
                    {(kpis.pecasPercent ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </span>
                </div>

                {/* 7. Peças a Pedir (Saldo para manter 5 pts) */}
                <div className="px-2 bg-slate-50/80 rounded">
                  <span className="text-[10px] font-bold text-slate-600 block" title="Peças totais que ainda pode faturar sem perder pontos (teto de 95% para 5,0 pts)">
                    Peças a Pedir
                  </span>
                  <span
                    className={`text-base font-black ${
                      saldoPecas >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {saldoPecas >= 0 ? '+' : ''}
                    {saldoPecas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-slate-400 block -mt-0.5">Meta $\le$ 95%</span>
                </div>

                {/* 8. Ordens Enc. 30D */}
                <div className="px-2">
                  <span className="text-[11px] font-semibold text-slate-500 block">Ordens Enc. 30D</span>
                  <span className="text-base font-black text-emerald-600">
                    {(kpis.ordensEnc30DPercent ?? 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}%
                  </span>
                </div>

                {/* 9. Auditoria */}
                <div className="px-2">
                  <span className="text-[11px] font-semibold text-slate-500 block">Auditoria</span>
                  <span className="text-base font-black text-[#002B49]">
                    {(kpis.auditoriaScore ?? 90.1).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%
                  </span>
                </div>

                {/* 10. Nota Class Mensal */}
                <div className="px-2 bg-blue-50/60 rounded">
                  <span className="text-[10px] font-bold text-blue-900 block">Nota Class Mensal</span>
                  <span className="text-base font-black text-blue-900">
                    {notaClassMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-slate-400 block -mt-0.5">de 30,00 pts</span>
                </div>

                {/* 11. Class Mensal */}
                <div className="px-2 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-600 block">Class Mensal</span>
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full mt-0.5 tracking-wider uppercase ${
                      classMensal === 'PLATINUM'
                        ? 'bg-cyan-600 text-white'
                        : classMensal === 'GOLD'
                        ? 'bg-amber-500 text-white'
                        : classMensal === 'SILVER'
                        ? 'bg-slate-400 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {classMensal}
                  </span>
                </div>
              </div>
            </div>

          {/* Tabela de Gerenciamento de O.S. (Fiel à Tabela com Cabeçalhos Agrupados do Print) */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[650px] relative">
              <table className="w-full text-left border-collapse text-xs">
                {/* Linha 1 do Cabeçalho Agrupado */}
                <thead className="bg-[#002B49] text-white sticky top-0 z-20 select-none">
                  <tr className="border-b border-blue-900/60 text-[11px]">
                    <th rowSpan={2} className="px-2.5 py-2 font-bold whitespace-nowrap sticky left-0 z-30 bg-[#002B49] border-r border-blue-900 shadow-[2px_0_5px_rgba(0,0,0,0.25)]" title="Clique no número de qualquer O.S. para abrir a janela completa de edição com todos os campos">
                      <div className="flex items-center gap-1.5">
                        <span>ORDEM DE SERVIÇO</span>
                        <span className="text-[9px] font-normal text-cyan-300 opacity-80">(clique p/ abrir)</span>
                      </div>
                    </th>
                    <th rowSpan={2} className="px-2 py-2 font-bold whitespace-nowrap">MODELO</th>
                    <th rowSpan={2} className="px-2 py-2 font-bold whitespace-nowrap">Nº SÉRIE</th>
                    <th rowSpan={2} className="px-2 py-2 font-bold whitespace-nowrap">SITUAÇÃO</th>
                    <th rowSpan={2} className="px-2 py-2 font-bold whitespace-nowrap">LOCAL</th>
                    <th rowSpan={2} className="px-2 py-2 font-bold whitespace-nowrap text-center">Reincidência</th>
                    <th rowSpan={2} className="px-2 py-2 font-bold whitespace-nowrap text-center">TMF</th>
                    
                    {/* Grupo DATA (16 colunas) */}
                    <th colSpan={16} className="px-2 py-1 font-bold text-center bg-[#001B30] border-l border-r border-cyan-800">
                      DATA
                    </th>

                    <th rowSpan={2} className="px-2 py-2 font-bold whitespace-nowrap">TÉCNICO</th>
                    <th rowSpan={2} className="px-3 py-2 font-bold min-w-[200px]">COLOCAR NA ORDEM DE SERVIÇO</th>
                    {canDelete && (
                      <th rowSpan={2} className="px-2.5 py-2 font-bold whitespace-nowrap text-center bg-[#001B30] border-l border-cyan-800">
                        AÇÕES
                      </th>
                    )}
                  </tr>

                  {/* Linha 2 do Cabeçalho Agrupado sob DATA */}
                  <tr className="bg-[#001B30] text-[10px] text-cyan-200 border-b border-blue-950">
                    <th className="px-2 py-1 font-semibold whitespace-nowrap">ENTRADA</th>
                    <th className="px-2 py-1 font-semibold whitespace-nowrap">DIAGNÓSTICO</th>
                    {/* Grupo EMAIL */}
                    <th className="px-2 py-1 font-semibold whitespace-nowrap bg-blue-950">E-MAIL ENV.</th>
                    <th className="px-2 py-1 font-semibold whitespace-nowrap bg-blue-950">E-MAIL REC.</th>
                    {/* Grupo PEÇAS */}
                    <th className="px-2 py-1 font-semibold whitespace-nowrap bg-slate-900">PEDIDO</th>
                    <th className="px-2 py-1 font-semibold whitespace-nowrap bg-slate-900 text-yellow-300 font-bold">FATURAMENTO</th>
                    <th className="px-1.5 py-1 font-semibold whitespace-nowrap bg-slate-900 text-center">CABEÇA</th>
                    <th className="px-1.5 py-1 font-semibold whitespace-nowrap bg-slate-900 text-center">TOTAIS</th>
                    <th className="px-2 py-1 font-semibold whitespace-nowrap bg-slate-900">CHEGADA</th>
                    <th className="px-2 py-1 font-semibold whitespace-nowrap bg-slate-900 text-center">TROCAR TINTA</th>
                    {/* Outros marcos */}
                    <th className="px-2 py-1 font-semibold whitespace-nowrap text-emerald-300">CONSERTO</th>
                    <th className="px-2 py-1 font-semibold whitespace-nowrap">1º AVISO</th>
                    <th className="px-2 py-1 font-semibold whitespace-nowrap">2º AVISO</th>
                    <th className="px-2 py-1 font-semibold whitespace-nowrap">3º AVISO</th>
                    <th className="px-2 py-1 font-semibold whitespace-nowrap">SAÍDA SISTEMA</th>
                    <th className="px-2 py-1 font-semibold whitespace-nowrap">SAÍDA</th>
                  </tr>
                </thead>

                {/* Linhas de Dados com Edição Inline e Auto-Save */}
                <tbody className="divide-y divide-slate-200">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={canDelete ? 26 : 25} className="px-4 py-8 text-center text-slate-400">
                        Nenhuma Ordem de Serviço encontrada para o período selecionado.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => {
                      const alerts = getOsSlaAlerts(o);

                      return (
                        <tr
                          key={o.id}
                          className={`transition group ${
                            alerts.isFullRowAlert
                              ? 'bg-rose-100/70 hover:bg-rose-200/60 font-medium border-l-4 border-l-rose-600'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* 1. OS Number (Fixo/Sticky com clique para abrir janela completa de edição e SLA) */}
                          <td
                            className={`px-2.5 py-1.5 whitespace-nowrap transition sticky left-0 z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.06)] ${
                              alerts.isOsNumberAlert
                                ? 'bg-rose-100 text-rose-950 font-bold border-l-4 border-rose-500'
                                : alerts.isFullRowAlert
                                ? 'bg-rose-100 text-[#002B49] font-bold'
                                : 'bg-white group-hover:bg-slate-50 font-bold text-[#002B49]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(o)}
                                className="group/os inline-flex items-center gap-1 font-mono font-bold text-[#002B49] hover:text-cyan-700 hover:underline cursor-pointer transition text-left"
                                title="Clique para abrir a janela com todos os campos desta O.S."
                              >
                                <span>{o.osNumber}</span>
                                <span className="text-[10px] text-cyan-600 opacity-60 group-hover/os:opacity-100 transition-opacity">↗</span>
                              </button>

                              {alerts.isOsNumberAlert && (
                                <span
                                  className="px-1 py-0.2 rounded text-[9px] bg-rose-200 text-rose-900 font-extrabold uppercase shrink-0"
                                  title={
                                    alerts.fullRowReason === '27D'
                                      ? 'Atenção Crítica: Mais de 27 dias da entrada sem Saída do Sistema!'
                                      : alerts.fullRowReason === '8D'
                                      ? 'Estouro Crítico: Mais de 8 dias da entrada sem conclusão do conserto!'
                                      : 'Prazo estourado conforme regras de SLA'
                                  }
                                >
                                  {alerts.fullRowReason ? `SLA ${alerts.fullRowReason}` : 'SLA'}
                                </span>
                              )}
                              {saveSuccessId === o.id && (
                                <span className="ml-0.5 text-[10px] text-emerald-600 font-semibold animate-pulse shrink-0">✓ Salvo</span>
                              )}
                            </div>
                          </td>

                          {/* 2. Modelo (Fixo) */}
                          <td className="px-2 py-1.5 text-slate-700 font-medium whitespace-nowrap">
                            {o.model?.name}
                            <span className="text-[10px] text-slate-400 block">{o.model?.type?.name}</span>
                          </td>

                          {/* 3. Série (Fixo) */}
                          <td className="px-2 py-1.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {o.serialNumber}
                          </td>

                          {/* 4. Situação (Editável com cores pré-cadastradas) */}
                          <td className="px-1.5 py-1.5 whitespace-nowrap">
                            <select
                              value={o.situationId}
                              onChange={(e) => handleAutoSave(o.id, 'situationId', e.target.value)}
                              style={{ backgroundColor: o.situation?.color || '#e2e8f0' }}
                              className="text-xs font-bold px-2 py-0.5 rounded border border-slate-300 focus:outline-none cursor-pointer shadow-xs text-slate-900"
                            >
                              {situations.map((s) => (
                                <option key={s.id} value={s.id} style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* 5. Local (Dropdown de 1A a 16H) */}
                          <td className="px-1 py-1.5 whitespace-nowrap">
                            <select
                              value={o.locationId || ''}
                              onChange={(e) => handleAutoSave(o.id, 'locationId', e.target.value || null)}
                              className="text-xs font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300 focus:outline-none"
                            >
                              <option value="">-</option>
                              {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                  {loc.code}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* 6. Reincidência (Sim / Não com crítica dos 90 dias) */}
                          <td className="px-1 py-1.5 text-center whitespace-nowrap">
                            <select
                              value={o.isRecurrent ? 'true' : 'false'}
                              onChange={(e) => handleAutoSave(o.id, 'isRecurrent', e.target.value === 'true')}
                              className={`text-xs font-bold px-1.5 py-0.5 rounded border ${
                                o.isRecurrent
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-white text-slate-600 border-slate-300'
                              }`}
                            >
                              <option value="false">Não</option>
                              <option value="true">Sim</option>
                            </select>
                          </td>

                          {/* 7. TMF Calculado (Dias Corridos) */}
                          <td className="px-1.5 py-1.5 text-center font-bold text-cyan-800 whitespace-nowrap bg-cyan-50/40">
                            {computeTmfDays(o.entryDate, o.repairDate)}d
                          </td>

                          {/* 8. Entrada (Fixo) */}
                          <td className="px-2 py-1.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                            {toInputDate(o.entryDate)}
                          </td>

                          {/* 9. Diagnóstico (Alerta Regra 1) */}
                          <td className={`px-1 py-1 whitespace-nowrap ${alerts.isDiagnosisAlert ? 'bg-rose-100/90' : ''}`}>
                            <input
                              type="date"
                              defaultValue={toInputDate(o.diagnosisDate)}
                              onBlur={(e) => handleAutoSave(o.id, 'diagnosisDate', e.target.value || null)}
                              className={`rounded px-1 py-0.5 text-[11px] font-mono transition ${
                                alerts.isDiagnosisAlert
                                  ? 'bg-rose-100 text-rose-950 font-bold border border-rose-400 ring-1 ring-rose-400'
                                  : 'bg-transparent border border-transparent hover:border-slate-300 focus:border-cyan-500'
                              }`}
                            />
                          </td>

                          {/* 10. E-mail Enviado (Alerta Regra 2) */}
                          <td className={`px-1 py-1 whitespace-nowrap ${alerts.isEmailSentAlert ? 'bg-rose-100/90' : ''}`}>
                            <input
                              type="date"
                              defaultValue={toInputDate(o.emailSentDate)}
                              onBlur={(e) => handleAutoSave(o.id, 'emailSentDate', e.target.value || null)}
                              className={`rounded px-1 py-0.5 text-[11px] font-mono transition ${
                                alerts.isEmailSentAlert
                                  ? 'bg-rose-100 text-rose-950 font-bold border border-rose-400 ring-1 ring-rose-400'
                                  : 'bg-transparent border border-transparent hover:border-slate-300 focus:border-cyan-500'
                              }`}
                            />
                          </td>

                          {/* 11. E-mail Recebido (Alerta Regra 3) */}
                          <td className={`px-1 py-1 whitespace-nowrap ${alerts.isEmailReceivedAlert ? 'bg-rose-100/90' : ''}`}>
                            <input
                              type="date"
                              defaultValue={toInputDate(o.emailReceivedDate)}
                              onBlur={(e) => handleAutoSave(o.id, 'emailReceivedDate', e.target.value || null)}
                              className={`rounded px-1 py-0.5 text-[11px] font-mono transition ${
                                alerts.isEmailReceivedAlert
                                  ? 'bg-rose-100 text-rose-950 font-bold border border-rose-400 ring-1 ring-rose-400'
                                  : 'bg-transparent border border-transparent hover:border-slate-300 focus:border-cyan-500'
                              }`}
                            />
                          </td>

                          {/* 12. Peças: Pedido (Alerta Regra 4) */}
                          <td className={`px-1 py-1 whitespace-nowrap ${alerts.isPartsOrderAlert ? 'bg-rose-100/90' : ''}`}>
                            <input
                              type="date"
                              defaultValue={toInputDate(o.partsOrderDate)}
                              onBlur={(e) => handleAutoSave(o.id, 'partsOrderDate', e.target.value || null)}
                              className={`rounded px-1 py-0.5 text-[11px] font-mono transition ${
                                alerts.isPartsOrderAlert
                                  ? 'bg-rose-100 text-rose-950 font-bold border border-rose-400 ring-1 ring-rose-400'
                                  : 'bg-transparent border border-transparent hover:border-slate-300 focus:border-cyan-500'
                              }`}
                            />
                          </td>

                          {/* 13. Peças: Faturamento (Novo campo crucial para os indicadores) */}
                          <td className="px-1 py-1 whitespace-nowrap bg-yellow-50/50">
                            <input
                              type="date"
                              defaultValue={toInputDate(o.partsInvoiceDate)}
                              onBlur={(e) => handleAutoSave(o.id, 'partsInvoiceDate', e.target.value || null)}
                              className="bg-transparent border border-transparent hover:border-yellow-400 focus:border-yellow-600 rounded px-1 py-0.5 text-[11px] font-mono font-bold text-yellow-900"
                            />
                          </td>

                          {/* 14. Peças: Cabeça (0 a 10) */}
                          <td className="px-1 py-1 text-center whitespace-nowrap">
                            <select
                              value={o.partsHeadQty ?? 0}
                              onChange={(e) => handleAutoSave(o.id, 'partsHeadQty', parseInt(e.target.value, 10))}
                              className="bg-transparent border border-transparent hover:border-slate-300 font-bold text-xs rounded px-1 py-0.5"
                            >
                              {Array.from({ length: 11 }, (_, i) => (
                                <option key={i} value={i}>
                                  {i}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* 15. Peças: Totais (0 a 30) */}
                          <td className="px-1 py-1 text-center whitespace-nowrap">
                            <select
                              value={o.partsTotalQty ?? 0}
                              onChange={(e) => handleAutoSave(o.id, 'partsTotalQty', parseInt(e.target.value, 10))}
                              className="bg-transparent border border-transparent hover:border-slate-300 font-bold text-xs rounded px-1 py-0.5"
                            >
                              {Array.from({ length: 31 }, (_, i) => (
                                <option key={i} value={i}>
                                  {i}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* 16. Peças: Chegada (Alerta Regra 6) */}
                          <td className={`px-1 py-1 whitespace-nowrap ${alerts.isPartsArrivalAlert ? 'bg-rose-100/90' : ''}`}>
                            <input
                              type="date"
                              defaultValue={toInputDate(o.partsArrivalDate)}
                              onBlur={(e) => handleAutoSave(o.id, 'partsArrivalDate', e.target.value || null)}
                              className={`rounded px-1 py-0.5 text-[11px] font-mono transition ${
                                alerts.isPartsArrivalAlert
                                  ? 'bg-rose-100 text-rose-950 font-bold border border-rose-400 ring-1 ring-rose-400'
                                  : 'bg-transparent border border-transparent hover:border-slate-300 focus:border-cyan-500'
                              }`}
                            />
                          </td>

                          {/* 17. Peças: Trocar Tinta (Sim / Não) */}
                          <td className="px-1 py-1 text-center whitespace-nowrap">
                            <select
                              value={o.partsChangeInk ? 'true' : 'false'}
                              onChange={(e) => handleAutoSave(o.id, 'partsChangeInk', e.target.value === 'true')}
                              className="text-xs bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-0.5"
                            >
                              <option value="false">Não</option>
                              <option value="true">Sim</option>
                            </select>
                          </td>

                          {/* 18. Conserto (Alerta Regras 5, 7, 8, 9) */}
                          <td className={`px-1 py-1 whitespace-nowrap ${alerts.isRepairAlert ? 'bg-rose-100/90' : 'bg-emerald-50/40'}`}>
                            <input
                              type="date"
                              defaultValue={toInputDate(o.repairDate)}
                              onBlur={(e) => handleAutoSave(o.id, 'repairDate', e.target.value || null)}
                              className={`rounded px-1 py-0.5 text-[11px] font-mono font-bold transition ${
                                alerts.isRepairAlert
                                  ? 'bg-rose-100 text-rose-950 border border-rose-400 ring-1 ring-rose-400'
                                  : 'bg-transparent border border-transparent hover:border-emerald-400 focus:border-emerald-600 text-emerald-900'
                              }`}
                            />
                          </td>

                        {/* 19. 1º Aviso (Alerta Regra 10) */}
                        <td className={`px-1 py-1 whitespace-nowrap ${alerts.isNotice1Alert ? 'bg-rose-100/90' : ''}`}>
                          <input
                            type="date"
                            defaultValue={toInputDate(o.notice1Date)}
                            onBlur={(e) => handleAutoSave(o.id, 'notice1Date', e.target.value || null)}
                            className={`rounded px-1 py-0.5 text-[11px] font-mono transition ${
                              alerts.isNotice1Alert
                                ? 'bg-rose-100 text-rose-950 font-bold border border-rose-400 ring-1 ring-rose-400'
                                : 'bg-transparent border border-transparent hover:border-slate-300'
                            }`}
                          />
                        </td>

                        {/* 20. 2º Aviso (Alerta Regra 11) */}
                        <td className={`px-1 py-1 whitespace-nowrap ${alerts.isNotice2Alert ? 'bg-rose-100/90' : ''}`}>
                          <input
                            type="date"
                            defaultValue={toInputDate(o.notice2Date)}
                            onBlur={(e) => handleAutoSave(o.id, 'notice2Date', e.target.value || null)}
                            className={`rounded px-1 py-0.5 text-[11px] font-mono transition ${
                              alerts.isNotice2Alert
                                ? 'bg-rose-100 text-rose-950 font-bold border border-rose-400 ring-1 ring-rose-400'
                                : 'bg-transparent border border-transparent hover:border-slate-300'
                            }`}
                          />
                        </td>

                        {/* 21. 3º Aviso (Alerta Regra 12) */}
                        <td className={`px-1 py-1 whitespace-nowrap ${alerts.isNotice3Alert ? 'bg-rose-100/90' : ''}`}>
                          <input
                            type="date"
                            defaultValue={toInputDate(o.notice3Date)}
                            onBlur={(e) => handleAutoSave(o.id, 'notice3Date', e.target.value || null)}
                            className={`rounded px-1 py-0.5 text-[11px] font-mono transition ${
                              alerts.isNotice3Alert
                                ? 'bg-rose-100 text-rose-950 font-bold border border-rose-400 ring-1 ring-rose-400'
                                : 'bg-transparent border border-transparent hover:border-slate-300'
                            }`}
                          />
                        </td>

                        {/* 22. Saída Sistema (Baixa SAP - Alerta Regra 13) */}
                        <td className={`px-1 py-1 whitespace-nowrap ${alerts.isSystemExitAlert ? 'bg-rose-100/90' : ''}`}>
                          <input
                            type="date"
                            defaultValue={toInputDate(o.systemExitDate)}
                            onBlur={(e) => handleAutoSave(o.id, 'systemExitDate', e.target.value || null)}
                            className={`rounded px-1 py-0.5 text-[11px] font-mono font-semibold transition ${
                              alerts.isSystemExitAlert
                                ? 'bg-rose-100 text-rose-950 font-bold border border-rose-400 ring-1 ring-rose-400'
                                : 'bg-transparent border border-transparent hover:border-slate-300 text-blue-900'
                            }`}
                          />
                        </td>

                        {/* 23. Saída Física (Alerta Regra 14 - Saída do Sistema preenchida sem Saída física) */}
                        <td className={`px-1 py-1 whitespace-nowrap ${alerts.isExitAlert ? 'bg-rose-100/90' : ''}`}>
                          <input
                            type="date"
                            defaultValue={toInputDate(o.exitDate)}
                            onBlur={(e) => handleAutoSave(o.id, 'exitDate', e.target.value || null)}
                            className={`rounded px-1 py-0.5 text-[11px] font-mono transition ${
                              alerts.isExitAlert
                                ? 'bg-rose-100 text-rose-950 font-bold border border-rose-400 ring-1 ring-rose-400'
                                : 'bg-transparent border border-transparent hover:border-slate-300'
                            }`}
                          />
                        </td>

                        {/* 24. Técnico Responsável */}
                        <td className="px-1.5 py-1.5 whitespace-nowrap">
                          <select
                            value={o.technicianId || ''}
                            onChange={(e) => handleAutoSave(o.id, 'technicianId', e.target.value || null)}
                            className="text-xs bg-white px-2 py-0.5 rounded border border-slate-300 focus:outline-none"
                          >
                            <option value="">Não atribuído</option>
                            {technicians.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 25. Colocar na Ordem de Serviço (Texto Livre) */}
                        <td className="px-2 py-1 min-w-[200px]">
                          <input
                            type="text"
                            defaultValue={o.notes || ''}
                            placeholder="Observações / instruções..."
                            onBlur={(e) => handleAutoSave(o.id, 'notes', e.target.value)}
                            className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-cyan-500 rounded px-1.5 py-0.5 text-xs text-slate-700"
                          />
                        </td>

                        {/* 26. Ações (Editar e Excluir para ADMIN e GERÊNCIA) */}
                        {canDelete && (
                          <td className="px-2 py-1 text-center whitespace-nowrap border-l border-slate-100">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(o)}
                                className="p-1.5 text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 rounded transition"
                                title={`Editar dados de cadastro da O.S. ${o.osNumber}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOrder(o.id, o.osNumber)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                title={`Apagar O.S. ${o.osNumber}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ============================================================== */}
      {/* ABA 2: PESQUISA AVANÇADA                                       */}
      {/* ============================================================== */}
      {activeTab === 'pesquisa' && (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-[#002B49]">Pesquisa e Filtros de Ordens de Serviço</h2>
              <p className="text-xs text-slate-500">
                Consulte ordens por qualquer campo cadastrado com filtros dinâmicos
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded bg-slate-100 text-slate-700">
              {filteredOrders.length} ordens encontradas
            </span>
          </div>

          {/* Painel de Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Busca Geral</label>
              <input
                type="text"
                placeholder="Nº OS, Série, Modelo, Notas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-cyan-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Situação</label>
              <select
                value={filterSituation}
                onChange={(e) => setFilterSituation(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 bg-white focus:outline-none"
              >
                <option value="">Todas as situações</option>
                {situations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Modelo</label>
              <select
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 bg-white focus:outline-none"
              >
                <option value="">Todos os modelos</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.type.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Técnico</label>
              <select
                value={filterTechnician}
                onChange={(e) => setFilterTechnician(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 bg-white focus:outline-none"
              >
                <option value="">Todos os técnicos</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Reincidência</label>
              <select
                value={filterRecurrent}
                onChange={(e) => setFilterRecurrent(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 bg-white focus:outline-none"
              >
                <option value="">Todos</option>
                <option value="true">Apenas Reincidentes (Sim)</option>
                <option value="false">Apenas Não Reincidentes</option>
              </select>
            </div>
          </div>

          {/* Resultados da Pesquisa */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">O.S.</th>
                  <th className="p-2.5">Modelo</th>
                  <th className="p-2.5">Série</th>
                  <th className="p-2.5">Situação</th>
                  <th className="p-2.5">Local</th>
                  <th className="p-2.5">Entrada</th>
                  <th className="p-2.5">Conserto</th>
                  <th className="p-2.5">TMF</th>
                  <th className="p-2.5">Técnico</th>
                  <th className="p-2.5">Reincidência</th>
                  {canDelete && <th className="p-2.5 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={canDelete ? 11 : 10} className="p-6 text-center text-slate-400">
                      Nenhuma ordem corresponde aos filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => {
                    const searchAlerts = getOsSlaAlerts(o);
                    return (
                      <tr
                        key={o.id}
                        className={`transition ${
                          searchAlerts.isFullRowAlert
                            ? 'bg-rose-100/70 hover:bg-rose-200/60 font-medium'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className={`p-2.5 font-bold ${searchAlerts.isOsNumberAlert ? 'text-rose-900 bg-rose-100/80 rounded' : 'text-[#002B49]'}`}>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(o)}
                              className="group/os inline-flex items-center gap-1 font-mono font-bold text-[#002B49] hover:text-cyan-700 hover:underline cursor-pointer transition text-left"
                              title="Clique para abrir a janela com todos os campos desta O.S."
                            >
                              <span>{o.osNumber}</span>
                              <span className="text-[10px] text-cyan-600 opacity-60 group-hover/os:opacity-100 transition-opacity">↗</span>
                            </button>
                            {searchAlerts.isOsNumberAlert && (
                              <span className="px-1 py-0.2 rounded text-[9px] bg-rose-200 text-rose-900 font-extrabold uppercase shrink-0">
                                {searchAlerts.fullRowReason ? `SLA ${searchAlerts.fullRowReason}` : 'SLA'}
                              </span>
                            )}
                          </div>
                        </td>
                      <td className="p-2.5 font-medium">{o.model?.name}</td>
                      <td className="p-2.5 font-mono">{o.serialNumber}</td>
                      <td className="p-2.5">
                        <span
                          style={{ backgroundColor: o.situation?.color }}
                          className="px-2 py-0.5 rounded text-[11px] font-bold"
                        >
                          {o.situation?.name}
                        </span>
                      </td>
                      <td className="p-2.5 font-semibold text-slate-600">{o.location?.code || '-'}</td>
                      <td className="p-2.5 font-mono">{toInputDate(o.entryDate)}</td>
                      <td className="p-2.5 font-mono">{toInputDate(o.repairDate) || '-'}</td>
                      <td className="p-2.5 font-bold text-cyan-800">
                        {computeTmfDays(o.entryDate, o.repairDate)}d
                      </td>
                      <td className="p-2.5">{o.technician?.name || '-'}</td>
                      <td className="p-2.5">
                        {o.isRecurrent ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                            SIM (90D)
                          </span>
                        ) : (
                          <span className="text-slate-400">Não</span>
                        )}
                      </td>
                      {canDelete && (
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(o)}
                              className="p-1 text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 rounded transition"
                              title={`Editar dados de cadastro da O.S. ${o.osNumber}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(o.id, o.osNumber)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              title={`Apagar O.S. ${o.osNumber}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pop-up Modal de Cadastrar O.S. */}
      <CreateOsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadMonthData();
        }}
        situations={situations}
        models={models}
        currentUser={currentUser}
      />

      {/* Pop-up Modal de Editar O.S. (ADMIN e GERÊNCIA) */}
      <EditOsModal
        isOpen={isEditModalOpen}
        order={editingOrder}
        onClose={handleCloseEditModal}
        onSuccess={handleEditSuccess}
        situations={situations}
        models={models}
        locations={locations}
        technicians={technicians}
        currentUser={currentUser}
      />
    </div>
  );
}
