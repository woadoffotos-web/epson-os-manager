'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/app/ClientLayout';
import InfogedLogo from '@/components/InfogedLogo';
import { exportTableToExcel } from '@/lib/export-excel';
import {
  Printer,
  LayoutDashboard,
  FileText,
  RefreshCw,
  Search,
  PlusCircle,
  Eye,
  Edit2,
  Trash2,
  Repeat,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  X,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';

interface Leitura {
  id: string;
  locacaoId: string;
  dataLeitura: string;
  contadorInicial: number;
  contadorAtual: number;
  consumo: number;
  franquia: number;
  valorPorPagina: number;
  valorTotal: number;
  observacoes?: string | null;
  equipamentoInfo?: string | null;
  criadoPor?: string | null;
}

interface Substituicao {
  id: string;
  locacaoId: string;
  dataSubstituicao: string;
  modeloAnterior: string;
  numeroSerieAnterior?: string | null;
  contadorFinalAnterior: number;
  modeloNovo: string;
  numeroSerieNovo?: string | null;
  contadorInicialNovo: number;
  motivo?: string | null;
  criadoPor?: string | null;
}

interface Locacao {
  id: string;
  contratoGestaoId: string;
  codigoContrato: string;
  clienteId?: string | null;
  nomeCliente: string;
  modeloEquipamento: string;
  numeroSerie?: string | null;
  franquia: number;
  valorPorPagina: number;
  valorTotalContrato: number;
  situacao: string;
  dataInicio?: string | null;
  proximoVencimento?: string | null;
  diaVencimento?: string | null;
  periodicidade?: string | null;
  observacoes?: string | null;
  contadorAtual?: number | null;
  dataUltimaLeitura?: string | null;
  leituras: Leitura[];
  substituicoes: Substituicao[];
}

export default function OutsourcingPage() {
  const { currentUser } = useApp();

  // Menus Principais
  const [activeTab, setActiveTab] = useState<'dashboard' | 'locacoes'>('locacoes');

  // Dados das Locações e Dashboard
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtros de busca
  const [filtroBusca, setFiltroBusca] = useState('');

  // Estados dos inputs da linha (Contador e Data para atualização rápida)
  const [linhaInputs, setLinhaInputs] = useState<Record<string, { contador: string; data: string }>>({});
  const [savingLinhaId, setSavingLinhaId] = useState<string | null>(null);

  // Modal 1: Visualizar Histórico de Contadores da Locação
  const [locacaoEmVisualizacao, setLocacaoEmVisualizacao] = useState<Locacao | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Modal 2: Inserir Contadores Anteriores / Histórico Manual
  const [isInserirLeituraModalOpen, setIsInserirLeituraModalOpen] = useState(false);
  const [novaLeituraForm, setNovaLeituraForm] = useState({
    contadorInicial: '',
    contadorAtual: '',
    dataLeitura: new Date().toISOString().split('T')[0],
    observacoes: '',
  });
  const [savingLeitura, setSavingLeitura] = useState(false);

  // Modal 3: Editar Leitura Existente
  const [leituraEmEdicao, setLeituraEmEdicao] = useState<Leitura | null>(null);
  const [isEditLeituraModalOpen, setIsEditLeituraModalOpen] = useState(false);
  const [editLeituraForm, setEditLeituraForm] = useState({
    contadorInicial: '',
    contadorAtual: '',
    dataLeitura: '',
    observacoes: '',
  });
  const [savingEditLeitura, setSavingEditLeitura] = useState(false);

  // Modal 4: Substituir Equipamento (Troca de Máquina)
  const [locacaoEmSubstituicao, setLocacaoEmSubstituicao] = useState<Locacao | null>(null);
  const [isSubstituicaoModalOpen, setIsSubstituicaoModalOpen] = useState(false);
  const [substituicaoForm, setSubstituicaoForm] = useState({
    modeloNovo: '',
    numeroSerieNovo: '',
    contadorFinalAnterior: '',
    contadorInicialNovo: '',
    motivo: '',
    sincronizarGestao: true,
  });
  const [savingSubstituicao, setSavingSubstituicao] = useState(false);

  // Modal 5: Editar Dados da Locação (Modelo, Franquia, Valor por página e Sync Gestão)
  const [locacaoEmEdicao, setLocacaoEmEdicao] = useState<Locacao | null>(null);
  const [isEditLocacaoModalOpen, setIsEditLocacaoModalOpen] = useState(false);
  const [editLocacaoForm, setEditLocacaoForm] = useState({
    modeloEquipamento: '',
    numeroSerie: '',
    franquia: '',
    valorPorPagina: '',
    sincronizarGestao: true,
  });
  const [savingEditLocacao, setSavingEditLocacao] = useState(false);

  // Carrega as locações e métricas da API
  const carregarLocacoes = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await fetch('/api/outsourcing?action=locacoes');
      const data = await res.json();
      if (res.ok) {
        setLocacoes(data.locacoes || []);
        setDashboardMetrics(data.dashboard || null);

        // Inicializa os inputs de data para a data de hoje nas linhas
        const todayStr = new Date().toISOString().split('T')[0];
        setLinhaInputs((prev) => {
          const next = { ...prev };
          (data.locacoes || []).forEach((l: Locacao) => {
            if (!next[l.id]) {
              next[l.id] = { contador: '', data: todayStr };
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error('Erro ao carregar locações:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    carregarLocacoes();
  }, []);

  // Botão 1: "Atualizar Locações" (Sincroniza com Gestão Click)
  const handleSincronizarGestao = async () => {
    try {
      setSyncing(true);
      setFeedbackMessage(null);
      const res = await fetch('/api/outsourcing?action=sincronizar', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMessage({
          type: 'success',
          text: data.message || 'Locações sincronizadas com o Gestão Click!',
        });
        await carregarLocacoes(true);
      } else {
        setFeedbackMessage({
          type: 'error',
          text: data.error || 'Erro ao sincronizar com o Gestão Click.',
        });
      }
    } catch (err) {
      console.error(err);
      setFeedbackMessage({
        type: 'error',
        text: 'Falha de comunicação com o servidor.',
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setFeedbackMessage(null), 8000);
    }
  };

  // Botão "Atualizar" no final da Linha de cada Locação
  const handleSalvarLeituraLinha = async (locacao: Locacao) => {
    const inputs = linhaInputs[locacao.id];
    if (!inputs || !inputs.contador || isNaN(Number(inputs.contador))) {
      alert(`Informe um valor numérico válido para o Contador da locação de "${locacao.nomeCliente}".`);
      return;
    }

    try {
      setSavingLinhaId(locacao.id);
      const res = await fetch('/api/outsourcing?action=atualizar_leitura_rapida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locacaoId: locacao.id,
          contadorAtual: inputs.contador,
          dataLeitura: inputs.data || new Date().toISOString().split('T')[0],
          criadoPor: currentUser?.name || 'Colaborador',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao salvar leitura.');
        return;
      }

      // Atualiza localmente a locação com os novos dados
      setLocacoes((prev) => prev.map((l) => (l.id === locacao.id ? data.locacao : l)));
      
      // Limpa o input de contador da linha mantendo a data
      setLinhaInputs((prev) => ({
        ...prev,
        [locacao.id]: { contador: '', data: prev[locacao.id]?.data || new Date().toISOString().split('T')[0] },
      }));

      setFeedbackMessage({
        type: 'success',
        text: data.message || `Leitura atualizada para "${locacao.nomeCliente}"!`,
      });
      setTimeout(() => setFeedbackMessage(null), 6000);
    } catch (err) {
      console.error(err);
      alert('Falha ao comunicar com o servidor.');
    } finally {
      setSavingLinhaId(null);
    }
  };

  // Abrir Modal de Visualização de Histórico
  const handleOpenViewModal = (locacao: Locacao) => {
    setLocacaoEmVisualizacao(locacao);
    setIsViewModalOpen(true);
  };

  // Abrir Modal de Inserir Contadores Anteriores
  const handleOpenInserirLeituraModal = () => {
    if (!locacaoEmVisualizacao) return;
    const ultima = locacaoEmVisualizacao.leituras[0];
    setNovaLeituraForm({
      contadorInicial: ultima ? String(ultima.contadorAtual) : '0',
      contadorAtual: '',
      dataLeitura: new Date().toISOString().split('T')[0],
      observacoes: '',
    });
    setIsInserirLeituraModalOpen(true);
  };

  // Salvar Leitura Manual / Histórico
  const handleSalvarLeituraManual = async () => {
    if (!locacaoEmVisualizacao) return;

    if (!novaLeituraForm.contadorInicial || !novaLeituraForm.contadorAtual) {
      alert('Preencha o contador inicial e o contador atual.');
      return;
    }

    try {
      setSavingLeitura(true);
      const res = await fetch('/api/outsourcing?action=inserir_leitura_manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locacaoId: locacaoEmVisualizacao.id,
          contadorInicial: novaLeituraForm.contadorInicial,
          contadorAtual: novaLeituraForm.contadorAtual,
          dataLeitura: novaLeituraForm.dataLeitura,
          observacoes: novaLeituraForm.observacoes,
          criadoPor: currentUser?.name || 'Colaborador',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao registrar leitura.');
        return;
      }

      setLocacoes((prev) => prev.map((l) => (l.id === locacaoEmVisualizacao.id ? data.locacao : l)));
      setLocacaoEmVisualizacao(data.locacao);
      setIsInserirLeituraModalOpen(false);

      setFeedbackMessage({
        type: 'success',
        text: 'Contador anterior inserido com sucesso!',
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err) {
      console.error(err);
      alert('Falha ao comunicar com o servidor.');
    } finally {
      setSavingLeitura(false);
    }
  };

  // Abrir Edição de Leitura Existente
  const handleOpenEditLeituraModal = (leitura: Leitura) => {
    setLeituraEmEdicao(leitura);
    setEditLeituraForm({
      contadorInicial: String(leitura.contadorInicial),
      contadorAtual: String(leitura.contadorAtual),
      dataLeitura: new Date(leitura.dataLeitura).toISOString().split('T')[0],
      observacoes: leitura.observacoes || '',
    });
    setIsEditLeituraModalOpen(true);
  };

  // Salvar Edição de Leitura
  const handleSalvarEditLeitura = async () => {
    if (!leituraEmEdicao || !locacaoEmVisualizacao) return;

    try {
      setSavingEditLeitura(true);
      const res = await fetch('/api/outsourcing?action=editar_leitura', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leituraId: leituraEmEdicao.id,
          contadorInicial: editLeituraForm.contadorInicial,
          contadorAtual: editLeituraForm.contadorAtual,
          dataLeitura: editLeituraForm.dataLeitura,
          observacoes: editLeituraForm.observacoes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao atualizar leitura.');
        return;
      }

      setLocacoes((prev) => prev.map((l) => (l.id === locacaoEmVisualizacao.id ? data.locacao : l)));
      setLocacaoEmVisualizacao(data.locacao);
      setIsEditLeituraModalOpen(false);
      setLeituraEmEdicao(null);
    } catch (err) {
      console.error(err);
      alert('Falha ao comunicar com o servidor.');
    } finally {
      setSavingEditLeitura(false);
    }
  };

  // Excluir Leitura do Histórico
  const handleExcluirLeitura = async (leituraId: string) => {
    if (!locacaoEmVisualizacao) return;
    if (!confirm('Deseja realmente excluir este registro de leitura? O cálculo do faturamento deste mês será removido.')) {
      return;
    }

    try {
      const res = await fetch(`/api/outsourcing?action=excluir_leitura&leituraId=${leituraId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao excluir leitura.');
        return;
      }

      setLocacoes((prev) => prev.map((l) => (l.id === locacaoEmVisualizacao.id ? data.locacao : l)));
      setLocacaoEmVisualizacao(data.locacao);
    } catch (err) {
      console.error(err);
      alert('Falha ao excluir leitura.');
    }
  };

  // Abrir Modal de Substituição de Equipamento
  const handleOpenSubstituicaoModal = (locacao: Locacao) => {
    setLocacaoEmSubstituicao(locacao);
    setSubstituicaoForm({
      modeloNovo: '',
      numeroSerieNovo: '',
      contadorFinalAnterior: String(locacao.contadorAtual || '0'),
      contadorInicialNovo: '0',
      motivo: '',
      sincronizarGestao: true,
    });
    setIsSubstituicaoModalOpen(true);
  };

  // Salvar Substituição de Equipamento
  const handleSalvarSubstituicao = async () => {
    if (!locacaoEmSubstituicao) return;
    if (!substituicaoForm.modeloNovo.trim()) {
      alert('Informe o modelo do novo equipamento.');
      return;
    }

    try {
      setSavingSubstituicao(true);
      const res = await fetch('/api/outsourcing?action=substituir_equipamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locacaoId: locacaoEmSubstituicao.id,
          modeloNovo: substituicaoForm.modeloNovo.trim(),
          numeroSerieNovo: substituicaoForm.numeroSerieNovo.trim() || null,
          contadorFinalAnterior: substituicaoForm.contadorFinalAnterior,
          contadorInicialNovo: substituicaoForm.contadorInicialNovo,
          motivo: substituicaoForm.motivo,
          sincronizarGestao: substituicaoForm.sincronizarGestao,
          criadoPor: currentUser?.name || 'Colaborador',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao substituir equipamento.');
        return;
      }

      setLocacoes((prev) => prev.map((l) => (l.id === locacaoEmSubstituicao.id ? data.locacao : l)));
      if (locacaoEmVisualizacao && locacaoEmVisualizacao.id === locacaoEmSubstituicao.id) {
        setLocacaoEmVisualizacao(data.locacao);
      }

      setIsSubstituicaoModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: data.message || 'Equipamento substituído com sucesso!',
      });
      setTimeout(() => setFeedbackMessage(null), 6000);
    } catch (err) {
      console.error(err);
      alert('Falha ao comunicar com o servidor.');
    } finally {
      setSavingSubstituicao(false);
    }
  };

  // Abrir Modal de Edição de Dados da Locação
  const handleOpenEditLocacaoModal = (locacao: Locacao) => {
    setLocacaoEmEdicao(locacao);
    setEditLocacaoForm({
      modeloEquipamento: locacao.modeloEquipamento || '',
      numeroSerie: locacao.numeroSerie || '',
      franquia: String(locacao.franquia || '0'),
      valorPorPagina: String(locacao.valorPorPagina || '0'),
      sincronizarGestao: true,
    });
    setIsEditLocacaoModalOpen(true);
  };

  // Salvar Edição de Dados da Locação
  const handleSalvarEditLocacao = async () => {
    if (!locacaoEmEdicao) return;

    try {
      setSavingEditLocacao(true);
      const res = await fetch('/api/outsourcing?action=editar_locacao', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locacaoId: locacaoEmEdicao.id,
          modeloEquipamento: editLocacaoForm.modeloEquipamento,
          numeroSerie: editLocacaoForm.numeroSerie,
          franquia: editLocacaoForm.franquia,
          valorPorPagina: editLocacaoForm.valorPorPagina,
          sincronizarGestao: editLocacaoForm.sincronizarGestao,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao atualizar dados da locação.');
        return;
      }

      setLocacoes((prev) => prev.map((l) => (l.id === locacaoEmEdicao.id ? data.locacao : l)));
      if (locacaoEmVisualizacao && locacaoEmVisualizacao.id === locacaoEmEdicao.id) {
        setLocacaoEmVisualizacao(data.locacao);
      }

      setIsEditLocacaoModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: data.message || 'Locação atualizada com sucesso!',
      });
      setTimeout(() => setFeedbackMessage(null), 6000);
    } catch (err) {
      console.error(err);
      alert('Falha ao comunicar com o servidor.');
    } finally {
      setSavingEditLocacao(false);
    }
  };

  // Exportar Tabela para Excel
  const handleExportExcel = () => {
    const dataToExport = locacoesFiltradas.map((l) => ({
      'Nº Contrato': l.codigoContrato,
      'Cliente': l.nomeCliente,
      'Modelo Equipamento': l.modeloEquipamento || 'Não informado',
      'Número de Série': l.numeroSerie || '-',
      'Franquia (Págs)': l.franquia,
      'Valor por Página (R$)': l.valorPorPagina,
      'Último Contador': l.contadorAtual ?? '-',
      'Data Última Leitura': l.dataUltimaLeitura ? new Date(l.dataUltimaLeitura).toLocaleDateString('pt-BR') : '-',
      'Situação': l.situacao,
    }));
    exportTableToExcel(dataToExport, 'Outsourcing_Locacoes_Infoged');
  };

  // Filtragem das Locações
  const locacoesFiltradas = useMemo(() => {
    if (!filtroBusca.trim()) return locacoes;
    const term = filtroBusca.toLowerCase().trim();
    return locacoes.filter(
      (l) =>
        l.nomeCliente.toLowerCase().includes(term) ||
        l.modeloEquipamento.toLowerCase().includes(term) ||
        l.codigoContrato.toLowerCase().includes(term) ||
        (l.numeroSerie && l.numeroSerie.toLowerCase().includes(term))
    );
  }, [locacoes, filtroBusca]);

  return (
    <div className="space-y-6 pb-14 text-slate-800">
      {/* Banner Superior com Logo INFOGED e Identidade Visual Outsourcing */}
      <div className="bg-gradient-to-r from-[#002B49] via-[#0B3C61] to-[#052136] rounded-2xl p-6 text-white shadow-lg border border-cyan-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold backdrop-blur-sm">
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Outsourcing de Impressão • Gestão de Locações ERP</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Controle de Locações & Contadores
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Integração direta com o Gestão Click para importação de assinaturas ativas, apuração mensal de contadores, cálculo automático de excedentes por franquia e histórico de substituição de equipamentos.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>Hub INFOGED</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Alerta de Feedback Global */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold shadow-md transition ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
              : 'bg-rose-50 text-rose-950 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="p-1 hover:bg-slate-200/50 rounded-lg text-slate-500 hover:text-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navegação entre os Menus: Dashboard e Gerenciar Locações */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {/* Menu 1: Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs ${
              activeTab === 'dashboard'
                ? 'bg-[#002B49] text-white shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          {/* Menu 2: Gerenciar Locações */}
          <button
            onClick={() => setActiveTab('locacoes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs ${
              activeTab === 'locacoes'
                ? 'bg-[#002B49] text-white shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Gerenciar Locações</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 text-cyan-900 border border-cyan-300">
              {locacoes.length}
            </span>
          </button>
        </div>

        {/* Botão de Destaque: "Atualizar Locações" do Gestão Click */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSincronizarGestao}
            disabled={syncing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            title="Buscar novas assinaturas e contratos ativos no Gestão Click ERP"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-100 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Buscando no Gestão Click...' : 'Atualizar Locações'}</span>
          </button>

          {activeTab === 'locacoes' && (
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Exportar listagem para Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Exportar Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ABA 1: DASHBOARD DE OUTSOURCING                                      */}
      {/* ==================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Contratos Ativos */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Contratos Ativos
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {dashboardMetrics?.totalAtivas ?? locacoes.length}
                </span>
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Sincronizados com Gestão Click
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                <Printer className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            {/* Card 2: Franquia Total de Páginas */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Franquia Contratada
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                  {(dashboardMetrics?.totalFranquiaPaginas ?? 0).toLocaleString('pt-BR')} págs
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Volume mensal contratado
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                <Layers className="w-6 h-6 text-purple-600" />
              </div>
            </div>

            {/* Card 3: Faturamento Recorrente Mensal (MRR) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Faturamento Recorrente (MRR)
                </span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block font-mono">
                  R$ {(dashboardMetrics?.mrrEstimado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Base mínima garantida
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>

            {/* Card 4: Leituras Pendentes no Mês */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Leituras do Mês Atual
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900">
                    {dashboardMetrics?.leiturasMesAtualCount ?? 0}
                  </span>
                  <span className="text-xs text-slate-400">
                    de {dashboardMetrics?.totalAtivas ?? locacoes.length} colhidas
                  </span>
                </div>
                <span className={`text-[11px] font-bold block mt-0.5 ${
                  (dashboardMetrics?.leiturasPendentesMes ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {(dashboardMetrics?.leiturasPendentesMes ?? 0) > 0
                    ? `⚠️ ${dashboardMetrics?.leiturasPendentesMes} pendente(s)`
                    : '✓ 100% das leituras colhidas'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          {/* Gráfico / Resumo das Locações Ativas */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-cyan-700" />
                <span>Locações em Operação por Volume de Franquia</span>
              </h3>
              <button
                onClick={() => setActiveTab('locacoes')}
                className="text-xs font-bold text-cyan-800 hover:text-cyan-950 flex items-center gap-1"
              >
                <span>Ver Todas as Locações</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {locacoes.slice(0, 9).map((l) => (
                <div
                  key={l.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
                      #{l.codigoContrato}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      {l.situacao}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1" title={l.nomeCliente}>
                    {l.nomeCliente}
                  </h4>

                  <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span>Equipamento:</span>
                    <span className="font-semibold text-slate-800">{l.modeloEquipamento || 'Não especificado'}</span>
                  </div>

                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                    <span>Franquia:</span>
                    <span className="font-mono font-bold text-slate-900">{l.franquia.toLocaleString('pt-BR')} págs</span>
                  </div>

                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                    <span>Último Contador:</span>
                    <span className="font-mono font-bold text-blue-700">
                      {l.contadorAtual !== null && l.contadorAtual !== undefined
                        ? l.contadorAtual.toLocaleString('pt-BR')
                        : 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 2: GERENCIAR LOCAÇÕES                                            */}
      {/* ==================================================================== */}
      {activeTab === 'locacoes' && (
        <div className="space-y-4">
          {/* Barra de Filtro e Busca */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                placeholder="Pesquisar por cliente, modelo do equipamento, contrato ou número de série..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
              {filtroBusca && (
                <button
                  onClick={() => setFiltroBusca('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Exibindo <strong>{locacoesFiltradas.length}</strong> de <strong>{locacoes.length}</strong> locações
            </div>
          </div>

          {/* Tabela de Locações com os Campos de Contador e Data na Linha */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[680px]">
              <table id="tabela-locacoes" className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#002B49] text-white text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Nº Contrato</th>
                    <th className="px-4 py-3 min-w-[220px]">Nome do Cliente</th>
                    <th className="px-4 py-3 min-w-[160px]">Modelo Equipamento</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Franquia</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">Vr. Página</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap bg-blue-950/70 border-x border-blue-900">
                      Último Contador
                    </th>
                    {/* Campos de Inserção na Linha: Contador e Data */}
                    <th className="px-3 py-3 text-center min-w-[130px] bg-cyan-900/80">
                      Novo Contador
                    </th>
                    <th className="px-3 py-3 text-center min-w-[130px] bg-cyan-900/80">
                      Data da Leitura
                    </th>
                    <th className="px-4 py-3 text-center whitespace-nowrap bg-[#001D33] sticky right-0 z-20">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-600 mb-2" />
                        <span>Carregando locações cadastradas...</span>
                      </td>
                    </tr>
                  ) : locacoesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400">
                        <Printer className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">Nenhuma locação encontrada.</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Clique no botão "Atualizar Locações" no topo para importar as assinaturas ativas do Gestão Click.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    locacoesFiltradas.map((l, idx) => {
                      const isSavingThis = savingLinhaId === l.id;
                      const inputs = linhaInputs[l.id] || { contador: '', data: new Date().toISOString().split('T')[0] };

                      return (
                        <tr
                          key={l.id}
                          className={`hover:bg-slate-50 transition border-b border-slate-100 ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                          }`}
                        >
                          {/* Nº Contrato */}
                          <td className="px-3 py-2.5 text-center font-mono font-black text-cyan-950 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-cyan-100 border border-cyan-300">
                              #{l.codigoContrato}
                            </span>
                          </td>

                          {/* Nome do Cliente */}
                          <td className="px-4 py-2.5 font-bold text-slate-900">
                            <div>{l.nomeCliente}</div>
                            {l.numeroSerie && (
                              <div className="text-[10px] text-slate-500 font-mono">S/N: {l.numeroSerie}</div>
                            )}
                          </td>

                          {/* Modelo do Equipamento (campo detalhes) */}
                          <td className="px-4 py-2.5 text-slate-800 font-medium">
                            {l.modeloEquipamento ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-slate-700">
                                {l.modeloEquipamento}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Não informado</span>
                            )}
                          </td>

                          {/* Franquia (campo quantidade) */}
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                            {l.franquia.toLocaleString('pt-BR')} págs
                          </td>

                          {/* Valor por Página (campo vr. unitario) */}
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                            R$ {l.valorPorPagina.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                          </td>

                          {/* Último Contador Registrado */}
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-blue-900 bg-blue-50/40 whitespace-nowrap">
                            {l.contadorAtual !== null && l.contadorAtual !== undefined ? (
                              <div>
                                <span>{l.contadorAtual.toLocaleString('pt-BR')}</span>
                                {l.dataUltimaLeitura && (
                                  <div className="text-[10px] text-slate-400 font-normal">
                                    {new Date(l.dataUltimaLeitura).toLocaleDateString('pt-BR')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal italic">Pendente</span>
                            )}
                          </td>

                          {/* Campo 1 na Linha: NOVO CONTADOR */}
                          <td className="px-2 py-1.5 text-center bg-cyan-50/30">
                            <input
                              type="number"
                              min="0"
                              placeholder="Ex: 12500"
                              value={inputs.contador}
                              onChange={(e) =>
                                setLinhaInputs((prev) => ({
                                  ...prev,
                                  [l.id]: { ...inputs, contador: e.target.value },
                                }))
                              }
                              className="w-full px-2 py-1.5 text-center font-mono font-bold text-xs bg-white border border-cyan-400 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-600 shadow-xs"
                            />
                          </td>

                          {/* Campo 2 na Linha: DATA DA LEITURA */}
                          <td className="px-2 py-1.5 text-center bg-cyan-50/30">
                            <input
                              type="date"
                              value={inputs.data}
                              onChange={(e) =>
                                setLinhaInputs((prev) => ({
                                  ...prev,
                                  [l.id]: { ...inputs, data: e.target.value },
                                }))
                              }
                              className="w-full px-2 py-1.5 text-center font-mono text-xs bg-white border border-cyan-400 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-600 shadow-xs"
                            />
                          </td>

                          {/* Coluna de Ações: Botão Atualizar (Linha), Visualizar, Trocar e Editar */}
                          <td className="px-3 py-2 text-center whitespace-nowrap bg-white sticky right-0 z-10 border-l border-slate-200 shadow-xs">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Botão 1: ATUALIZAR LEITURA DA LINHA */}
                              <button
                                type="button"
                                onClick={() => handleSalvarLeituraLinha(l)}
                                disabled={isSavingThis}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer disabled:opacity-50"
                                title="Salvar contador e data colhidos para esta locação"
                              >
                                {isSavingThis ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                                )}
                                <span>Atualizar</span>
                              </button>

                              {/* Botão 2: VISUALIZAR HISTÓRICO */}
                              <button
                                type="button"
                                onClick={() => handleOpenViewModal(l)}
                                className="px-2.5 py-1.5 bg-[#002B49] hover:bg-[#001D33] text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title="Visualizar histórico de contadores e valores anteriores"
                              >
                                <Eye className="w-3.5 h-3.5 text-cyan-300" />
                                <span>Visualizar</span>
                              </button>

                              {/* Botão 3: SUBSTITUIR EQUIPAMENTO */}
                              <button
                                type="button"
                                onClick={() => handleOpenSubstituicaoModal(l)}
                                className="px-2 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title="Substituir máquina/equipamento e reiniciar contador"
                              >
                                <Repeat className="w-3.5 h-3.5 text-purple-200" />
                                <span className="hidden xl:inline">Trocar Máq.</span>
                              </button>

                              {/* Botão 4: EDITAR DADOS CONTRATUAIS */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditLocacaoModal(l)}
                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition cursor-pointer"
                                title="Editar dados da locação e sincronizar com Gestão Click"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: VISUALIZAR HISTÓRICO DE CONTADORES E FATURAMENTOS           */}
      {/* ==================================================================== */}
      {isViewModalOpen && locacaoEmVisualizacao && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            {/* Topo do Modal */}
            <div className="p-5 bg-gradient-to-r from-[#002B49] to-[#0A3C61] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-400/30">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-900 text-cyan-300 text-xs font-bold font-mono">
                      Contrato #{locacaoEmVisualizacao.codigoContrato}
                    </span>
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded">
                      {locacaoEmVisualizacao.situacao}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white mt-0.5">
                    {locacaoEmVisualizacao.nomeCliente}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações Resumidas do Contrato */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
              <div>
                <span className="text-slate-500 font-medium block">Modelo do Equipamento:</span>
                <span className="font-bold text-slate-800">{locacaoEmVisualizacao.modeloEquipamento || 'Não especificado'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Franquia Contratada:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {locacaoEmVisualizacao.franquia.toLocaleString('pt-BR')} págs
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Valor por Página:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  R$ {locacaoEmVisualizacao.valorPorPagina.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Último Contador Atual:</span>
                <span className="font-bold text-blue-700 font-mono">
                  {locacaoEmVisualizacao.contadorAtual !== null && locacaoEmVisualizacao.contadorAtual !== undefined
                    ? locacaoEmVisualizacao.contadorAtual.toLocaleString('pt-BR')
                    : 'Nenhum'}
                </span>
              </div>
            </div>

            {/* Botão de Destaque: "Inserir Contadores Anteriores" */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Histórico de Leituras Mensais & Faturamento
                </h4>
                <p className="text-[11px] text-slate-500">
                  Valores calculados com base no consumo apurado vs franquia mínima garantida.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenInserirLeituraModal}
                className="px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-blue-200" />
                <span>Inserir Contadores Anteriores</span>
              </button>
            </div>

            {/* Tabela de Leituras Mensais Anteriores */}
            <div className="p-4 overflow-y-auto flex-1">
              {locacaoEmVisualizacao.leituras.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">Nenhum contador anterior cadastrado ainda.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Clique em "Inserir Contadores Anteriores" acima para cadastrar os períodos passados.
                  </p>
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">Data da Leitura</th>
                      <th className="p-2.5 text-center">Contador Inicial</th>
                      <th className="p-2.5 text-center">Contador Atual</th>
                      <th className="p-2.5 text-center">Consumo (Págs)</th>
                      <th className="p-2.5 text-center">Base Cobrança</th>
                      <th className="p-2.5 text-right">Valor Total (R$)</th>
                      <th className="p-2.5 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {locacaoEmVisualizacao.leituras.map((leit) => {
                      const isMaiorFranquia = leit.consumo > leit.franquia;

                      return (
                        <tr key={leit.id} className="hover:bg-slate-50 transition">
                          <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                            {new Date(leit.dataLeitura).toLocaleDateString('pt-BR')}
                            {leit.observacoes && (
                              <div className="text-[10px] text-slate-500 font-normal italic">
                                {leit.observacoes}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-600">
                            {leit.contadorInicial.toLocaleString('pt-BR')}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-blue-900">
                            {leit.contadorAtual.toLocaleString('pt-BR')}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                            {leit.consumo.toLocaleString('pt-BR')}
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            {isMaiorFranquia ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Excedente ({leit.consumo} págs)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                Franquia ({leit.franquia} págs)
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-mono font-black text-emerald-800 text-sm whitespace-nowrap">
                            R$ {leit.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditLeituraModal(leit)}
                                className="p-1 hover:bg-slate-200 text-slate-600 rounded transition"
                                title="Editar leitura"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExcluirLeitura(leit.id)}
                                className="p-1 hover:bg-rose-100 text-rose-600 rounded transition"
                                title="Excluir leitura"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Histórico de Substituições de Equipamento se houver */}
              {locacaoEmVisualizacao.substituicoes && locacaoEmVisualizacao.substituicoes.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-purple-900 mb-2 flex items-center gap-1.5">
                    <Repeat className="w-4 h-4 text-purple-700" />
                    <span>Histórico de Trocas / Substituições de Equipamento</span>
                  </h4>
                  <div className="space-y-2">
                    {locacaoEmVisualizacao.substituicoes.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-purple-950">
                            {new Date(sub.dataSubstituicao).toLocaleDateString('pt-BR')}:
                          </span>{' '}
                          Substituído equipamento anterior <strong>{sub.modeloAnterior}</strong> (Contador final:{' '}
                          {sub.contadorFinalAnterior}) pelo novo <strong>{sub.modeloNovo}</strong> (Contador inicial:{' '}
                          {sub.contadorInicialNovo}).
                        </div>
                        {sub.motivo && (
                          <div className="text-[11px] text-purple-800 italic">Motivo: {sub.motivo}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: INSERIR CONTADORES ANTERIORES                               */}
      {/* ==================================================================== */}
      {isInserirLeituraModalOpen && locacaoEmVisualizacao && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-4 bg-[#002B49] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-cyan-300" />
                <span>Inserir Contadores Anteriores</span>
              </h3>
              <button
                onClick={() => setIsInserirLeituraModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Data da Leitura:</label>
                <input
                  type="date"
                  value={novaLeituraForm.dataLeitura}
                  onChange={(e) => setNovaLeituraForm({ ...novaLeituraForm, dataLeitura: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Contador Inicial:</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 5000"
                    value={novaLeituraForm.contadorInicial}
                    onChange={(e) =>
                      setNovaLeituraForm({ ...novaLeituraForm, contadorInicial: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Contador Atual:</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 7500"
                    value={novaLeituraForm.contadorAtual}
                    onChange={(e) =>
                      setNovaLeituraForm({ ...novaLeituraForm, contadorAtual: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Demonstração do Cálculo em Tempo Real */}
              {(() => {
                const cIni = Number(novaLeituraForm.contadorInicial) || 0;
                const cAtu = Number(novaLeituraForm.contadorAtual) || 0;
                const consumo = Math.max(0, cAtu - cIni);
                const fran = locacaoEmVisualizacao.franquia;
                const vrPag = locacaoEmVisualizacao.valorPorPagina;
                const paginasFaturadas = consumo > fran ? consumo : fran;
                const total = paginasFaturadas * vrPag;

                return (
                  <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl space-y-1 text-[11px] text-cyan-950">
                    <div className="flex justify-between">
                      <span>Consumo Apurado (Atual - Inicial):</span>
                      <strong className="font-mono">{consumo} págs</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Franquia Contratada:</span>
                      <strong className="font-mono">{fran} págs</strong>
                    </div>
                    <div className="flex justify-between border-t border-cyan-200 pt-1 font-bold text-xs text-emerald-800">
                      <span>Valor Previsto da Fatura:</span>
                      <span className="font-mono">R$ {total.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-slate-600 font-bold mb-1">Observações (Opcional):</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Leitura referente ao mês de Julho..."
                  value={novaLeituraForm.observacoes}
                  onChange={(e) => setNovaLeituraForm({ ...novaLeituraForm, observacoes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsInserirLeituraModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarLeituraManual}
                disabled={savingLeitura}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingLeitura && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Salvar Leitura</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: EDITAR LEITURA EXISTENTE                                    */}
      {/* ==================================================================== */}
      {isEditLeituraModalOpen && leituraEmEdicao && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-300" />
                <span>Editar Leitura</span>
              </h3>
              <button
                onClick={() => setIsEditLeituraModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Data da Leitura:</label>
                <input
                  type="date"
                  value={editLeituraForm.dataLeitura}
                  onChange={(e) => setEditLeituraForm({ ...editLeituraForm, dataLeitura: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Contador Inicial:</label>
                  <input
                    type="number"
                    min="0"
                    value={editLeituraForm.contadorInicial}
                    onChange={(e) =>
                      setEditLeituraForm({ ...editLeituraForm, contadorInicial: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Contador Atual:</label>
                  <input
                    type="number"
                    min="0"
                    value={editLeituraForm.contadorAtual}
                    onChange={(e) =>
                      setEditLeituraForm({ ...editLeituraForm, contadorAtual: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Observações:</label>
                <textarea
                  rows={2}
                  value={editLeituraForm.observacoes}
                  onChange={(e) => setEditLeituraForm({ ...editLeituraForm, observacoes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditLeituraModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarEditLeitura}
                disabled={savingEditLeitura}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingEditLeitura && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: SUBSTITUIR EQUIPAMENTO                                      */}
      {/* ==================================================================== */}
      {isSubstituicaoModalOpen && locacaoEmSubstituicao && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-4 bg-purple-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Repeat className="w-4 h-4 text-purple-300" />
                <span>Substituição de Equipamento</span>
              </h3>
              <button
                onClick={() => setIsSubstituicaoModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-950">
                <div className="font-bold">Locação: {locacaoEmSubstituicao.nomeCliente}</div>
                <div className="text-[11px] text-purple-800 mt-0.5">
                  Equipamento Atual: <strong>{locacaoEmSubstituicao.modeloEquipamento || 'Não especificado'}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Contador Final Máquina Antiga:</label>
                  <input
                    type="number"
                    min="0"
                    value={substituicaoForm.contadorFinalAnterior}
                    onChange={(e) =>
                      setSubstituicaoForm({ ...substituicaoForm, contadorFinalAnterior: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Contador Inicial Nova Máquina:</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 0"
                    value={substituicaoForm.contadorInicialNovo}
                    onChange={(e) =>
                      setSubstituicaoForm({ ...substituicaoForm, contadorInicialNovo: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Novo Modelo do Equipamento:</label>
                <input
                  type="text"
                  placeholder="Ex: Epson L3250 ou Canon IR1643"
                  value={substituicaoForm.modeloNovo}
                  onChange={(e) => setSubstituicaoForm({ ...substituicaoForm, modeloNovo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Novo Número de Série (S/N):</label>
                <input
                  type="text"
                  placeholder="Ex: 35C77837"
                  value={substituicaoForm.numeroSerieNovo}
                  onChange={(e) =>
                    setSubstituicaoForm({ ...substituicaoForm, numeroSerieNovo: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-medium focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Motivo da Substituição / Observação:</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Máquina anterior levada para manutenção preventiva..."
                  value={substituicaoForm.motivo}
                  onChange={(e) => setSubstituicaoForm({ ...substituicaoForm, motivo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="syncGestaoSub"
                  checked={substituicaoForm.sincronizarGestao}
                  onChange={(e) =>
                    setSubstituicaoForm({ ...substituicaoForm, sincronizarGestao: e.target.checked })
                  }
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <label htmlFor="syncGestaoSub" className="text-slate-700 font-medium cursor-pointer">
                  Sincronizar novo modelo automaticamente no Gestão Click (campo detalhes do serviço)
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSubstituicaoModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarSubstituicao}
                disabled={savingSubstituicao}
                className="px-5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingSubstituicao && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Troca de Máquina</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 5: EDITAR DADOS DA LOCAÇÃO & SYNC GESTÃO CLICK                */}
      {/* ==================================================================== */}
      {isEditLocacaoModalOpen && locacaoEmEdicao && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-4 bg-[#002B49] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-300" />
                <span>Editar Dados da Locação</span>
              </h3>
              <button
                onClick={() => setIsEditLocacaoModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="font-bold text-slate-900">{locacaoEmEdicao.nomeCliente}</div>
                <div className="text-[11px] text-slate-500">Contrato #{locacaoEmEdicao.codigoContrato}</div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Modelo do Equipamento (campo detalhes):</label>
                <input
                  type="text"
                  placeholder="Ex: Epson L3150"
                  value={editLocacaoForm.modeloEquipamento}
                  onChange={(e) =>
                    setEditLocacaoForm({ ...editLocacaoForm, modeloEquipamento: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Número de Série (S/N):</label>
                <input
                  type="text"
                  placeholder="Ex: 35C31069"
                  value={editLocacaoForm.numeroSerie}
                  onChange={(e) => setEditLocacaoForm({ ...editLocacaoForm, numeroSerie: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Franquia (páginas):</label>
                  <input
                    type="number"
                    min="0"
                    value={editLocacaoForm.franquia}
                    onChange={(e) => setEditLocacaoForm({ ...editLocacaoForm, franquia: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Valor por Página (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editLocacaoForm.valorPorPagina}
                    onChange={(e) =>
                      setEditLocacaoForm({ ...editLocacaoForm, valorPorPagina: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="syncGestaoEdit"
                  checked={editLocacaoForm.sincronizarGestao}
                  onChange={(e) =>
                    setEditLocacaoForm({ ...editLocacaoForm, sincronizarGestao: e.target.checked })
                  }
                  className="w-4 h-4 text-cyan-600 rounded"
                />
                <label htmlFor="syncGestaoEdit" className="text-slate-700 font-medium cursor-pointer">
                  Sincronizar alterações diretamente no Gestão Click ERP via API
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditLocacaoModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarEditLocacao}
                disabled={savingEditLocacao}
                className="px-5 py-2 text-xs font-bold text-white bg-[#002B49] hover:bg-[#001D33] rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingEditLocacao && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
