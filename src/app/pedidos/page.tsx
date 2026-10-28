'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/app/ClientLayout';
import InfogedLogo from '@/components/InfogedLogo';
import { exportTableToExcel } from '@/lib/export-excel';
import {
  ShoppingCart,
  TrendingUp,
  FileCheck2,
  Search,
  Filter,
  RotateCcw,
  Printer,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  FileSpreadsheet,
  Building2,
  Tag,
  ChevronDown,
  X,
  CheckSquare,
  Square,
  ArrowRight,
  Package,
} from 'lucide-react';

export default function PedidosPage() {
  const { currentUser } = useApp();

  // 3 Menus principais da aplicação
  const [activeTab, setActiveTab] = useState<'ultimas_vendas' | 'montar_cotacao' | 'cotacoes_feitas'>('ultimas_vendas');

  // Configurações globais (Grupos e Fornecedores cadastrados no Gestão Click)
  const [grupos, setGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: string; nome: string; razaoSocial?: string; documento: string }[]>([]);

  // ====================================================================
  // ESTADOS DE FILTRO COMPARTILHADOS (SELEÇÃO MÚLTIPLA)
  // ====================================================================
  // 1. Grupos selecionados (Array de IDs ou Nomes)
  const [selectedGruposVendas, setSelectedGruposVendas] = useState<string[]>([]);
  const [isGruposVendasOpen, setIsGruposVendasOpen] = useState(false);
  const [buscaGrupoVendas, setBuscaGrupoVendas] = useState('');

  const [selectedGruposCotacao, setSelectedGruposCotacao] = useState<string[]>([]);
  const [isGruposCotacaoOpen, setIsGruposCotacaoOpen] = useState(false);
  const [buscaGrupoCotacao, setBuscaGrupoCotacao] = useState('');

  // 2. Fornecedores selecionados (Array de Nomes)
  const [selectedFornecedoresVendas, setSelectedFornecedoresVendas] = useState<string[]>([]);
  const [isFornecedoresVendasOpen, setIsFornecedoresVendasOpen] = useState(false);
  const [buscaFornecedorVendas, setBuscaFornecedorVendas] = useState('');

  const [selectedFornecedoresCotacao, setSelectedFornecedoresCotacao] = useState<string[]>([]);
  const [isFornecedoresCotacaoOpen, setIsFornecedoresCotacaoOpen] = useState(false);
  const [buscaFornecedorCotacao, setBuscaFornecedorCotacao] = useState('');

  // 3. Produtos pesquisáveis e com múltipla seleção (Tags de produtos selecionados)
  const [selectedProdutosVendas, setSelectedProdutosVendas] = useState<{ id: string; codigo: string; nome: string }[]>([]);
  const [inputProdutoVendas, setInputProdutoVendas] = useState('');
  const [sugestoesProdutosVendas, setSugestoesProdutosVendas] = useState<any[]>([]);
  const [isBuscandoProdutosVendas, setIsBuscandoProdutosVendas] = useState(false);
  const [isProdutosVendasOpen, setIsProdutosVendasOpen] = useState(false);

  const [selectedProdutosCotacao, setSelectedProdutosCotacao] = useState<{ id: string; codigo: string; nome: string }[]>([]);
  const [inputProdutoCotacao, setInputProdutoCotacao] = useState('');
  const [sugestoesProdutosCotacao, setSugestoesProdutosCotacao] = useState<any[]>([]);
  const [isBuscandoProdutosCotacao, setIsBuscandoProdutosCotacao] = useState(false);
  const [isProdutosCotacaoOpen, setIsProdutosCotacaoOpen] = useState(false);

  // 4. Códigos
  const [vendasCodigo, setVendasCodigo] = useState('');
  const [cotacaoCodigo, setCotacaoCodigo] = useState('');

  // 5. Período de Vendas
  const [vendasDataInicio, setVendasDataInicio] = useState('');
  const [vendasDataFim, setVendasDataFim] = useState('');

  // ====================================================================
  // LISTAS E FEEDBACKS
  // ====================================================================
  const [ultimasVendasList, setUltimasVendasList] = useState<any[]>([]);
  const [loadingVendas, setLoadingVendas] = useState(false);

  const [cotacaoProdutosList, setCotacaoProdutosList] = useState<any[]>([]);
  const [loadingCotacao, setLoadingCotacao] = useState(false);
  const [hasSearchedCotacao, setHasSearchedCotacao] = useState(false);
  const [cotacaoNomeFornecedor, setCotacaoNomeFornecedor] = useState('');
  const [cotacaoObservacoes, setCotacaoObservacoes] = useState('');

  // Rascunho persistente de "Montar Cotação" (salva última edição e recupera pós-login ou reabertura)
  const [restoredDraftInfo, setRestoredDraftInfo] = useState<{
    count: number;
    savedAt: string;
  } | null>(null);
  const isDraftRestoredChecked = useRef(false);

  // 1. Restaurar cotação em andamento do localStorage ao carregar a tela
  useEffect(() => {
    try {
      const savedDraftStr = localStorage.getItem('epson_cotacao_draft');
      if (savedDraftStr) {
        const draft = JSON.parse(savedDraftStr);
        if (draft && Array.isArray(draft.cotacaoProdutosList) && draft.cotacaoProdutosList.length > 0) {
          setCotacaoProdutosList(draft.cotacaoProdutosList);
          setHasSearchedCotacao(true);
          if (draft.cotacaoNomeFornecedor) setCotacaoNomeFornecedor(draft.cotacaoNomeFornecedor);
          if (draft.cotacaoObservacoes) setCotacaoObservacoes(draft.cotacaoObservacoes);
          if (draft.cotacaoCodigo) setCotacaoCodigo(draft.cotacaoCodigo);
          if (Array.isArray(draft.selectedGruposCotacao)) setSelectedGruposCotacao(draft.selectedGruposCotacao);
          if (Array.isArray(draft.selectedFornecedoresCotacao)) setSelectedFornecedoresCotacao(draft.selectedFornecedoresCotacao);
          if (Array.isArray(draft.selectedProdutosCotacao)) setSelectedProdutosCotacao(draft.selectedProdutosCotacao);

          const filledCount = draft.cotacaoProdutosList.filter((item: any) => {
            const q = parseFloat(item.quantidadePedida);
            return !isNaN(q) && q > 0;
          }).length;

          const savedDate = draft.savedAt ? new Date(draft.savedAt) : new Date();
          const savedTimeStr = savedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          setRestoredDraftInfo({
            count: filledCount,
            savedAt: savedTimeStr,
          });

          // Abre diretamente a aba de montar cotação para continuar de onde parou
          setActiveTab('montar_cotacao');
        }
      }
    } catch (e) {
      console.error('Erro ao recuperar rascunho de cotação:', e);
    } finally {
      isDraftRestoredChecked.current = true;
    }
  }, []);

  // 2. Salvar automaticamente qualquer edição feita em "Montar Cotação"
  useEffect(() => {
    if (!isDraftRestoredChecked.current) return;

    const hasItemsWithQty = cotacaoProdutosList.some((item) => {
      const q = parseFloat(item.quantidadePedida);
      return !isNaN(q) && q > 0;
    });

    const hasActiveContent =
      hasItemsWithQty ||
      cotacaoNomeFornecedor.trim().length > 0 ||
      cotacaoObservacoes.trim().length > 0 ||
      (hasSearchedCotacao && cotacaoProdutosList.length > 0);

    if (hasActiveContent && cotacaoProdutosList.length > 0) {
      const draft = {
        savedAt: new Date().toISOString(),
        cotacaoProdutosList,
        cotacaoNomeFornecedor,
        cotacaoObservacoes,
        cotacaoCodigo,
        selectedGruposCotacao,
        selectedFornecedoresCotacao,
        selectedProdutosCotacao,
        hasSearchedCotacao,
      };
      try {
        localStorage.setItem('epson_cotacao_draft', JSON.stringify(draft));
      } catch (e) {
        console.error('Erro ao salvar rascunho de cotação:', e);
      }
    }
  }, [
    cotacaoProdutosList,
    cotacaoNomeFornecedor,
    cotacaoObservacoes,
    cotacaoCodigo,
    selectedGruposCotacao,
    selectedFornecedoresCotacao,
    selectedProdutosCotacao,
    hasSearchedCotacao,
  ]);

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem('epson_cotacao_draft');
    } catch (e) {
      console.error(e);
    }
    setRestoredDraftInfo(null);
    setCotacaoProdutosList([]);
    setCotacaoCodigo('');
    setSelectedProdutosCotacao([]);
    setInputProdutoCotacao('');
    setSelectedFornecedoresCotacao([]);
    setBuscaFornecedorCotacao('');
    setSelectedGruposCotacao([]);
    setCotacaoNomeFornecedor('');
    setCotacaoObservacoes('');
    setHasSearchedCotacao(false);
  };

  const [savingLimitId, setSavingLimitId] = useState<string | null>(null);
  const [savedLimitId, setSavedLimitId] = useState<string | null>(null);

  const [finalizingCotacao, setFinalizingCotacao] = useState(false);
  const [successCotacaoMessage, setSuccessCotacaoMessage] = useState<string | null>(null);

  const [cotacoesFeitasList, setCotacoesFeitasList] = useState<any[]>([]);
  const [loadingFeitas, setLoadingFeitas] = useState(false);

  const [selectedCotacao, setSelectedCotacao] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // 1. Carregar Configurações Iniciais do Gestão Click
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/pedidos?action=config');
        if (res.ok) {
          const data = await res.json();
          setGrupos(data.grupos || []);
          setFornecedores(data.fornecedores || []);

          if (!vendasDataInicio) setVendasDataInicio(data.defaultDataInicio || '');
          if (!vendasDataFim) setVendasDataFim(data.defaultDataFim || '');
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de pedidos:', err);
      }
    };

    loadConfig();
  }, []);

  // 2. Busca Dinâmica de Produtos ao Digitar (Menu 1: Vendas)
  useEffect(() => {
    if (!inputProdutoVendas || inputProdutoVendas.trim().length < 2) {
      setSugestoesProdutosVendas([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsBuscandoProdutosVendas(true);
        const res = await fetch(`/api/pedidos?action=buscar_produtos&termo=${encodeURIComponent(inputProdutoVendas.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSugestoesProdutosVendas(data.produtos || []);
          setIsProdutosVendasOpen(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsBuscandoProdutosVendas(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [inputProdutoVendas]);

  // 3. Busca Dinâmica de Produtos ao Digitar (Menu 2: Cotação)
  useEffect(() => {
    if (!inputProdutoCotacao || inputProdutoCotacao.trim().length < 2) {
      setSugestoesProdutosCotacao([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsBuscandoProdutosCotacao(true);
        const res = await fetch(`/api/pedidos?action=buscar_produtos&termo=${encodeURIComponent(inputProdutoCotacao.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSugestoesProdutosCotacao(data.produtos || []);
          setIsProdutosCotacaoOpen(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsBuscandoProdutosCotacao(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [inputProdutoCotacao]);

  // 4. Carregar / Pesquisar Últimas Vendas
  const fetchUltimasVendas = async () => {
    try {
      setLoadingVendas(true);
      const params = new URLSearchParams();
      params.set('action', 'ultimas_vendas');
      if (vendasDataInicio) params.set('data_inicio', vendasDataInicio);
      if (vendasDataFim) params.set('data_fim', vendasDataFim);
      if (vendasCodigo) params.set('codigo', vendasCodigo);

      // Envia múltiplos grupos
      if (selectedGruposVendas.length > 0) {
        params.set('grupos', selectedGruposVendas.join(','));
      }

      // Envia múltiplos fornecedores
      if (selectedFornecedoresVendas.length > 0) {
        params.set('fornecedores', selectedFornecedoresVendas.join(','));
      }

      // Envia múltiplos produtos selecionados
      if (selectedProdutosVendas.length > 0) {
        params.set('produtos', selectedProdutosVendas.map((p) => p.id).join(','));
      }

      const res = await fetch(`/api/pedidos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUltimasVendasList(data.produtos || []);
      }
    } catch (err) {
      console.error('Erro ao buscar últimas vendas:', err);
    } finally {
      setLoadingVendas(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ultimas_vendas' && vendasDataInicio && vendasDataFim) {
      fetchUltimasVendas();
    }
  }, [activeTab, vendasDataInicio, vendasDataFim]);

  // 5. Carregar / Pesquisar Produtos para Montar Cotação
  const fetchProdutosCotacao = async () => {
    try {
      setLoadingCotacao(true);
      setHasSearchedCotacao(true);
      const params = new URLSearchParams();
      params.set('action', 'montar_cotacao');
      if (cotacaoCodigo) params.set('codigo', cotacaoCodigo);

      if (selectedGruposCotacao.length > 0) {
        params.set('grupos', selectedGruposCotacao.join(','));
      }

      if (selectedFornecedoresCotacao.length > 0) {
        params.set('fornecedores', selectedFornecedoresCotacao.join(','));
      }

      if (selectedProdutosCotacao.length > 0) {
        params.set('produtos', selectedProdutosCotacao.map((p) => p.id).join(','));
      }

      const res = await fetch(`/api/pedidos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCotacaoProdutosList(data.produtos || []);
      }
    } catch (err) {
      console.error('Erro ao buscar produtos para cotação:', err);
    } finally {
      setLoadingCotacao(false);
    }
  };

  // 6. Carregar Cotações Feitas
  const fetchCotacoesFeitas = async () => {
    try {
      setLoadingFeitas(true);
      const res = await fetch('/api/pedidos?action=cotacoes');
      if (res.ok) {
        const data = await res.json();
        setCotacoesFeitasList(data.cotacoes || []);
      }
    } catch (err) {
      console.error('Erro ao buscar cotações feitas:', err);
    } finally {
      setLoadingFeitas(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cotacoes_feitas') {
      fetchCotacoesFeitas();
    }
  }, [activeTab]);

  // ====================================================================
  // MANIPULAÇÃO DE LINHAS EM "MONTAR COTAÇÃO"
  // ====================================================================
  const handleUpdateProductRow = (produtoId: string, field: string, value: any) => {
    setCotacaoProdutosList((prev) =>
      prev.map((item) => {
        if (item.produtoId === produtoId) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Salvar Quantidade Mínima e Máxima no Banco Local
  const handleSaveLimits = async (item: any) => {
    try {
      setSavingLimitId(item.produtoId);
      const res = await fetch('/api/pedidos?action=salvar_limites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtoId: item.produtoId,
          codigoInterno: item.codigo,
          nome: item.nome,
          estoqueMinimo: item.estoqueMinimo,
          estoqueMaximo: item.estoqueMaximo,
          userAuthor: currentUser?.name || 'Administrador',
        }),
      });

      if (res.ok) {
        setSavedLimitId(item.produtoId);
        setTimeout(() => setSavedLimitId(null), 2500);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar limites de estoque.');
      }
    } catch (e) {
      console.error(e);
      alert('Falha na comunicação com o servidor ao salvar limites.');
    } finally {
      setSavingLimitId(null);
    }
  };

  // Itens atualmente selecionados para a cotação (com quantidade a ser pedida > 0)
  const itensCotacaoSelecionados = useMemo(() => {
    return cotacaoProdutosList.filter((item) => {
      const q = parseFloat(item.quantidadePedida);
      return !isNaN(q) && q > 0;
    });
  }, [cotacaoProdutosList]);

  // Total da Cotação em Montagem
  const totalCotacaoMontagem = useMemo(() => {
    return itensCotacaoSelecionados.reduce((acc, item) => {
      const q = parseFloat(item.quantidadePedida) || 0;
      const v = parseFloat(item.valorCotacao) || 0;
      return acc + q * v;
    }, 0);
  }, [itensCotacaoSelecionados]);

  // Finalizar Cotação
  const handleFinalizarCotacao = async () => {
    if (itensCotacaoSelecionados.length === 0) {
      alert('Atenção: Preencha o campo "Quantidade a ser pedida" em pelo menos um produto antes de finalizar a cotação.');
      return;
    }

    if (!window.confirm(`Deseja finalizar esta cotação contendo ${itensCotacaoSelecionados.length} itens no valor total de R$ ${totalCotacaoMontagem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`)) {
      return;
    }

    try {
      setFinalizingCotacao(true);
      const payloadItens = itensCotacaoSelecionados.map((item) => {
        const qtdPedida = parseFloat(item.quantidadePedida) || 0;
        const valCot = parseFloat(item.valorCotacao) || 0;
        return {
          produtoId: item.produtoId,
          codigo: item.codigo,
          nome: item.nome,
          grupo: item.nomeGrupo,
          estoqueAtual: item.estoqueAtual,
          valorUltimaCompra: item.valorUltimaCompra,
          valorCotacao: valCot,
          quantidadePedida: qtdPedida,
          subtotal: qtdPedida * valCot,
          fornecedores: item.fornecedores,
        };
      });

      const res = await fetch('/api/pedidos?action=finalizar_cotacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeFornecedor: cotacaoNomeFornecedor.trim() || 'Cotação Geral',
          valorTotal: totalCotacaoMontagem,
          quantidadeItens: payloadItens.length,
          observacoes: cotacaoObservacoes.trim(),
          itens: payloadItens,
          criadoPor: currentUser?.name || 'Administrador',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao finalizar cotação.');
        return;
      }

      // Sucesso: limpar a tela de montar cotação para uma nova cotação
      setCotacaoProdutosList((prev) =>
        prev.map((item) => ({
          ...item,
          quantidadePedida: '',
        }))
      );
      setCotacaoNomeFornecedor('');
      setCotacaoObservacoes('');

      // Limpar rascunho salvo do localStorage
      try {
        localStorage.removeItem('epson_cotacao_draft');
        setRestoredDraftInfo(null);
      } catch (e) {
        console.error(e);
      }

      setSuccessCotacaoMessage(`Cotação nº ${data.cotacao.numero} finalizada com sucesso! Registro criado em "Cotações Feitas".`);
      setTimeout(() => setSuccessCotacaoMessage(null), 6000);

      // Atualizar histórico de cotações feitas
      fetchCotacoesFeitas();
    } catch (err) {
      console.error(err);
      alert('Falha de comunicação ao finalizar cotação.');
    } finally {
      setFinalizingCotacao(false);
    }
  };

  // Exportar Montar Cotação para Excel
  const handleExportCotacaoExcel = () => {
    const listToExport = itensCotacaoSelecionados.length > 0 ? itensCotacaoSelecionados : cotacaoProdutosList;
    if (listToExport.length === 0) {
      alert('Nenhum dado disponível para exportar.');
      return;
    }

    const dataExcel = listToExport.map((item) => {
      const qPedida = parseFloat(item.quantidadePedida) || 0;
      const valCot = parseFloat(item.valorCotacao) || 0;
      return {
        'Código Interno': item.codigo,
        'Nome do Produto': item.nome,
        'Grupo do Produto': item.nomeGrupo,
        'Fornecedores': item.fornecedores?.join(', ') || '-',
        'Estoque Atual': item.estoqueAtual,
        'Estoque Mínimo': item.estoqueMinimo,
        'Estoque Máximo': item.estoqueMaximo,
        'Data Última Compra': item.dataUltimaCompra || '-',
        'Qtd Última Compra': item.quantidadeUltimaCompra ?? '-',
        'Valor Última Compra (R$)': item.valorUltimaCompra ? item.valorUltimaCompra.toFixed(2) : '0.00',
        'Valor na Cotação (R$)': valCot.toFixed(2),
        'Qtd a Ser Pedida': qPedida > 0 ? qPedida : '',
        'Subtotal (R$)': (qPedida * valCot).toFixed(2),
      };
    });

    exportTableToExcel(dataExcel, `Cotacao_Produtos_${new Date().toISOString().split('T')[0]}`, 'Cotação');
  };

  // Exportar Últimas Vendas para Excel
  const handleExportVendasExcel = () => {
    if (ultimasVendasList.length === 0) {
      alert('Nenhuma venda no período para exportar.');
      return;
    }

    const dataExcel = ultimasVendasList.map((item) => ({
      'Código Interno': item.codigo,
      'Nome do Produto': item.nome,
      'Grupo do Produto': item.nomeGrupo,
      'Fornecedor(es)': item.fornecedores?.join(', ') || '-',
      'Qtd Vendida no Período': item.quantidadeVendida,
    }));

    exportTableToExcel(
      dataExcel,
      `Ultimas_Vendas_${vendasDataInicio}_a_${vendasDataFim}`,
      'Vendas'
    );
  };

  // Abertura de Modal de Visualização da Cotação Feita
  const handleOpenViewModal = (cotacao: any) => {
    setSelectedCotacao(cotacao);
    setIsViewModalOpen(true);
  };

  // Impressão Direta
  const handlePrintCotacao = (cotacao: any) => {
    setSelectedCotacao(cotacao);
    setIsViewModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // Helpers para alternar itens em arrays de seleção múltipla
  const toggleArrayItem = (list: string[], item: string) => {
    return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
  };

  return (
    <div className="space-y-5 pb-12">
      {/* ============================================================== */}
      {/* CABEÇALHO DO MÓDULO PEDIDO DE PRODUTOS & COTAÇÕES              */}
      {/* ============================================================== */}
      <div className="bg-gradient-to-r from-[#002B49] via-[#073859] to-[#001D33] text-white rounded-2xl p-6 shadow-md border border-cyan-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <ShoppingCart className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800/80">
                Gestão Click ERP &bull; Suprimentos
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Conectado à API
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1">
              Pedido de Produtos & Central de Cotações
            </h1>
            <p className="text-xs text-cyan-200/80 mt-0.5">
              Análise de giro com código interno real, grupos do cadastro ERP e cotações personalizadas.
            </p>
          </div>
        </div>

        {/* Resumo Rápido */}
        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10 self-start md:self-auto">
          <div className="px-3 py-1 text-center">
            <span className="text-[10px] text-cyan-200 block">Itens na Cotação</span>
            <span className="text-sm font-black text-cyan-300">
              {itensCotacaoSelecionados.length}
            </span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="px-3 py-1 text-center">
            <span className="text-[10px] text-cyan-200 block">Total Previsto</span>
            <span className="text-sm font-black text-emerald-400">
              R$ {totalCotacaoMontagem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Alerta de Sucesso de Finalização de Cotação */}
      {successCotacaoMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successCotacaoMessage}</span>
          </div>
          <button
            onClick={() => setActiveTab('cotacoes_feitas')}
            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
          >
            Ver em Cotações Feitas <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* BARRA DE NAVEGAÇÃO DOS 3 MENUS SOLICITADOS                    */}
      {/* ============================================================== */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-1.5 flex items-center gap-2 overflow-x-auto select-none">
        {/* Menu 1: Últimas Vendas */}
        <button
          type="button"
          onClick={() => setActiveTab('ultimas_vendas')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'ultimas_vendas'
              ? 'bg-[#002B49] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span>1. Últimas Vendas</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
            activeTab === 'ultimas_vendas' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-200 text-slate-700'
          }`}>
            {ultimasVendasList.length}
          </span>
        </button>

        {/* Menu 2: Montar Cotação */}
        <button
          type="button"
          onClick={() => setActiveTab('montar_cotacao')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'montar_cotacao'
              ? 'bg-[#002B49] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-amber-400" />
          <span>2. Montar Cotação</span>
          {itensCotacaoSelecionados.length > 0 && (
            <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
              {itensCotacaoSelecionados.length} pedindo
            </span>
          )}
        </button>

        {/* Menu 3: Cotações Feitas */}
        <button
          type="button"
          onClick={() => setActiveTab('cotacoes_feitas')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'cotacoes_feitas'
              ? 'bg-[#002B49] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-emerald-400" />
          <span>3. Cotações Feitas</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
            activeTab === 'cotacoes_feitas' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-200 text-slate-700'
          }`}>
            {cotacoesFeitasList.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* MENU 1: ÚLTIMAS VENDAS (TELA PRINCIPAL)                        */}
      {/* ============================================================== */}
      {activeTab === 'ultimas_vendas' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Guia de Pesquisa das Vendas com Filtros de Seleção Múltipla */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#002B49]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Guia de Pesquisa &bull; Últimas Vendas (Múltipla Seleção)
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">
                Selecione mais de um grupo, fornecedor e produtos simultaneamente
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* 1. Filtro: Código */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                  Código Interno
                </label>
                <input
                  type="text"
                  placeholder="Ex: 130000..."
                  value={vendasCodigo}
                  onChange={(e) => setVendasCodigo(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-cyan-600 font-mono"
                />
              </div>

              {/* 2. Filtro: Produtos (Busca Dinâmica com Autocomplete e Multi-seleção) */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                  Produtos ({selectedProdutosVendas.length} selecionados)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Digite o nome do produto..."
                    value={inputProdutoVendas}
                    onChange={(e) => setInputProdutoVendas(e.target.value)}
                    onFocus={() => {
                      if (sugestoesProdutosVendas.length > 0) setIsProdutosVendasOpen(true);
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-cyan-600 pr-8"
                  />
                  {isBuscandoProdutosVendas && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600 absolute right-2.5 top-2.5" />
                  )}
                </div>

                {/* Dropdown de sugestões dinâmicas de produtos */}
                {isProdutosVendasOpen && sugestoesProdutosVendas.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-72 overflow-y-auto p-1.5 space-y-1 min-w-[320px] md:min-w-[420px]">
                    <div className="flex items-center justify-between px-2 py-1 text-[10px] text-slate-400 font-bold border-b border-slate-100">
                      <span>Clique para marcar (passe o mouse para ver o nome completo):</span>
                      <button
                        type="button"
                        onClick={() => setIsProdutosVendasOpen(false)}
                        className="text-slate-500 hover:text-slate-800"
                      >
                        ✕
                      </button>
                    </div>
                    {sugestoesProdutosVendas.map((p) => {
                      const isSelected = selectedProdutosVendas.some((sp) => sp.id === p.id);
                      return (
                        <div
                          key={p.id}
                          title={p.nome}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedProdutosVendas((prev) => prev.filter((sp) => sp.id !== p.id));
                            } else {
                              setSelectedProdutosVendas((prev) => [...prev, { id: p.id, codigo: p.codigo_interno, nome: p.nome }]);
                            }
                          }}
                          className={`p-2 rounded-lg cursor-pointer transition flex items-start gap-2 text-xs group ${
                            isSelected ? 'bg-cyan-50 border border-cyan-200 text-cyan-950 font-semibold' : 'hover:bg-slate-100/90 text-slate-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="w-3.5 h-3.5 rounded text-cyan-600 mt-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-mono text-[10px] text-cyan-800 font-bold block">
                              Cód: {p.codigo_interno} &bull; {p.nome_grupo}
                            </span>
                            <span className="block text-xs leading-snug break-words text-slate-900 mt-0.5" title={p.nome}>
                              {p.nome}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Filtro: Fornecedor (Multi-seleção digitável dos Fornecedores do Gestão Click) */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase flex items-center justify-between">
                  <span>Fornecedor ({selectedFornecedoresVendas.length} selecionados)</span>
                  {selectedFornecedoresVendas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedFornecedoresVendas([])}
                      className="text-[10px] text-cyan-700 hover:underline font-normal"
                    >
                      Limpar
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={
                      selectedFornecedoresVendas.length === 0
                        ? 'Digite para buscar fornecedor...'
                        : `${selectedFornecedoresVendas.length} selecionado(s) - digite para mais...`
                    }
                    value={buscaFornecedorVendas}
                    onChange={(e) => {
                      setBuscaFornecedorVendas(e.target.value);
                      setIsFornecedoresVendasOpen(true);
                    }}
                    onFocus={() => setIsFornecedoresVendasOpen(true)}
                    className="w-full px-3 py-1.5 pr-8 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-cyan-600 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setIsFornecedoresVendasOpen(!isFornecedoresVendasOpen)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dropdown com Busca e Checkboxes de Fornecedores */}
                {isFornecedoresVendasOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-2 space-y-2 min-w-[320px] md:min-w-[360px]">
                    {(() => {
                      const termo = buscaFornecedorVendas.trim().toLowerCase();
                      const filtrados = fornecedores.filter((f) => {
                        if (!termo) return true;
                        return (
                          f.nome.toLowerCase().includes(termo) ||
                          (f.razaoSocial && f.razaoSocial.toLowerCase().includes(termo)) ||
                          (f.documento && f.documento.includes(termo))
                        );
                      });

                      return (
                        <>
                          <div className="flex items-center justify-between text-[10px] text-cyan-800 px-1 font-bold border-b border-slate-100 pb-1.5">
                            <span>
                              {termo
                                ? `${filtrados.length} de ${fornecedores.length} fornecedores`
                                : `${fornecedores.length} fornecedores no Gestão Click`}
                            </span>
                            <div className="flex items-center gap-2">
                              {selectedFornecedoresVendas.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedFornecedoresVendas([])}
                                  className="hover:underline text-rose-600 font-semibold"
                                >
                                  Desmarcar todos
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setIsFornecedoresVendasOpen(false)}
                                className="hover:underline text-slate-500 font-bold"
                              >
                                ✕ Fechar
                              </button>
                            </div>
                          </div>

                          <div className="max-h-60 overflow-y-auto space-y-1">
                            {filtrados.length === 0 ? (
                              <div className="py-4 text-center text-slate-400 text-xs">
                                Nenhum fornecedor encontrado para "{buscaFornecedorVendas}".
                              </div>
                            ) : (
                              filtrados.map((f) => {
                                const isChecked = selectedFornecedoresVendas.includes(f.nome);
                                return (
                                  <label
                                    key={f.id}
                                    title={f.razaoSocial ? `${f.nome} (${f.razaoSocial})` : f.nome}
                                    className={`flex items-start gap-2 p-1.5 rounded cursor-pointer text-xs transition ${
                                      isChecked
                                        ? 'bg-cyan-50 font-bold text-cyan-900 border border-cyan-200'
                                        : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        setSelectedFornecedoresVendas(
                                          toggleArrayItem(selectedFornecedoresVendas, f.nome)
                                        )
                                      }
                                      className="w-3.5 h-3.5 rounded text-cyan-600 shrink-0 mt-0.5"
                                    />
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <span className="break-words leading-tight">{f.nome}</span>
                                      {f.razaoSocial && f.razaoSocial !== f.nome && (
                                        <span className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                                          {f.razaoSocial}
                                        </span>
                                      )}
                                    </div>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* 4. Filtro: Grupo do Produto (Seleção Múltipla) */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                  Grupo do Produto ({selectedGruposVendas.length} selecionados)
                </label>
                <button
                  type="button"
                  onClick={() => setIsGruposVendasOpen(!isGruposVendasOpen)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-left flex items-center justify-between focus:outline-none focus:border-cyan-600 font-medium"
                >
                  <span className="truncate">
                    {selectedGruposVendas.length === 0
                      ? 'Todos os grupos'
                      : `${selectedGruposVendas.length} grupos`}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </button>

                {/* Dropdown com Checkboxes de Grupos */}
                {isGruposVendasOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 space-y-2 min-w-[260px]">
                    <input
                      type="text"
                      placeholder="Pesquisar grupo..."
                      value={buscaGrupoVendas}
                      onChange={(e) => setBuscaGrupoVendas(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 focus:outline-none focus:border-cyan-600"
                    />

                    <div className="flex items-center justify-between text-[10px] text-cyan-700 px-1 font-semibold">
                      <button
                        type="button"
                        onClick={() => setSelectedGruposVendas(grupos.map((g) => g.nome))}
                        className="hover:underline"
                      >
                        Marcar todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedGruposVendas([])}
                        className="hover:underline"
                      >
                        Desmarcar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsGruposVendasOpen(false)}
                        className="hover:underline text-slate-500"
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {grupos
                        .filter((g) => g.nome.toLowerCase().includes(buscaGrupoVendas.toLowerCase()))
                        .map((g) => {
                          const isChecked = selectedGruposVendas.includes(g.nome);
                          return (
                            <label
                              key={g.id}
                              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs ${
                                isChecked ? 'bg-cyan-50 font-bold text-cyan-900' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => setSelectedGruposVendas(toggleArrayItem(selectedGruposVendas, g.nome))}
                                className="w-3.5 h-3.5 rounded text-cyan-600"
                              />
                              <span className="truncate">{g.nome}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Filtro: Data Inicial (mês vigente) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                  Data Inicial (Saída)
                </label>
                <input
                  type="date"
                  value={vendasDataInicio}
                  onChange={(e) => setVendasDataInicio(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-cyan-600 font-mono"
                />
              </div>

              {/* 6. Filtro: Data Final (mês vigente) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                  Data Final (Saída)
                </label>
                <input
                  type="date"
                  value={vendasDataFim}
                  onChange={(e) => setVendasDataFim(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-cyan-600 font-mono"
                />
              </div>
            </div>

            {/* Tags dos Filtros Selecionados */}
            {(selectedProdutosVendas.length > 0 || selectedGruposVendas.length > 0 || selectedFornecedoresVendas.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Filtros Ativos:</span>
                
                {/* Tags de Produtos */}
                {selectedProdutosVendas.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300"
                  >
                    <span>Cód {p.codigo}: {p.nome.slice(0, 24)}...</span>
                    <button
                      type="button"
                      onClick={() => setSelectedProdutosVendas(selectedProdutosVendas.filter((sp) => sp.id !== p.id))}
                      className="text-cyan-700 hover:text-cyan-950 font-black ml-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}

                {/* Tags de Grupos */}
                {selectedGruposVendas.map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300"
                  >
                    <span>Grupo: {g}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedGruposVendas(selectedGruposVendas.filter((sg) => sg !== g))}
                      className="text-slate-600 hover:text-slate-900 font-black ml-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}

                {/* Tags de Fornecedores */}
                {selectedFornecedoresVendas.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300"
                  >
                    <span>Forn: {f.slice(0, 20)}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFornecedoresVendas(selectedFornecedoresVendas.filter((sf) => sf !== f))}
                      className="text-blue-700 hover:text-blue-950 font-black ml-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Botões de Ação da Pesquisa */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchUltimasVendas}
                  disabled={loadingVendas}
                  className="px-4 py-2 bg-[#002B49] hover:bg-[#001D33] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {loadingVendas ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Pesquisar Vendas</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVendasCodigo('');
                    setSelectedProdutosVendas([]);
                    setInputProdutoVendas('');
                    setSelectedFornecedoresVendas([]);
                    setSelectedGruposVendas([]);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar Filtros</span>
                </button>
              </div>

              {/* Exportar Excel */}
              <button
                type="button"
                onClick={handleExportVendasExcel}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar Vendas (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Listagem com Linhas Intercaladas (Sombra Cinza Clara e Branco) */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700 font-bold">
              <span>Listagem de Produtos Vendidos no Período ({vendasDataInicio} até {vendasDataFim})</span>
              <span className="px-2.5 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-mono">
                {ultimasVendasList.length} produtos encontrados
              </span>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#002B49] text-white sticky top-0 z-10 select-none">
                  <tr className="border-b border-blue-900 text-[11px]">
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap w-36">CÓDIGO INTERNO</th>
                    <th className="px-3 py-2.5 font-bold">NOME DO PRODUTO</th>
                    <th className="px-3 py-2.5 font-bold">NOME DO FORNECEDOR</th>
                    <th className="px-3 py-2.5 font-bold whitespace-nowrap">GRUPO DO PRODUTO</th>
                    <th className="px-3 py-2.5 font-bold text-center whitespace-nowrap bg-[#001D33]">
                      QTD VENDIDA NO PERÍODO
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loadingVendas ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-cyan-700" />
                          <span className="font-semibold text-xs">Consultando vendas e códigos internos reais no Gestão Click ERP...</span>
                        </div>
                      </td>
                    </tr>
                  ) : ultimasVendasList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Nenhuma venda encontrada para o período e filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    ultimasVendasList.map((item, idx) => {
                      const isEven = idx % 2 === 0;

                      return (
                        <tr
                          key={item.produtoId}
                          className={`transition ${
                            isEven
                              ? 'bg-slate-100/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] border-b border-slate-200/90'
                              : 'bg-white border-b border-slate-200/50'
                          } hover:bg-cyan-50/60`}
                        >
                          {/* 1. Código interno do produto (conforme cadastro ERP) */}
                          <td className="px-3 py-2 font-mono font-bold text-[#002B49] whitespace-nowrap">
                            {item.codigo}
                          </td>

                          {/* 2. Nome do produto */}
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {item.nome}
                          </td>

                          {/* 3. Fornecedor(es) - pode ser mais de um */}
                          <td className="px-3 py-2">
                            {item.fornecedores && item.fornecedores.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.fornecedores.map((f: string, i: number) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-900 border border-blue-200"
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>

                          {/* 4. Grupo do produto (conforme cadastro no ERP) */}
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600 font-medium">
                            <span className="px-2.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[11px] font-bold">
                              {item.nomeGrupo}
                            </span>
                          </td>

                          {/* 5. Quantidade vendida no período selecionado */}
                          <td className="px-3 py-2 text-center font-bold text-sm text-cyan-900 bg-cyan-50/50 font-mono">
                            {item.quantidadeVendida}
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

      {/* ============================================================== */}
      {/* MENU 2: MONTAR COTAÇÃO (COM MULTI-SELEÇÃO)                     */}
      {/* ============================================================== */}
      {activeTab === 'montar_cotacao' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Banner de Rascunho Recuperado Automaticamente */}
          {restoredDraftInfo && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-3 text-amber-950 text-xs">
                <div className="p-2 bg-amber-200/90 rounded-lg text-amber-900 shrink-0 shadow-xs">
                  <Save className="w-4 h-4 text-amber-900" />
                </div>
                <div>
                  <span className="font-bold block text-sm text-amber-950">
                    Cotação em andamento recuperada com sucesso!
                  </span>
                  <span className="text-[11px] text-amber-800 leading-relaxed block mt-0.5">
                    Todos os produtos, quantidades e preços foram restaurados exatamente de onde você parou
                    {restoredDraftInfo.savedAt ? ` (última edição às ${restoredDraftInfo.savedAt})` : ''}
                    {restoredDraftInfo.count > 0 ? ` com ${restoredDraftInfo.count} item(ns) com quantidade preenchida.` : '.'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="px-3 py-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-300 transition cursor-pointer shadow-xs"
                >
                  Descartar Rascunho
                </button>
                <button
                  type="button"
                  onClick={() => setRestoredDraftInfo(null)}
                  className="px-2.5 py-1.5 text-xs text-amber-800 hover:text-amber-950 font-bold hover:bg-amber-100 rounded-lg transition"
                  title="Fechar este aviso e continuar trabalhando"
                >
                  ✕ Fechar Aviso
                </button>
              </div>
            </div>
          )}

          {/* Guia de Pesquisa para Montar Cotação */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#002B49]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Guia de Pesquisa &bull; Produtos para Cotação (Múltipla Seleção)
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">
                Selecione mais de um grupo, fornecedor e produtos simultaneamente
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* 1. Código */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                  Código Interno
                </label>
                <input
                  type="text"
                  placeholder="Ex: 130000..."
                  value={cotacaoCodigo}
                  onChange={(e) => setCotacaoCodigo(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-cyan-600 font-mono"
                />
              </div>

              {/* 2. Produtos (Digitação Dinâmica com Autocomplete e Multi-seleção) */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                  Produtos ({selectedProdutosCotacao.length} selecionados)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Digite o nome do produto..."
                    value={inputProdutoCotacao}
                    onChange={(e) => setInputProdutoCotacao(e.target.value)}
                    onFocus={() => {
                      if (sugestoesProdutosCotacao.length > 0) setIsProdutosCotacaoOpen(true);
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-cyan-600 pr-8"
                  />
                  {isBuscandoProdutosCotacao && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600 absolute right-2.5 top-2.5" />
                  )}
                </div>

                {isProdutosCotacaoOpen && sugestoesProdutosCotacao.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-72 overflow-y-auto p-1.5 space-y-1 min-w-[320px] md:min-w-[420px]">
                    <div className="flex items-center justify-between px-2 py-1 text-[10px] text-slate-400 font-bold border-b border-slate-100">
                      <span>Clique para marcar (passe o mouse para ver o nome completo):</span>
                      <button
                        type="button"
                        onClick={() => setIsProdutosCotacaoOpen(false)}
                        className="text-slate-500 hover:text-slate-800"
                      >
                        ✕
                      </button>
                    </div>
                    {sugestoesProdutosCotacao.map((p) => {
                      const isSelected = selectedProdutosCotacao.some((sp) => sp.id === p.id);
                      return (
                        <div
                          key={p.id}
                          title={p.nome}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedProdutosCotacao((prev) => prev.filter((sp) => sp.id !== p.id));
                            } else {
                              setSelectedProdutosCotacao((prev) => [...prev, { id: p.id, codigo: p.codigo_interno, nome: p.nome }]);
                            }
                          }}
                          className={`p-2 rounded-lg cursor-pointer transition flex items-start gap-2 text-xs group ${
                            isSelected ? 'bg-amber-50 border border-amber-200 text-amber-950 font-semibold' : 'hover:bg-slate-100/90 text-slate-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="w-3.5 h-3.5 rounded text-amber-600 mt-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-mono text-[10px] text-amber-800 font-bold block">
                              Cód: {p.codigo_interno} &bull; {p.nome_grupo}
                            </span>
                            <span className="block text-xs leading-snug break-words text-slate-900 mt-0.5" title={p.nome}>
                              {p.nome}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Fornecedor (Multi-seleção digitável dos Fornecedores do Gestão) */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase flex items-center justify-between">
                  <span>Fornecedor ({selectedFornecedoresCotacao.length} selecionados)</span>
                  {selectedFornecedoresCotacao.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedFornecedoresCotacao([])}
                      className="text-[10px] text-cyan-700 hover:underline font-normal"
                    >
                      Limpar
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={
                      selectedFornecedoresCotacao.length === 0
                        ? 'Digite para buscar fornecedor...'
                        : `${selectedFornecedoresCotacao.length} selecionado(s) - digite para mais...`
                    }
                    value={buscaFornecedorCotacao}
                    onChange={(e) => {
                      setBuscaFornecedorCotacao(e.target.value);
                      setIsFornecedoresCotacaoOpen(true);
                    }}
                    onFocus={() => setIsFornecedoresCotacaoOpen(true)}
                    className="w-full px-3 py-1.5 pr-8 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-cyan-600 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setIsFornecedoresCotacaoOpen(!isFornecedoresCotacaoOpen)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isFornecedoresCotacaoOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-2 space-y-2 min-w-[320px] md:min-w-[360px]">
                    {(() => {
                      const termo = buscaFornecedorCotacao.trim().toLowerCase();
                      const filtrados = fornecedores.filter((f) => {
                        if (!termo) return true;
                        return (
                          f.nome.toLowerCase().includes(termo) ||
                          (f.razaoSocial && f.razaoSocial.toLowerCase().includes(termo)) ||
                          (f.documento && f.documento.includes(termo))
                        );
                      });

                      return (
                        <>
                          <div className="flex items-center justify-between text-[10px] text-cyan-800 px-1 font-bold border-b border-slate-100 pb-1.5">
                            <span>
                              {termo
                                ? `${filtrados.length} de ${fornecedores.length} fornecedores`
                                : `${fornecedores.length} fornecedores no Gestão Click`}
                            </span>
                            <div className="flex items-center gap-2">
                              {selectedFornecedoresCotacao.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedFornecedoresCotacao([])}
                                  className="hover:underline text-rose-600 font-semibold"
                                >
                                  Desmarcar todos
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setIsFornecedoresCotacaoOpen(false)}
                                className="hover:underline text-slate-500 font-bold"
                              >
                                ✕ Fechar
                              </button>
                            </div>
                          </div>

                          <div className="max-h-60 overflow-y-auto space-y-1">
                            {filtrados.length === 0 ? (
                              <div className="py-4 text-center text-slate-400 text-xs">
                                Nenhum fornecedor encontrado para "{buscaFornecedorCotacao}".
                              </div>
                            ) : (
                              filtrados.map((f) => {
                                const isChecked = selectedFornecedoresCotacao.includes(f.nome);
                                return (
                                  <label
                                    key={f.id}
                                    title={f.razaoSocial ? `${f.nome} (${f.razaoSocial})` : f.nome}
                                    className={`flex items-start gap-2 p-1.5 rounded cursor-pointer text-xs transition ${
                                      isChecked
                                        ? 'bg-cyan-50 font-bold text-cyan-900 border border-cyan-200'
                                        : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        setSelectedFornecedoresCotacao(
                                          toggleArrayItem(selectedFornecedoresCotacao, f.nome)
                                        )
                                      }
                                      className="w-3.5 h-3.5 rounded text-cyan-600 shrink-0 mt-0.5"
                                    />
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <span className="break-words leading-tight">{f.nome}</span>
                                      {f.razaoSocial && f.razaoSocial !== f.nome && (
                                        <span className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                                          {f.razaoSocial}
                                        </span>
                                      )}
                                    </div>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* 4. Grupo do Produto (Multi-seleção) */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                  Grupo do Produto ({selectedGruposCotacao.length} selecionados)
                </label>
                <button
                  type="button"
                  onClick={() => setIsGruposCotacaoOpen(!isGruposCotacaoOpen)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-left flex items-center justify-between focus:outline-none focus:border-cyan-600 font-medium"
                >
                  <span className="truncate">
                    {selectedGruposCotacao.length === 0
                      ? 'Todos os grupos'
                      : `${selectedGruposCotacao.length} grupos`}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </button>

                {isGruposCotacaoOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 space-y-2 min-w-[260px]">
                    <input
                      type="text"
                      placeholder="Pesquisar grupo..."
                      value={buscaGrupoCotacao}
                      onChange={(e) => setBuscaGrupoCotacao(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 focus:outline-none focus:border-cyan-600"
                    />

                    <div className="flex items-center justify-between text-[10px] text-cyan-700 px-1 font-semibold">
                      <button
                        type="button"
                        onClick={() => setSelectedGruposCotacao(grupos.map((g) => g.nome))}
                        className="hover:underline"
                      >
                        Marcar todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedGruposCotacao([])}
                        className="hover:underline"
                      >
                        Desmarcar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsGruposCotacaoOpen(false)}
                        className="hover:underline text-slate-500"
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {grupos
                        .filter((g) => g.nome.toLowerCase().includes(buscaGrupoCotacao.toLowerCase()))
                        .map((g) => {
                          const isChecked = selectedGruposCotacao.includes(g.nome);
                          return (
                            <label
                              key={g.id}
                              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs ${
                                isChecked ? 'bg-cyan-50 font-bold text-cyan-900' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => setSelectedGruposCotacao(toggleArrayItem(selectedGruposCotacao, g.nome))}
                                className="w-3.5 h-3.5 rounded text-cyan-600"
                              />
                              <span className="truncate">{g.nome}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags dos Filtros Selecionados em Montar Cotação */}
            {(selectedProdutosCotacao.length > 0 || selectedGruposCotacao.length > 0 || selectedFornecedoresCotacao.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Filtros Ativos:</span>
                
                {selectedProdutosCotacao.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                  >
                    <span>Cód {p.codigo}: {p.nome.slice(0, 24)}...</span>
                    <button
                      type="button"
                      onClick={() => setSelectedProdutosCotacao(selectedProdutosCotacao.filter((sp) => sp.id !== p.id))}
                      className="text-amber-700 hover:text-amber-950 font-black ml-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}

                {selectedGruposCotacao.map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300"
                  >
                    <span>Grupo: {g}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedGruposCotacao(selectedGruposCotacao.filter((sg) => sg !== g))}
                      className="text-slate-600 hover:text-slate-900 font-black ml-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}

                {selectedFornecedoresCotacao.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300"
                  >
                    <span>Forn: {f.slice(0, 20)}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFornecedoresCotacao(selectedFornecedoresCotacao.filter((sf) => sf !== f))}
                      className="text-blue-700 hover:text-blue-950 font-black ml-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Linha de Dados da Cotação: Fornecedor Destinatário e Observações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1 uppercase">
                  Fornecedor Alvo da Cotação (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Kalunga, Inovasupri, Smart Color..."
                  value={cotacaoNomeFornecedor}
                  onChange={(e) => setCotacaoNomeFornecedor(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-amber-50/30 focus:outline-none focus:border-amber-600 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                  Observações da Cotação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Prazo de pagamento 28DD, entrega em Niterói..."
                  value={cotacaoObservacoes}
                  onChange={(e) => setCotacaoObservacoes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-cyan-600"
                />
              </div>
            </div>

            {/* Botões de Ação da Pesquisa e da Cotação */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchProdutosCotacao}
                  disabled={loadingCotacao}
                  className="px-4 py-2 bg-[#002B49] hover:bg-[#001D33] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {loadingCotacao ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Pesquisar Produtos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleDiscardDraft();
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </button>
              </div>

              {/* Botões de Exportação e Finalização */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportCotacaoExcel}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Exportar Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalizarCotacao}
                  disabled={finalizingCotacao || itensCotacaoSelecionados.length === 0}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black transition flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {finalizingCotacao ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                  <span>Finalizar Cotação ({itensCotacaoSelecionados.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tabela de Montar Cotação com todas as colunas solicitadas */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-3 bg-amber-50/70 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-950">Montagem de Cotação de Compras</span>
                <span className="text-[11px] text-amber-800">
                  Preencha a "Quantidade a ser pedida" nos itens desejados
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-600 font-semibold">
                  Total da Cotação: <strong className="text-emerald-700 font-mono text-sm">R$ {totalCotacaoMontagem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[620px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#002B49] text-white sticky top-0 z-10 select-none">
                  <tr className="border-b border-blue-900 text-[10px]">
                    <th className="px-2.5 py-2 font-bold whitespace-nowrap">CÓDIGO INTERNO</th>
                    <th className="px-3 py-2 font-bold min-w-[200px]">NOME DO PRODUTO</th>
                    <th className="px-2 py-2 font-bold text-center whitespace-nowrap">ESTOQUE</th>
                    <th className="px-2 py-2 font-bold text-center whitespace-nowrap bg-blue-950">QTD MÍNIMA</th>
                    <th className="px-2 py-2 font-bold text-center whitespace-nowrap bg-blue-950">QTD MÁXIMA</th>
                    <th className="px-2 py-2 font-bold whitespace-nowrap">ÚLTIMA COMPRA</th>
                    <th className="px-2 py-2 font-bold text-center whitespace-nowrap">QTD ÚLT. COMPRA</th>
                    <th className="px-2 py-2 font-bold text-right whitespace-nowrap bg-slate-900">VALOR ÚLT. COMPRA</th>
                    <th className="px-2.5 py-2 font-bold text-right whitespace-nowrap bg-amber-950 text-amber-300">
                      VALOR COTAÇÃO (R$)
                    </th>
                    <th className="px-2.5 py-2 font-bold text-center whitespace-nowrap bg-amber-500 text-slate-950 font-black">
                      QTD A PEDIR
                    </th>
                    <th className="px-2.5 py-2 font-bold text-right whitespace-nowrap bg-[#001D33]">SUBTOTAL (R$)</th>
                    <th className="px-2.5 py-2 font-bold text-center whitespace-nowrap">AÇÕES</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingCotacao ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                          <span className="font-semibold text-xs">Pesquisando produtos com códigos internos e fornecedores...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !hasSearchedCotacao ? (
                    <tr>
                      <td colSpan={12} className="py-16 text-center text-slate-500 bg-slate-50/50">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                          <Search className="w-8 h-8 text-amber-500/80 mb-1" />
                          <span className="font-bold text-sm text-slate-800">
                            Nenhuma pesquisa realizada ainda
                          </span>
                          <span className="text-xs text-slate-500 text-center leading-relaxed">
                            Preencha os campos da guia de pesquisa acima (Código Interno, Produtos, Fornecedor ou Grupo) e clique no botão <strong className="text-amber-700 font-bold">"Pesquisar Produtos"</strong> para listar os itens desejados.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : cotacaoProdutosList.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        Nenhum produto encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    cotacaoProdutosList.map((item, idx) => {
                      const isEven = idx % 2 === 0;
                      const qPedida = parseFloat(item.quantidadePedida) || 0;
                      const valCot = parseFloat(item.valorCotacao) || 0;
                      const subtotal = qPedida * valCot;
                      const isSaving = savingLimitId === item.produtoId;
                      const isSaved = savedLimitId === item.produtoId;
                      const isUnderStock = item.estoqueMinimo > 0 && item.estoqueAtual <= item.estoqueMinimo;

                      return (
                        <tr
                          key={item.produtoId}
                          className={`transition ${
                            qPedida > 0
                              ? 'bg-amber-50/90 font-medium border-l-4 border-l-amber-500 border-b border-amber-200'
                              : isEven
                              ? 'bg-slate-100/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] border-b border-slate-200/90'
                              : 'bg-white border-b border-slate-200/50'
                          } hover:bg-amber-100/40`}
                        >
                          {/* 1. Código interno do produto */}
                          <td className="px-2.5 py-1.5 font-mono font-bold text-[#002B49] whitespace-nowrap">
                            {item.codigo}
                          </td>

                          {/* 2. Nome do Produto */}
                          <td className="px-3 py-1.5">
                            <span className="font-semibold text-slate-900 block">{item.nome}</span>
                            <span className="text-[10px] text-slate-400 block font-medium">{item.nomeGrupo}</span>
                          </td>

                          {/* 3. Estoque Atual */}
                          <td className="px-2 py-1.5 text-center font-bold font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                isUnderStock
                                  ? 'bg-rose-100 text-rose-900 font-extrabold border border-rose-300'
                                  : 'text-slate-700'
                              }`}
                              title={isUnderStock ? 'Abaixo ou no limite do estoque mínimo!' : 'Estoque atual'}
                            >
                              {item.estoqueAtual}
                            </span>
                          </td>

                          {/* 4. Quantidade Mínima (Editável pelo usuário) */}
                          <td className="px-1.5 py-1 text-center whitespace-nowrap bg-blue-50/40">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.estoqueMinimo}
                              onChange={(e) =>
                                handleUpdateProductRow(item.produtoId, 'estoqueMinimo', parseFloat(e.target.value) || 0)
                              }
                              className="w-16 px-1.5 py-0.5 text-xs text-center font-bold border border-slate-300 rounded focus:outline-none focus:border-cyan-600 bg-white"
                              title="Quantidade mínima cadastrada no sistema (editável)"
                            />
                          </td>

                          {/* 5. Quantidade Máxima (Editável pelo usuário) */}
                          <td className="px-1.5 py-1 text-center whitespace-nowrap bg-blue-50/40">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.estoqueMaximo}
                              onChange={(e) =>
                                handleUpdateProductRow(item.produtoId, 'estoqueMaximo', parseFloat(e.target.value) || 0)
                              }
                              className="w-16 px-1.5 py-0.5 text-xs text-center font-bold border border-slate-300 rounded focus:outline-none focus:border-cyan-600 bg-white"
                              title="Quantidade máxima cadastrada no sistema (editável)"
                            />
                          </td>

                          {/* 6. Data da Última Compra */}
                          <td className="px-2 py-1.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {item.dataUltimaCompra || '-'}
                          </td>

                          {/* 7. Quantidade Comprada na Última Compra */}
                          <td className="px-2 py-1.5 text-center font-mono font-medium text-slate-700 whitespace-nowrap">
                            {item.quantidadeUltimaCompra ?? '-'}
                          </td>

                          {/* 8. Valor da Última Compra */}
                          <td className="px-2 py-1.5 text-right font-mono font-semibold text-slate-700 whitespace-nowrap bg-slate-50">
                            {item.valorUltimaCompra
                              ? `R$ ${item.valorUltimaCompra.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '-'}
                          </td>

                          {/* 9. Valor na Cotação (Editável pelo usuário) */}
                          <td className="px-1.5 py-1 text-right whitespace-nowrap bg-amber-50/70">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-[10px] text-slate-400 font-bold">R$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.valorCotacao}
                                onChange={(e) =>
                                  handleUpdateProductRow(item.produtoId, 'valorCotacao', parseFloat(e.target.value) || 0)
                                }
                                className="w-20 px-1.5 py-0.5 text-xs text-right font-bold font-mono border border-amber-300 rounded focus:outline-none focus:border-amber-600 bg-white text-slate-900"
                                title="Valor unitário na cotação (editável pelo usuário)"
                              />
                            </div>
                          </td>

                          {/* 10. Quantidade a Ser Pedida (Em branco para digitação) */}
                          <td className="px-1.5 py-1 text-center whitespace-nowrap bg-amber-100/50">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={item.quantidadePedida}
                              onChange={(e) =>
                                handleUpdateProductRow(item.produtoId, 'quantidadePedida', e.target.value)
                              }
                              className={`w-16 px-1.5 py-0.5 text-xs text-center font-black font-mono rounded border transition focus:outline-none ${
                                qPedida > 0
                                  ? 'border-amber-600 bg-amber-100 text-amber-950 ring-1 ring-amber-500'
                                  : 'border-slate-300 bg-white text-slate-900 focus:border-amber-500'
                              }`}
                              title="Digite a quantidade a ser pedida nesta cotação"
                            />
                          </td>

                          {/* 11. Subtotal Calculado */}
                          <td className="px-2.5 py-1.5 text-right font-mono font-bold whitespace-nowrap">
                            <span className={subtotal > 0 ? 'text-emerald-800' : 'text-slate-400'}>
                              R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* 12. Ação: Salvar Limites no Sistema */}
                          <td className="px-2 py-1 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleSaveLimits(item)}
                              disabled={isSaving}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer ${
                                isSaved
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 hover:bg-[#002B49] text-slate-700 hover:text-white'
                              }`}
                              title="Salvar quantidade mínima e máxima cadastradas no sistema"
                            >
                              {isSaving ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : isSaved ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Salvo</span>
                                </>
                              ) : (
                                <>
                                  <Save className="w-3 h-3" />
                                  <span>Salvar Limites</span>
                                </>
                              )}
                            </button>
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

      {/* ============================================================== */}
      {/* MENU 3: COTAÇÕES FEITAS (SEQUENCIAL 0001, 0002...)             */}
      {/* ============================================================== */}
      {activeTab === 'cotacoes_feitas' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#002B49]">Histórico de Cotações Feitas</h2>
              <p className="text-xs text-slate-500">
                Numeração crescente automática iniciada em 0001. Visualize ou imprima cada cotação.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchCotacoesFeitas}
              disabled={loadingFeitas}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              {loadingFeitas ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>Atualizar Histórico</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#002B49] text-white sticky top-0 z-10 select-none">
                  <tr className="border-b border-blue-900 text-[11px]">
                    <th className="px-4 py-2.5 font-bold whitespace-nowrap">Nº COTAÇÃO</th>
                    <th className="px-4 py-2.5 font-bold whitespace-nowrap">DATA / HORA</th>
                    <th className="px-4 py-2.5 font-bold">FORNECEDOR DESTINATÁRIO</th>
                    <th className="px-3 py-2.5 font-bold text-center whitespace-nowrap">QTD ITENS</th>
                    <th className="px-4 py-2.5 font-bold text-right whitespace-nowrap">VALOR TOTAL (R$)</th>
                    <th className="px-4 py-2.5 font-bold whitespace-nowrap">CRIADO POR</th>
                    <th className="px-4 py-2.5 font-bold text-center whitespace-nowrap bg-[#001D33]">AÇÕES</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingFeitas ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-cyan-700" />
                          <span className="font-semibold text-xs">Carregando cotações feitas...</span>
                        </div>
                      </td>
                    </tr>
                  ) : cotacoesFeitasList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Nenhuma cotação finalizada ainda. Acesse a aba "Montar Cotação" para criar a primeira!
                      </td>
                    </tr>
                  ) : (
                    cotacoesFeitasList.map((c, idx) => {
                      const isEven = idx % 2 === 0;

                      return (
                        <tr
                          key={c.id}
                          className={`transition ${
                            isEven
                              ? 'bg-slate-100/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] border-b border-slate-200/90'
                              : 'bg-white border-b border-slate-200/50'
                          } hover:bg-slate-50`}
                        >
                          {/* Nº Cotação */}
                          <td className="px-4 py-2.5 font-mono font-black text-sm text-[#002B49] whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg bg-cyan-100 text-cyan-950 border border-cyan-300">
                              #{c.numero}
                            </span>
                          </td>

                          {/* Data */}
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {new Date(c.createdAt).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(c.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>

                          {/* Fornecedor */}
                          <td className="px-4 py-2.5 font-semibold text-slate-800">
                            {c.nomeFornecedor || 'Múltiplos Fornecedores'}
                          </td>

                          {/* Quantidade de Itens */}
                          <td className="px-3 py-2.5 text-center font-bold font-mono text-slate-700 whitespace-nowrap">
                            {c.quantidadeItens} {c.quantidadeItens === 1 ? 'item' : 'itens'}
                          </td>

                          {/* Valor Total */}
                          <td className="px-4 py-2.5 text-right font-bold font-mono text-emerald-800 text-sm whitespace-nowrap">
                            R$ {c.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Criado Por */}
                          <td className="px-4 py-2.5 text-slate-600 text-[11px] whitespace-nowrap">
                            {c.criadoPor || 'Administrador'}
                          </td>

                          {/* Ações: Visualizar Cotação e Imprimir Cotação */}
                          <td className="px-4 py-2 text-center whitespace-nowrap border-l border-slate-200">
                            <div className="flex items-center justify-center gap-2">
                              {/* Botão 1: Visualizar Cotação */}
                              <button
                                type="button"
                                onClick={() => handleOpenViewModal(c)}
                                className="px-3 py-1.5 bg-[#002B49] hover:bg-[#001D33] text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                                title="Visualizar detalhes da cotação"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Visualizar Cotação</span>
                              </button>

                              {/* Botão 2: Imprimir Cotação */}
                              <button
                                type="button"
                                onClick={() => handlePrintCotacao(c)}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                                title="Imprimir ou gerar PDF desta cotação"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Imprimir Cotação</span>
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

      {/* ============================================================== */}
      {/* MODAL / DOCUMENTO: VISUALIZAR & IMPRIMIR COTAÇÃO               */}
      {/* ============================================================== */}
      {isViewModalOpen && selectedCotacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Topo do Modal (Não impresso no papel) */}
            <div className="bg-[#002B49] text-white px-6 py-3.5 flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center font-bold">
                  <FileCheck2 className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Cotação de Preços nº #{selectedCotacao.numero}</h3>
                  <p className="text-xs text-cyan-200">
                    Finalizada em {new Date(selectedCotacao.createdAt).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(selectedCotacao.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo Imprimível do Documento */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 text-slate-800 print:p-0 print:overflow-visible">
              {/* Cabeçalho Oficial do Documento */}
              <div className="flex items-start justify-between border-b border-slate-300 pb-5">
                <div>
                  <h1 className="text-2xl font-black text-[#002B49] tracking-tight">INFOGED TECNOLOGIA</h1>
                  <p className="text-xs text-slate-500 font-medium">Soluções Corporativas &bull; Suprimentos &bull; Assistência Técnica</p>
                  <p className="text-xs text-slate-500 mt-1">CNPJ: 29.263.825/0001-80 &bull; contato@infoged.com.br</p>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 rounded bg-slate-100 border border-slate-300 font-mono font-black text-lg text-[#002B49]">
                    COTAÇÃO Nº {selectedCotacao.numero}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    Data: {new Date(selectedCotacao.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Emitido por: {selectedCotacao.criadoPor || 'Administrador'}
                  </p>
                </div>
              </div>

              {/* Informações do Fornecedor / Destinatário */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                    Fornecedor / Destinatário
                  </span>
                  <span className="font-black text-sm text-slate-900 block mt-0.5">
                    {selectedCotacao.nomeFornecedor || 'Múltiplos Fornecedores'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                    Observações / Condições Comerciais
                  </span>
                  <span className="text-slate-700 block mt-0.5 font-medium">
                    {selectedCotacao.observacoes || 'Sem observações adicionais.'}
                  </span>
                </div>
              </div>

              {/* Tabela dos Itens Cotados */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Itens Requisitados para Cotação
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                      <tr>
                        <th className="p-2 w-12 text-center">Item</th>
                        <th className="p-2 w-32">Código Interno</th>
                        <th className="p-2">Descrição do Produto</th>
                        <th className="p-2 text-center w-24">Qtd Pedida</th>
                        <th className="p-2 text-right w-28">Valor Unit. (R$)</th>
                        <th className="p-2 text-right w-28">Subtotal (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.isArray(selectedCotacao.itens) &&
                        selectedCotacao.itens.map((item: any, i: number) => {
                          const qtd = parseFloat(item.quantidadePedida) || 0;
                          const vUnit = parseFloat(item.valorCotacao) || 0;
                          const sub = qtd * vUnit;

                          return (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-2 text-center text-slate-500 font-mono">{i + 1}</td>
                              <td className="p-2 font-mono font-bold text-slate-800">{item.codigo}</td>
                              <td className="p-2 font-medium text-slate-900">{item.nome}</td>
                              <td className="p-2 text-center font-bold font-mono text-cyan-900 text-sm">
                                {qtd}
                              </td>
                              <td className="p-2 text-right font-mono text-slate-700">
                                R$ {vUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-slate-900">
                                R$ {sub.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totalizador */}
              <div className="flex justify-end pt-3">
                <div className="w-64 p-3 rounded-xl bg-slate-50 border border-slate-300 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total de Itens:</span>
                    <span className="font-bold">{selectedCotacao.quantidadeItens}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-black text-[#002B49]">
                    <span>VALOR TOTAL:</span>
                    <span className="font-mono text-emerald-800">
                      R$ {selectedCotacao.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rodapé de Assinatura para Impressão */}
              <div className="pt-10 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-600 mt-8">
                <div>
                  <div className="border-t border-slate-400 w-48 mx-auto mb-1" />
                  <span>Responsável Compras (INFOGED)</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 w-48 mx-auto mb-1" />
                  <span>Aceite Fornecedor (Assinatura / Carimbo)</span>
                </div>
              </div>
            </div>

            {/* Rodapé do Modal (Não impresso) */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2.5 print:hidden">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold text-white bg-[#002B49] hover:bg-[#001D33] rounded-lg shadow-xs flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / Gerar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
