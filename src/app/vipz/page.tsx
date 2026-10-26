'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/app/ClientLayout';
import {
  Crown,
  Gift,
  Award,
  Search,
  UserPlus,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Printer,
  X,
  Plus,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Copy,
  Receipt,
  Users,
} from 'lucide-react';

interface VipzCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  pointsBalance: number;
  totalPointsAccumulated: number;
  totalPointsRedeemed: number;
  totalSpent: number;
  tier: 'BRONZE' | 'PRATA' | 'OURO' | 'VIPZ_BLACK' | string;
  transactions?: any[];
  redemptions?: any[];
}

interface VipzReward {
  id: string;
  title: string;
  description?: string;
  category: string;
  pointsCost: number;
  stock: number;
  imageUrl?: string;
}

export default function VipzInfogedPage() {
  const { currentUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'clientes' | 'recompensas' | 'vendas_erp' | 'extrato'>('clientes');

  // Busca e Seleção
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Modais
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditSaleValue, setCreditSaleValue] = useState('');
  const [creditSaleDesc, setCreditSaleDesc] = useState('');
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustCpf, setNewCustCpf] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [isSubmittingNewCust, setIsSubmittingNewCust] = useState(false);

  // Modal de Voucher Emitido
  const [voucherModal, setVoucherModal] = useState<{
    isOpen: boolean;
    voucherCode: string;
    rewardTitle: string;
    pointsSpent: number;
    customerName: string;
    newBalance: number;
  } | null>(null);

  const [copiedVoucher, setCopiedVoucher] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Carregar dados da API
  const fetchData = async (query = '') => {
    try {
      setLoading(true);
      const url = query ? `/api/vipz?q=${encodeURIComponent(query)}` : '/api/vipz';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.customers && json.customers.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(json.customers[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar Vipz:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(searchQuery);
  };

  const selectedCustomer: VipzCustomer | null = useMemo(() => {
    if (!data?.customers || !selectedCustomerId) return null;
    return data.customers.find((c: VipzCustomer) => c.id === selectedCustomerId) || data.customers[0] || null;
  }, [data, selectedCustomerId]);

  // Função para efetuar resgate
  const handleRedeem = async (reward: VipzReward) => {
    if (!selectedCustomer) {
      alert('Por favor, selecione primeiro o cliente que irá resgatar este prêmio.');
      setActiveTab('clientes');
      return;
    }

    if (selectedCustomer.pointsBalance < reward.pointsCost) {
      alert(`Saldo insuficiente! O cliente tem ${selectedCustomer.pointsBalance} pontos e este prêmio custa ${reward.pointsCost} pontos.`);
      return;
    }

    if (reward.stock <= 0) {
      alert('Este prêmio está temporariamente sem estoque.');
      return;
    }

    const confirmResgate = window.confirm(
      `Confirmar resgate de "${reward.title}" para ${selectedCustomer.name} por ${reward.pointsCost} pontos?`
    );
    if (!confirmResgate) return;

    try {
      setActionError(null);
      const res = await fetch('/api/vipz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REDEEM',
          customerId: selectedCustomer.id,
          rewardId: reward.id,
          userName: currentUser?.name || 'Atendente INFOGED',
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        alert(resJson.error || 'Erro ao processar resgate');
        return;
      }

      setVoucherModal({
        isOpen: true,
        voucherCode: resJson.voucherCode,
        rewardTitle: reward.title,
        pointsSpent: reward.pointsCost,
        customerName: selectedCustomer.name,
        newBalance: resJson.newBalance,
      });

      // Atualiza listagem
      fetchData(searchQuery);
    } catch (err: any) {
      console.error(err);
      alert('Falha ao comunicar com o servidor');
    }
  };

  // Função para creditar venda confirmada
  const handleCreditSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const val = parseFloat(creditSaleValue.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      alert('Digite um valor monetário válido para a venda.');
      return;
    }

    try {
      setIsSubmittingCredit(true);
      const res = await fetch('/api/vipz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREDIT_SALE',
          customerId: selectedCustomer.id,
          saleValue: val,
          description: creditSaleDesc || `Venda confirmada ERP - R$ ${val.toFixed(2)}`,
          userName: currentUser?.name || 'Atendente INFOGED',
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        alert(resJson.error || 'Erro ao creditar pontos');
        return;
      }

      alert(`Sucesso! Foram creditados ${resJson.pointsEarned} pontos para ${selectedCustomer.name}!`);
      setIsCreditModalOpen(false);
      setCreditSaleValue('');
      setCreditSaleDesc('');
      fetchData(searchQuery);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar crédito de venda');
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  // Função para criar novo cliente
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustCpf.trim()) {
      alert('Nome e CPF/CNPJ são obrigatórios');
      return;
    }

    try {
      setIsSubmittingNewCust(true);
      const res = await fetch('/api/vipz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_CUSTOMER',
          name: newCustName.trim(),
          cpfCnpj: newCustCpf.trim(),
          email: newCustEmail.trim() || null,
          phone: newCustPhone.trim() || null,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        alert(resJson.error || 'Erro ao cadastrar cliente');
        return;
      }

      alert(`Cliente ${newCustName} cadastrado com sucesso! Foi concedido um bônus inicial de 100 pontos.`);
      setIsNewCustomerModalOpen(false);
      setNewCustName('');
      setNewCustCpf('');
      setNewCustEmail('');
      setNewCustPhone('');
      fetchData(newCustCpf.trim());
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar cliente');
    } finally {
      setIsSubmittingNewCust(false);
    }
  };

  // Badge de Tier
  const renderTierBadge = (tier: string) => {
    switch (tier) {
      case 'VIPZ_BLACK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-300 border border-amber-500/50 text-[10px] font-black tracking-wider uppercase shadow-xs">
            <Crown className="w-3 h-3 text-amber-400" />
            VIPZ Black
          </span>
        );
      case 'OURO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold tracking-wider uppercase">
            <Award className="w-3 h-3 text-amber-600" />
            Ouro
          </span>
        );
      case 'PRATA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-extrabold tracking-wider uppercase">
            <Sparkles className="w-3 h-3 text-slate-500" />
            Prata
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200 text-[10px] font-bold tracking-wider uppercase">
            Bronze
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner Superior Vipz Infoged */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B251B] via-[#163E2E] to-[#0A1F16] text-white p-6 sm:p-8 shadow-xl border border-amber-500/30">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-bold backdrop-blur-sm">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Clube Oficial de Fidelidade & Vantagens</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-2">
              Vipz <span className="text-amber-400">Infoged</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Consulte pontos de clientes, converta faturamento ERP em vantagens exclusivas e emita vouchers de resgate de produtos e serviços.
            </p>
          </div>

          {/* Status da Conexão ERP */}
          <div className="bg-[#051811]/90 border border-emerald-500/30 rounded-2xl p-4 flex flex-col gap-2 min-w-[240px] text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Integração ERP Gestão:</span>
              {data?.isErpOnline ? (
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
                  Online (API)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-bold text-[10px]">
                  Modo Local Seguro
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-300 flex items-center gap-1.5 pt-1 border-t border-emerald-900/40">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Conformidade com LGPD Ativa</span>
            </div>

            <button
              onClick={() => fetchData(searchQuery)}
              className="mt-1 w-full py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-bold flex items-center justify-center gap-1.5 text-[11px]"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Sincronizar Dados</span>
            </button>
          </div>
        </div>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-emerald-900/50 text-xs">
          <div className="bg-[#061C14]/70 p-3 rounded-xl border border-emerald-800/30">
            <span className="text-[11px] text-slate-400 block">Clientes no Clube</span>
            <span className="text-lg font-black text-white">{data?.metrics?.totalCustomers ?? '...'}</span>
          </div>
          <div className="bg-[#061C14]/70 p-3 rounded-xl border border-emerald-800/30">
            <span className="text-[11px] text-slate-400 block">Pontos em Circulação</span>
            <span className="text-lg font-black text-amber-300">
              {data?.metrics?.totalPointsActive ? Number(data.metrics.totalPointsActive).toLocaleString('pt-BR') : '0'} pts
            </span>
          </div>
          <div className="bg-[#061C14]/70 p-3 rounded-xl border border-emerald-800/30">
            <span className="text-[11px] text-slate-400 block">Faturamento Fidelizado</span>
            <span className="text-lg font-black text-emerald-400">
              R$ {data?.metrics?.totalSpentGlobal ? Number(data.metrics.totalSpentGlobal).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
            </span>
          </div>
          <div className="bg-[#061C14]/70 p-3 rounded-xl border border-emerald-800/30">
            <span className="text-[11px] text-slate-400 block">Prêmios Resgatados</span>
            <span className="text-lg font-black text-cyan-300">{data?.metrics?.totalRedemptionsCount ?? 0} vouchers</span>
          </div>
        </div>
      </div>

      {/* Navegação entre Abas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('clientes')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeTab === 'clientes'
                ? 'bg-gradient-to-r from-[#07241A] to-[#0E3A2B] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Balcão de Clientes</span>
          </button>

          <button
            onClick={() => setActiveTab('recompensas')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeTab === 'recompensas'
                ? 'bg-gradient-to-r from-[#07241A] to-[#0E3A2B] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Gift className="w-4 h-4 text-amber-400" />
            <span>Catálogo de Prêmios & Vouchers</span>
          </button>

          <button
            onClick={() => setActiveTab('vendas_erp')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeTab === 'vendas_erp'
                ? 'bg-gradient-to-r from-[#07241A] to-[#0E3A2B] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4 text-cyan-400" />
            <span>Vendas ERP (Gestão Click)</span>
          </button>

          <button
            onClick={() => setActiveTab('extrato')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeTab === 'extrato'
                ? 'bg-gradient-to-r from-[#07241A] to-[#0E3A2B] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Extrato Global</span>
          </button>
        </div>

        <button
          onClick={() => setIsNewCustomerModalOpen(true)}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Cliente Vipz</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: BALCÃO DE CLIENTES & ATENDIMENTO                         */}
      {/* ============================================================== */}
      {activeTab === 'clientes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Busca e Lista de Clientes */}
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Buscar por Nome, CPF ou CNPJ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-20 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 px-3 py-1 bg-[#07241A] text-white rounded-lg text-xs font-bold hover:bg-[#0E3A2B] transition"
              >
                Buscar
              </button>
            </form>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                Carregando base de clientes do clube...
              </div>
            ) : data?.customers?.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-white rounded-2xl border border-slate-200">
                Nenhum cliente localizado para esta busca.
              </div>
            ) : (
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {data?.customers?.map((cust: VipzCustomer) => {
                  const isSelected = cust.id === selectedCustomer?.id;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => setSelectedCustomerId(cust.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-50/60 border-amber-400 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{cust.name}</h4>
                          {renderTierBadge(cust.tier)}
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">CPF: {cust.cpfCnpj}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-amber-600 block">
                          {cust.pointsBalance} <span className="text-[10px] font-bold">pts</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          R$ {cust.totalSpent.toFixed(2)} gastos
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coluna Direita: Cartão do Cliente Selecionado & Ações */}
          <div className="lg:col-span-7">
            {selectedCustomer ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                {/* Cabeçalho do Cartão */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cartão Vipz</span>
                      {renderTierBadge(selectedCustomer.tier)}
                    </div>
                    <h2 className="text-lg font-black text-slate-900">{selectedCustomer.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="font-mono">CPF/CNPJ: {selectedCustomer.cpfCnpj}</span>
                      {selectedCustomer.phone && <span>&bull; {selectedCustomer.phone}</span>}
                      {selectedCustomer.email && <span>&bull; {selectedCustomer.email}</span>}
                    </div>
                  </div>

                  {/* Saldo de Pontos */}
                  <div className="bg-gradient-to-br from-amber-500 to-amber-700 text-white px-5 py-3 rounded-2xl shadow-md text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-200 block">Saldo Atual</span>
                    <span className="text-2xl font-black">{selectedCustomer.pointsBalance}</span>
                    <span className="text-xs font-bold text-amber-100 ml-1">pontos</span>
                  </div>
                </div>

                {/* Botões Rápidos de Ação */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsCreditModalOpen(true)}
                    className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-900 transition flex items-center justify-between text-xs font-bold"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold">Lançar Nova Compra</span>
                        <span className="text-[10px] text-emerald-700 font-normal">Creditar pontos ao cliente</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-600" />
                  </button>

                  <button
                    onClick={() => setActiveTab('recompensas')}
                    className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-900 transition flex items-center justify-between text-xs font-bold"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold">Resgatar Prêmios</span>
                        <span className="text-[10px] text-amber-700 font-normal">Ver catálogo de brindes</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-600" />
                  </button>
                </div>

                {/* Extrato Recente do Cliente */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Últimas Movimentações deste Cliente
                  </h3>

                  {selectedCustomer.transactions && selectedCustomer.transactions.length > 0 ? (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                      {selectedCustomer.transactions.map((tx: any) => (
                        <div key={tx.id} className="p-3 flex items-center justify-between gap-3 text-xs bg-white hover:bg-slate-50 transition">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 block">{tx.description}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(tx.createdAt).toLocaleString('pt-BR')}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-xs font-black ${
                                tx.points >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {tx.points >= 0 ? `+${tx.points}` : tx.points} pts
                            </span>
                            {tx.saleValue && (
                              <span className="text-[10px] text-slate-400 block">
                                R$ {Number(tx.saleValue).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                      Nenhuma transação registrada para este cliente até o momento.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
                Selecione um cliente na lista à esquerda para visualizar seu cartão e histórico de fidelidade.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: CATÁLOGO DE PRÊMIOS & VOUCHERS                           */}
      {/* ============================================================== */}
      {activeTab === 'recompensas' && (
        <div className="space-y-4">
          {selectedCustomer && (
            <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                  <Crown className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">Cliente Ativo no Balcão:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedCustomer.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Saldo Disponível:</span>
                <span className="text-base font-black text-amber-700 bg-white px-3 py-1 rounded-xl border border-amber-300">
                  {selectedCustomer.pointsBalance} pts
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.rewards?.map((reward: VipzReward) => {
              const hasEnoughPoints = selectedCustomer ? selectedCustomer.pointsBalance >= reward.pointsCost : false;
              const hasStock = reward.stock > 0;

              return (
                <div
                  key={reward.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-400 transition group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {reward.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          hasStock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {hasStock ? `${reward.stock} em estoque` : 'Esgotado'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-amber-700 transition">
                        {reward.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {reward.description || 'Válido para troca imediata no balcão INFOGED.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-500">Custo do Resgate</span>
                      <span className="text-lg font-black text-amber-600">
                        {reward.pointsCost} <span className="text-xs font-bold text-slate-400">pontos</span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleRedeem(reward)}
                      disabled={!hasStock || (selectedCustomer && !hasEnoughPoints)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        !hasStock
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : selectedCustomer && !hasEnoughPoints
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-sm'
                      }`}
                    >
                      <Gift className="w-4 h-4 text-amber-200" />
                      <span>
                        {!hasStock
                          ? 'Item Indisponível'
                          : selectedCustomer && !hasEnoughPoints
                          ? `Faltam ${reward.pointsCost - selectedCustomer.pointsBalance} pts`
                          : 'Resgatar Prêmio Agora'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: VENDAS DO ERP (GESTÃO CLICK)                             */}
      {/* ============================================================== */}
      {activeTab === 'vendas_erp' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Vendas Confirmadas no ERP com Faturamento Liquidado
              </h3>
              <p className="text-slate-500 text-[11px]">
                Compras faturadas no Gestão Click aptas a pontuar no programa de fidelidade.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full font-bold text-[11px]">
              {data?.erpSales?.length ?? 0} Vendas Disponíveis
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.erpSales?.map((sale: any) => (
              <div key={sale.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {sale.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Pago / Liquidado
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{sale.cliente_nome}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(sale.data_emissao).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {/* Itens */}
                  <div className="space-y-1 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    {sale.itens?.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span className="line-clamp-1">{it.quantidade}x {it.nome}</span>
                        <span className="font-mono text-slate-500">R$ {it.valor_unitario.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Pago</span>
                    <span className="text-sm font-black text-slate-900">R$ {sale.valor_total.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={() => {
                      // Procura cliente pelo ID ou nome
                      const matchedCust = data?.customers?.find((c: VipzCustomer) =>
                        c.name.toLowerCase().includes(sale.cliente_nome.toLowerCase()) ||
                        sale.cliente_nome.toLowerCase().includes(c.name.toLowerCase())
                      );
                      if (matchedCust) {
                        setSelectedCustomerId(matchedCust.id);
                        setCreditSaleValue(sale.valor_total.toString());
                        setCreditSaleDesc(`Venda ERP #${sale.id} - ${sale.itens?.[0]?.nome || 'Produtos e Insumos'}`);
                        setIsCreditModalOpen(true);
                      } else {
                        alert(`Cliente "${sale.cliente_nome}" ainda não possui cadastro no Vipz. Por favor, cadastre-o primeiro.`);
                        setNewCustName(sale.cliente_nome);
                        setIsNewCustomerModalOpen(true);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-[#07241A] hover:bg-[#0E3A2B] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pontuar Venda</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 4: EXTRATO GLOBAL DE TRANSAÇÕES                            */}
      {/* ============================================================== */}
      {activeTab === 'extrato' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Histórico Consolidado de Créditos e Resgates do Clube
            </h3>
            <span className="text-xs text-slate-500">Últimos registros gravados</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {data?.customers?.flatMap((c: any) =>
              (c.transactions || []).map((t: any) => ({ ...t, customerName: c.name, customerCpf: c.cpfCnpj }))
            ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 30).map((t: any) => (
              <div key={t.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 transition">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{t.customerName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({t.customerCpf})</span>
                  </div>
                  <p className="text-[11px] text-slate-600">{t.description}</p>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {new Date(t.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-sm font-black ${
                      t.points >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {t.points >= 0 ? `+${t.points}` : t.points} pts
                  </span>
                  {t.saleValue && (
                    <span className="text-[10px] text-slate-400 block">
                      R$ {Number(t.saleValue).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: LANÇAR CRÉDITO DE VENDA                                 */}
      {/* ============================================================== */}
      {isCreditModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-500/30 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Creditar Pontos por Venda</h3>
                  <span className="text-[11px] text-slate-500">{selectedCustomer.name}</span>
                </div>
              </div>
              <button
                onClick={() => setIsCreditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreditSale} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Valor da Venda Confirmada no ERP (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={creditSaleValue}
                    onChange={(e) => setCreditSaleValue(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Cálculo automático: Paridade base R$ 1,00 = 1 ponto + Bônus da categoria {selectedCustomer.tier}.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Descrição ou Número do Pedido/NF
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pedido ERP #9102 - Tinta e Papel Fotográfico"
                  value={creditSaleDesc}
                  onChange={(e) => setCreditSaleDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-900">Pontos a Gerar:</span>
                <span className="text-base font-black text-amber-700">
                  {creditSaleValue && !isNaN(parseFloat(creditSaleValue))
                    ? Math.round(parseFloat(creditSaleValue) * (selectedCustomer.tier === 'VIPZ_BLACK' ? 2.0 : selectedCustomer.tier === 'OURO' ? 1.5 : selectedCustomer.tier === 'PRATA' ? 1.2 : 1.0))
                    : 0}{' '}
                  pts
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreditModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCredit}
                  className="w-1/2 py-2.5 bg-[#07241A] hover:bg-[#0E3A2B] text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSubmittingCredit ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirmar Crédito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVO CLIENTE VIPZ                                       */}
      {/* ============================================================== */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-500/30 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cadastrar no Vipz Infoged</h3>
                  <span className="text-[11px] text-slate-500">Ganha 100 pontos de boas-vindas</span>
                </div>
              </div>
              <button
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome Completo / Razão Social</label>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">CPF ou CNPJ</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={newCustCpf}
                  onChange={(e) => setNewCustCpf(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(81) 9...."
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="email@dominio.com"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewCust}
                  className="w-1/2 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSubmittingNewCust ? <RefreshCw className="w-4 h-4 animate-spin text-amber-200" /> : <Crown className="w-4 h-4" />}
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VOUCHER EMITIDO COM SUCESSO                             */}
      {/* ============================================================== */}
      {voucherModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-amber-400 space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white mx-auto flex items-center justify-center shadow-lg">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 block">
                Voucher de Resgate Vipz
              </span>
              <h3 className="text-lg font-black text-slate-900">{voucherModal.rewardTitle}</h3>
              <p className="text-xs text-slate-500">Emitido para: <strong>{voucherModal.customerName}</strong></p>
            </div>

            {/* Código do Voucher */}
            <div className="p-4 bg-slate-900 rounded-2xl text-amber-300 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Código de Validação</span>
              <span className="text-2xl font-black font-mono tracking-wider">{voucherModal.voucherCode}</span>
            </div>

            <div className="text-xs text-slate-500 flex justify-between px-2">
              <span>Pontos Debitados: <strong>{voucherModal.pointsSpent} pts</strong></span>
              <span>Novo Saldo: <strong>{voucherModal.newBalance} pts</strong></span>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(voucherModal.voucherCode);
                  setCopiedVoucher(true);
                  setTimeout(() => setCopiedVoucher(false), 2000);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition flex items-center justify-center gap-1.5 text-xs"
              >
                {copiedVoucher ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedVoucher ? 'Código Copiado!' : 'Copiar Código'}</span>
              </button>

              <button
                onClick={() => setVoucherModal(null)}
                className="w-full py-2.5 bg-[#07241A] hover:bg-[#0E3A2B] text-white font-bold rounded-xl transition text-xs shadow-sm"
              >
                Concluir & Entregar Prêmio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
