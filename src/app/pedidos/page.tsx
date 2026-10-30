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
  PlusCircle,
  RefreshCw,
  Sparkles,
  Clock,
  Calendar,
  Trash2,
} from 'lucide-react';

export default function PedidosPage() {
  const { currentUser } = useApp();

  // 4 Menus principais da aplicação
  const [activeTab, setActiveTab] = useState<'ultimas_vendas' | 'montar_cotacao' | 'cotacoes_andamento' | 'pedidos_feitos'>('ultimas_vendas');

  // Estados de Cotações em Andamento (Menu 3)
  const [cotacoesAndamentoList, setCotacoesAndamentoList] = useState<any[]>([]);
  const [loadingCotacoesAndamento, setLoadingCotacoesAndamento] = useState(false);

  // Estados do Modal "Gerar Pedido" a partir de Cotação em Andamento
  const [isGerarPedidoModalOpen, setIsGerarPedidoModalOpen] = useState(false);
  const [cotacaoParaPedido, setCotacaoParaPedido] = useState<any | null>(null);
  const [itensParaPedido, setItensParaPedido] = useState<any[]>([]);
  const [observacoesPedido, setObservacoesPedido] = useState('');
  const [savingGerarPedido, setSavingGerarPedido] = useState(false);

  // Campo de pesquisa dentro do resultado apresentado em Montar Cotação
  const [buscaFiltroResultado, setBuscaFiltroResultado] = useState('');

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
  const [mesesLabels, setMesesLabels] = useState<{ mesAnterior: string; mesAtual: string }>({
    mesAnterior: 'MÊS ANTERIOR',
    mesAtual: 'MÊS ATUAL',
  });

  // Controle de rolagem horizontal sincronizada e visível
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  useEffect(() => {
    if (tableContainerRef.current) {
      setTableScrollWidth(tableContainerRef.current.scrollWidth);
    }
  }, [cotacaoProdutosList, activeTab]);

  const handleTopScroll = () => {
    if (tableContainerRef.current && topScrollRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleTableScroll = () => {
    if (tableContainerRef.current && topScrollRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  };

  const scrollToRight = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ left: tableContainerRef.current.scrollWidth, behavior: 'smooth' });
    }
  };

  const scrollToLeft = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

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

  // Filtros de Pesquisa para o Menu 3: Cotações Feitas (Fornecedor, Situação e Data)
  const [selectedFornecedoresFeitas, setSelectedFornecedoresFeitas] = useState<string[]>([]);
  const [buscaFornecedorFeitas, setBuscaFornecedorFeitas] = useState('');
  const [isFornecedoresFeitasOpen, setIsFornecedoresFeitasOpen] = useState(false);
  const [filtroSituacaoFeitas, setFiltroSituacaoFeitas] = useState<string>('TODAS');
  const [filtroDataInicioFeitas, setFiltroDataInicioFeitas] = useState<string>('');
  const [filtroDataFimFeitas, setFiltroDataFimFeitas] = useState<string>('');

  // Identificação do fornecedor associado à cotação com fallback inteligente para os itens
  const getNomeFornecedorCotacao = (c: any) => {
    if (c.nomeFornecedor && c.nomeFornecedor !== 'Cotação Geral' && c.nomeFornecedor !== 'Múltiplos Fornecedores') {
      return c.nomeFornecedor;
    }
    let itens = [];
    try {
      itens = Array.isArray(c.itens) ? c.itens : JSON.parse(c.itens || '[]');
    } catch {
      itens = [];
    }
    const allSuppliers = itens.flatMap((i: any) => (Array.isArray(i.fornecedores) ? i.fornecedores : []));
    if (allSuppliers.length > 0) {
      const counts: Record<string, number> = {};
      allSuppliers.forEach((s: string) => {
        counts[s] = (counts[s] || 0) + 1;
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return sorted[0] ? sorted[0][0] : (c.nomeFornecedor || 'Múltiplos Fornecedores');
    }
    return c.nomeFornecedor || 'Múltiplos Fornecedores';
  };

  // Filtragem dinâmica do Histórico de Cotações Feitas
  const cotacoesFeitasFiltradas = useMemo(() => {
    return cotacoesFeitasList.filter((c) => {
      // 1. Filtro de Fornecedor
      if (selectedFornecedoresFeitas.length > 0) {
        const nomeFornecedorCot = getNomeFornecedorCotacao(c).toLowerCase();
        let itensFornecedores: string[] = [];
        try {
          const itens = Array.isArray(c.itens) ? c.itens : JSON.parse(c.itens || '[]');
          itensFornecedores = itens.flatMap((i: any) => (Array.isArray(i.fornecedores) ? i.fornecedores : []));
        } catch {}

        const matchFornecedor = selectedFornecedoresFeitas.some((sf) => {
          const cleanSf = sf.toLowerCase();
          return (
            nomeFornecedorCot.includes(cleanSf) ||
            itensFornecedores.some((itemF) => itemF.toLowerCase().includes(cleanSf))
          );
        });

        if (!matchFornecedor) return false;
      }

      // 2. Filtro de Situação
      if (filtroSituacaoFeitas && filtroSituacaoFeitas !== 'TODAS') {
        const status = c.status || 'AGUARDANDO_CHEGAR';
        if (status !== filtroSituacaoFeitas) return false;
      }

      // 3. Filtro de Data Inicial
      if (filtroDataInicioFeitas) {
        const dataCot = new Date(c.createdAt).toISOString().split('T')[0];
        if (dataCot < filtroDataInicioFeitas) return false;
      }

      // 4. Filtro de Data Final
      if (filtroDataFimFeitas) {
        const dataCot = new Date(c.createdAt).toISOString().split('T')[0];
        if (dataCot > filtroDataFimFeitas) return false;
      }

      return true;
    });
  }, [
    cotacoesFeitasList,
    selectedFornecedoresFeitas,
    filtroSituacaoFeitas,
    filtroDataInicioFeitas,
    filtroDataFimFeitas,
  ]);

  const [selectedCotacao, setSelectedCotacao] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Estados para o Modal de Inserir Novo Produto
  const [isNovoProdutoModalOpen, setIsNovoProdutoModalOpen] = useState(false);
  const [novoProdutoCodigo, setNovoProdutoCodigo] = useState('');
  const [novoProdutoNome, setNovoProdutoNome] = useState('');
  const [novoProdutoFornecedor, setNovoProdutoFornecedor] = useState('');
  const [novoProdutoGrupoId, setNovoProdutoGrupoId] = useState('');
  const [novoProdutoNomeGrupo, setNovoProdutoNomeGrupo] = useState('Diversos');
  const [novoProdutoValorCusto, setNovoProdutoValorCusto] = useState('');
  const [novoProdutoQtdPedida, setNovoProdutoQtdPedida] = useState('');
  const [novoProdutoReservas, setNovoProdutoReservas] = useState('');
  const [loadingGerarCodigo, setLoadingGerarCodigo] = useState(false);
  const [savingNovoProduto, setSavingNovoProduto] = useState(false);
  const [codigoDuplicadoInfo, setCodigoDuplicadoInfo] = useState<{ exists: boolean; produtoNome?: string } | null>(null);
  const [checkingCodigo, setCheckingCodigo] = useState(false);
  const [isFornecedorModalDropdownOpen, setIsFornecedorModalDropdownOpen] = useState(false);
  const [buscaFornecedorModal, setBuscaFornecedorModal] = useState('');

  // Estados para o Modal de Conferência de Produtos (Cotações Feitas)
  const [isConferenciaModalOpen, setIsConferenciaModalOpen] = useState(false);
  const [cotacaoEmConferencia, setCotacaoEmConferencia] = useState<any | null>(null);
  const [itensConferencia, setItensConferencia] = useState<any[]>([]);
  const [savingConferencia, setSavingConferencia] = useState(false);

  // Verificação de duplicidade de código com debounce ao digitar
  useEffect(() => {
    if (!isNovoProdutoModalOpen || !novoProdutoCodigo || !novoProdutoCodigo.trim()) {
      setCodigoDuplicadoInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingCodigo(true);
        const res = await fetch(`/api/pedidos?action=verificar_codigo&codigo=${encodeURIComponent(novoProdutoCodigo.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            setCodigoDuplicadoInfo({ exists: true, produtoNome: data.produto?.nome });
          } else {
            setCodigoDuplicadoInfo({ exists: false });
          }
        }
      } catch (e) {
        console.error('Erro ao verificar código:', e);
      } finally {
        setCheckingCodigo(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [novoProdutoCodigo, isNovoProdutoModalOpen]);

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

      // Pré-carrega contadores de cotações em andamento e pedidos feitos
      fetchCotacoesAndamento();
      fetchCotacoesFeitas();
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
        const fetched: any[] = data.produtos || [];
        setCotacaoProdutosList((prev) => {
          const comQtd = prev.filter((p) => (parseFloat(p.quantidadePedida) || 0) > 0);
          const merged = fetched.map((item) => {
            const existing = prev.find((p) => p.produtoId === item.produtoId);
            if (existing && (parseFloat(existing.quantidadePedida) || 0) > 0) {
              return {
                ...item,
                quantidadePedida: existing.quantidadePedida,
                reservas: existing.reservas || item.reservas || '',
                valorCotacao: existing.valorCotacao ?? item.valorCotacao,
              };
            }
            return item;
          });
          const missingComQtd = comQtd.filter(
            (p) => !merged.some((m) => m.produtoId === p.produtoId)
          );
          const finalResult = [...missingComQtd, ...merged];
          finalResult.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
          return finalResult;
        });
        if (data.mesesLabels) {
          setMesesLabels(data.mesesLabels);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar produtos para cotação:', err);
    } finally {
      setLoadingCotacao(false);
    }
  };

  // 6. Carregar Cotações em Andamento (Menu 3)
  const fetchCotacoesAndamento = async () => {
    try {
      setLoadingCotacoesAndamento(true);
      const res = await fetch('/api/pedidos?action=cotacoes_andamento');
      if (res.ok) {
        const data = await res.json();
        setCotacoesAndamentoList(data.cotacoes || []);
      }
    } catch (err) {
      console.error('Erro ao buscar cotações em andamento:', err);
    } finally {
      setLoadingCotacoesAndamento(false);
    }
  };

  // 6.1. Carregar Pedidos Feitos (Menu 4 - antigo Cotações Feitas)
  const fetchCotacoesFeitas = async () => {
    try {
      setLoadingFeitas(true);
      const res = await fetch('/api/pedidos?action=cotacoes');
      if (res.ok) {
        const data = await res.json();
        setCotacoesFeitasList(data.cotacoes || []);
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos feitos:', err);
    } finally {
      setLoadingFeitas(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cotacoes_andamento') {
      fetchCotacoesAndamento();
    }
    if (activeTab === 'pedidos_feitos' || (activeTab as any) === 'cotacoes_feitas') {
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

  // Produtos filtrados pelo campo de busca interno do resultado em "Montar Cotação"
  // Regra do usuário: "e quero que todo produto que eu coloque a quantidade a pedir ela fique ali e só saia se eu zerar a quantidade a ser pedida, e possa fazer esse processo com varios produtos."
  const produtosFiltradosResultado = useMemo(() => {
    const termo = buscaFiltroResultado.trim().toLowerCase();
    return cotacaoProdutosList.filter((item) => {
      const qPed = parseFloat(item.quantidadePedida) || 0;
      if (qPed > 0) return true; // Fica fixo se tiver quantidade a pedir!
      if (!termo) return true;
      const matchCod = (item.codigo || '').toLowerCase().includes(termo);
      const matchNome = (item.nome || '').toLowerCase().includes(termo);
      return matchCod || matchNome;
    });
  }, [cotacaoProdutosList, buscaFiltroResultado]);

  // Total da Cotação em Montagem
  const totalCotacaoMontagem = useMemo(() => {
    return itensCotacaoSelecionados.reduce((acc, item) => {
      const q = parseFloat(item.quantidadePedida) || 0;
      const v = parseFloat(item.valorCotacao) || 0;
      return acc + q * v;
    }, 0);
  }, [itensCotacaoSelecionados]);

  // Gerar Cotação (Foto 4: Divide produtos por fornecedor e salva cotações individuais em "Cotações em Andamento")
  const handleGerarCotacao = async () => {
    if (itensCotacaoSelecionados.length === 0) {
      alert('Atenção: Preencha o campo "Qtd a Pedir" em pelo menos um produto antes de gerar a cotação.');
      return;
    }

    // Agrupa os itens por fornecedor
    const supplierMap = new Map<string, any[]>();
    for (const item of itensCotacaoSelecionados) {
      const qtdPedida = parseFloat(item.quantidadePedida) || 0;
      if (qtdPedida <= 0) continue;
      const valCot = parseFloat(item.valorCotacao) || 0;
      const formattedItem = {
        produtoId: item.produtoId,
        codigo: item.codigo,
        nome: item.nome,
        nomeGrupo: item.nomeGrupo,
        grupoId: item.grupoId,
        estoqueAtual: item.estoqueAtual,
        reservas: item.reservas || '',
        valorUltimaCompra: item.valorUltimaCompra,
        valorCotacao: valCot,
        quantidadePedida: qtdPedida,
        subtotal: qtdPedida * valCot,
        fornecedores: item.fornecedores,
      };

      // Determinar o fornecedor do item
      let fornNome = 'Fornecedor Geral';
      if (selectedFornecedoresCotacao.length > 0) {
        const matchForn = selectedFornecedoresCotacao.find((sf) =>
          item.fornecedores?.some((f: string) => f.toLowerCase() === sf.toLowerCase())
        );
        if (matchForn) {
          fornNome = matchForn;
        } else if (item.fornecedores && item.fornecedores.length > 0) {
          fornNome = item.fornecedores[0];
        }
      } else if (item.fornecedores && item.fornecedores.length > 0) {
        fornNome = item.fornecedores[0];
      } else if (cotacaoNomeFornecedor.trim()) {
        fornNome = cotacaoNomeFornecedor.trim();
      }

      if (!supplierMap.has(fornNome)) {
        supplierMap.set(fornNome, []);
      }
      supplierMap.get(fornNome)!.push(formattedItem);
    }

    const totalFornecedores = supplierMap.size;
    const msgConfirm =
      totalFornecedores > 1
        ? `Identificamos produtos de ${totalFornecedores} fornecedores diferentes. Deseja gerar ${totalFornecedores} cotações individuais em "Cotações em Andamento"?`
        : `Deseja gerar a cotação para o fornecedor "${Array.from(supplierMap.keys())[0]}" contendo ${itensCotacaoSelecionados.length} produto(s) no total de R$ ${totalCotacaoMontagem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`;

    if (!window.confirm(msgConfirm)) {
      return;
    }

    try {
      setFinalizingCotacao(true);

      const cotacoesPayload = Array.from(supplierMap.entries()).map(([forn, itens]) => {
        const total = itens.reduce((acc, curr) => acc + curr.subtotal, 0);
        return {
          nomeFornecedor: forn,
          itens,
          valorTotal: total,
          quantidadeItens: itens.length,
          observacoes: cotacaoObservacoes.trim(),
        };
      });

      const res = await fetch('/api/pedidos?action=gerar_cotacoes_andamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotacoes: cotacoesPayload,
          criadoPor: currentUser?.name || 'Administrador',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao gerar cotação(ões).');
        return;
      }

      // Sucesso: limpar a tela de montar cotação
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

      setSuccessCotacaoMessage(
        `${cotacoesPayload.length} cotação(ões) gerada(s) com sucesso em "Cotações em Andamento"!`
      );
      setTimeout(() => setSuccessCotacaoMessage(null), 6000);

      // Atualiza cotações em andamento e muda para a aba Cotações em Andamento
      await fetchCotacoesAndamento();
      setActiveTab('cotacoes_andamento');
    } catch (err) {
      console.error(err);
      alert('Falha de comunicação ao gerar cotações.');
    } finally {
      setFinalizingCotacao(false);
    }
  };

  // Abrir modal de Gerar Pedido a partir de uma Cotação em Andamento
  const handleOpenGerarPedidoModal = (cotacao: any) => {
    setCotacaoParaPedido(cotacao);
    let rawItens: any[] = [];
    try {
      rawItens = Array.isArray(cotacao.itens) ? cotacao.itens : JSON.parse(cotacao.itens || '[]');
    } catch {
      rawItens = [];
    }

    const itemsFormatted = rawItens.map((it: any) => ({
      ...it,
      valorCotacao: it.valorCotacao ?? it.valorUltimaCompra ?? 0,
      quantidadePedida: it.quantidadePedida ?? 0,
    }));

    setItensParaPedido(itemsFormatted);
    setObservacoesPedido(cotacao.observacoes || '');
    setIsGerarPedidoModalOpen(true);
  };

  // Atualizar item no modal de Gerar Pedido (valor ou quantidade editáveis)
  const handleUpdateItemParaPedido = (produtoId: string, field: 'valorCotacao' | 'quantidadePedida', value: number) => {
    setItensParaPedido((prev) =>
      prev.map((it) => {
        if (it.produtoId === produtoId || it.codigo === produtoId) {
          const updated = { ...it, [field]: value };
          const q = field === 'quantidadePedida' ? value : parseFloat(it.quantidadePedida) || 0;
          const v = field === 'valorCotacao' ? value : parseFloat(it.valorCotacao) || 0;
          updated.subtotal = q * v;
          return updated;
        }
        return it;
      })
    );
  };

  // Confirmar e Gerar Pedido (somente com produtos que tenham quantidade a pedir diferentes de zero)
  const handleConfirmarGerarPedido = async () => {
    if (!cotacaoParaPedido) return;

    // Filtra apenas produtos com quantidade a pedir > 0
    const itensValidos = itensParaPedido.filter((it) => {
      const q = parseFloat(it.quantidadePedida) || 0;
      return q > 0;
    });

    if (itensValidos.length === 0) {
      alert('Atenção: Para gerar o pedido, é necessário ter pelo menos um produto com quantidade a pedir maior que zero.');
      return;
    }

    const totalPedido = itensValidos.reduce((acc, curr) => {
      const q = parseFloat(curr.quantidadePedida) || 0;
      const v = parseFloat(curr.valorCotacao) || 0;
      return acc + q * v;
    }, 0);

    if (
      !window.confirm(
        `Deseja gerar o Pedido de Compra para o fornecedor "${cotacaoParaPedido.nomeFornecedor}" contendo ${itensValidos.length} produto(s) no total de R$ ${totalPedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`
      )
    ) {
      return;
    }

    try {
      setSavingGerarPedido(true);
      const res = await fetch('/api/pedidos?action=converter_em_pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotacaoId: cotacaoParaPedido.id,
          itens: itensValidos,
          observacoes: observacoesPedido.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao gerar pedido.');
        return;
      }

      setIsGerarPedidoModalOpen(false);
      setCotacaoParaPedido(null);
      setSuccessCotacaoMessage(data.message || `Pedido gerado com sucesso no menu Pedidos Feitos!`);
      setTimeout(() => setSuccessCotacaoMessage(null), 6000);

      // Atualiza listas e redireciona para a aba Pedidos Feitos
      await Promise.all([fetchCotacoesAndamento(), fetchCotacoesFeitas()]);
      setActiveTab('pedidos_feitos');
    } catch (err) {
      console.error(err);
      alert('Falha ao comunicar com o servidor.');
    } finally {
      setSavingGerarPedido(false);
    }
  };

  // Excluir Cotação em Andamento
  const handleExcluirCotacaoAndamento = async (cotacaoId: string, numero: string) => {
    if (!window.confirm(`Deseja realmente cancelar e excluir a cotação nº ${numero}?`)) {
      return;
    }
    try {
      const res = await fetch('/api/pedidos?action=excluir_cotacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotacaoId }),
      });
      if (res.ok) {
        fetchCotacoesAndamento();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir cotação.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Imprimir em PDF na tela de Montar Cotação (Apenas produtos com quantidade a pedir diferente de zero)
  const handleImprimirCotacaoMontagem = () => {
    if (itensCotacaoSelecionados.length === 0) {
      alert('Atenção: Preencha o campo "Qtd a Pedir" em pelo menos um produto para poder imprimir a cotação.');
      return;
    }

    const payloadItens = itensCotacaoSelecionados.map((item) => {
      const qtdPedida = parseFloat(item.quantidadePedida) || 0;
      const valCot = parseFloat(item.valorCotacao) || 0;
      return {
        produtoId: item.produtoId,
        codigo: item.codigo,
        nome: item.nome,
        grupo: item.nomeGrupo,
        estoqueAtual: item.estoqueAtual,
        reservas: item.reservas || '',
        valorUltimaCompra: item.valorUltimaCompra,
        valorCotacao: valCot,
        quantidadePedida: qtdPedida,
        subtotal: qtdPedida * valCot,
        fornecedores: item.fornecedores,
      };
    });

    const preview = {
      id: 'montagem_preview',
      numero: 'EM MONTAGEM',
      nomeFornecedor: cotacaoNomeFornecedor.trim() || 'Múltiplos Fornecedores',
      valorTotal: totalCotacaoMontagem,
      quantidadeItens: payloadItens.length,
      observacoes: cotacaoObservacoes.trim(),
      itens: payloadItens,
      criadoPor: currentUser?.name || 'Administrador',
      createdAt: new Date().toISOString(),
    };

    setSelectedCotacao(preview);
    setIsViewModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // Abertura do Modal de Inserir Novo Produto
  const handleOpenNovoProdutoModal = async () => {
    setLoadingGerarCodigo(true);
    setIsNovoProdutoModalOpen(true);
    setNovoProdutoNome('');
    setNovoProdutoFornecedor(selectedFornecedoresCotacao[0] || cotacaoNomeFornecedor || '');
    setNovoProdutoGrupoId(grupos[0]?.id || '');
    setNovoProdutoNomeGrupo(grupos[0]?.nome || 'Diversos');
    setNovoProdutoValorCusto('');
    setNovoProdutoQtdPedida('');
    setNovoProdutoReservas('');
    setCodigoDuplicadoInfo(null);
    setBuscaFornecedorModal('');
    setIsFornecedorModalDropdownOpen(false);

    try {
      const res = await fetch('/api/pedidos?action=gerar_codigo_interno');
      if (res.ok) {
        const data = await res.json();
        setNovoProdutoCodigo(data.codigoInterno || '');
      } else {
        const rand = String(Math.floor(100000 + Math.random() * 900000));
        setNovoProdutoCodigo(rand);
      }
    } catch {
      const rand = String(Math.floor(100000 + Math.random() * 900000));
      setNovoProdutoCodigo(rand);
    } finally {
      setLoadingGerarCodigo(false);
    }
  };

  // Regerar novo código interno exclusivo
  const handleRegerarCodigo = async () => {
    setLoadingGerarCodigo(true);
    setCodigoDuplicadoInfo(null);
    try {
      const res = await fetch('/api/pedidos?action=gerar_codigo_interno');
      if (res.ok) {
        const data = await res.json();
        setNovoProdutoCodigo(data.codigoInterno || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGerarCodigo(false);
    }
  };

  // Salvar e Inserir Novo Produto na lista em aberto da Cotação (em ordem alfabética)
  const handleSalvarNovoProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoProdutoNome.trim()) {
      alert('Por favor, informe o Nome do Produto.');
      return;
    }
    if (!novoProdutoCodigo.trim()) {
      alert('Por favor, informe o Código Interno do Produto.');
      return;
    }
    if (codigoDuplicadoInfo?.exists) {
      alert(`Atenção: O código "${novoProdutoCodigo}" já está cadastrado no sistema para o produto "${codigoDuplicadoInfo.produtoNome}". Por favor, utilize outro código.`);
      return;
    }

    try {
      setSavingNovoProduto(true);
      const fornObj = fornecedores.find(
        (f) =>
          f.nome.toLowerCase() === novoProdutoFornecedor.trim().toLowerCase() ||
          (f.razaoSocial && f.razaoSocial.toLowerCase() === novoProdutoFornecedor.trim().toLowerCase())
      );

      const res = await fetch('/api/pedidos?action=inserir_produto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoInterno: novoProdutoCodigo.trim(),
          nome: novoProdutoNome.trim(),
          grupoId: novoProdutoGrupoId,
          nomeGrupo: novoProdutoNomeGrupo,
          fornecedor: novoProdutoFornecedor.trim(),
          fornecedorId: fornObj?.id || '',
          valorCusto: parseFloat(novoProdutoValorCusto) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao cadastrar novo produto no Gestão Click.');
        return;
      }

      const qtdPed = novoProdutoQtdPedida ? novoProdutoQtdPedida.trim() : '';
      const prodInserido = {
        ...data.produto,
        quantidadePedida: qtdPed,
        reservas: novoProdutoReservas.trim(),
        valorCotacao: parseFloat(novoProdutoValorCusto) || 0,
      };

      // Insere na listagem de cotação em aberto e reordena em ORDEM ALFABÉTICA
      setCotacaoProdutosList((prev) => {
        const updated = [prodInserido, ...prev.filter((p) => p.produtoId !== prodInserido.produtoId)];
        updated.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
        return updated;
      });

      setHasSearchedCotacao(true);
      setIsNovoProdutoModalOpen(false);

      setSuccessCotacaoMessage(
        data.message || `Produto "${prodInserido.nome}" (Cód: ${prodInserido.codigo}) cadastrado com sucesso no Gestão Click e inserido na cotação!`
      );
      setTimeout(() => setSuccessCotacaoMessage(null), 6000);
    } catch (err) {
      console.error(err);
      alert('Falha ao comunicar com o servidor.');
    } finally {
      setSavingNovoProduto(false);
    }
  };

  // ====================================================================
  // FUNÇÕES DE CONFERÊNCIA DE PRODUTOS (COTAÇÕES FEITAS)
  // ====================================================================
  const handleOpenConferenciaModal = (cotacao: any) => {
    setCotacaoEmConferencia(cotacao);
    let itens = [];
    try {
      itens = Array.isArray(cotacao.itens) ? cotacao.itens : JSON.parse(cotacao.itens || '[]');
    } catch {
      itens = [];
    }

    // Inicializa campos de conferência caso não existam
    const formatted = itens.map((item: any) => ({
      ...item,
      quantidadeConferida: item.quantidadeConferida !== undefined && item.quantidadeConferida !== null ? item.quantidadeConferida : '',
      conferido: Boolean(item.conferido ?? false),
    }));

    setItensConferencia(formatted);
    setIsConferenciaModalOpen(true);
  };

  const handleUpdateItemConferencia = (index: number, field: string, value: any) => {
    setItensConferencia((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleMarcarTodosConferidos = () => {
    setItensConferencia((prev) =>
      prev.map((item) => ({
        ...item,
        quantidadeConferida: item.quantidadePedida,
        conferido: true,
      }))
    );
  };

  const handleLimparConferencia = () => {
    setItensConferencia((prev) =>
      prev.map((item) => ({
        ...item,
        quantidadeConferida: '',
        conferido: false,
      }))
    );
  };

  const handleSalvarConferencia = async () => {
    if (!cotacaoEmConferencia) return;

    try {
      setSavingConferencia(true);
      const res = await fetch('/api/pedidos?action=salvar_conferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cotacaoId: cotacaoEmConferencia.id,
          itens: itensConferencia,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao salvar conferência.');
        return;
      }

      // Atualiza na listagem de cotações feitas
      setCotacoesFeitasList((prev) =>
        prev.map((c) => (c.id === cotacaoEmConferencia.id ? data.cotacao : c))
      );

      setIsConferenciaModalOpen(false);
      setSuccessCotacaoMessage(data.message || 'Conferência gravada com sucesso!');
      setTimeout(() => setSuccessCotacaoMessage(null), 6000);
    } catch (err) {
      console.error(err);
      alert('Falha ao comunicar com o servidor.');
    } finally {
      setSavingConferencia(false);
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
        [`Vendas Mês Anterior (${mesesLabels.mesAnterior})`]: item.vendasMesAnterior ?? 0,
        [`Vendas Mês Atual (${mesesLabels.mesAtual})`]: item.vendasMesAtual ?? 0,
        'Data Última Compra': item.dataUltimaCompra || '-',
        'Qtd Última Compra': item.quantidadeUltimaCompra ?? '-',
        'Valor Última Compra (R$)': item.valorUltimaCompra ? item.valorUltimaCompra.toFixed(2) : '0.00',
        'Valor na Cotação (R$)': valCot.toFixed(2),
        'Reservas (OS / Venda)': item.reservas || '-',
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
            onClick={() => setActiveTab('cotacoes_andamento')}
            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
          >
            Ver Cotações em Andamento <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* BARRA DE NAVEGAÇÃO DOS 4 MENUS SOLICITADOS                    */}
      {/* ============================================================== */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-1.5 flex items-center gap-2 overflow-x-auto select-none">
        {/* Menu 1: Últimas Vendas */}
        <button
          type="button"
          onClick={() => setActiveTab('ultimas_vendas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
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

        {/* Menu 3: Cotações em Andamento (NOVO MENU!) */}
        <button
          type="button"
          onClick={() => setActiveTab('cotacoes_andamento')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'cotacoes_andamento'
              ? 'bg-[#002B49] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>3. Cotações em Andamento</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
            activeTab === 'cotacoes_andamento'
              ? 'bg-amber-400/20 text-amber-300'
              : 'bg-slate-200 text-slate-700'
          }`}>
            {cotacoesAndamentoList.length}
          </span>
        </button>

        {/* Menu 4: Pedidos Feitos (Renomeado de Cotações Feitas) */}
        <button
          type="button"
          onClick={() => setActiveTab('pedidos_feitos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'pedidos_feitos' || (activeTab as any) === 'cotacoes_feitas'
              ? 'bg-[#002B49] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-emerald-400" />
          <span>4. Pedidos Feitos</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
            activeTab === 'pedidos_feitos' || (activeTab as any) === 'cotacoes_feitas'
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-slate-200 text-slate-700'
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
                  placeholder={
                    selectedFornecedoresCotacao.length > 0
                      ? `Sugerido: ${selectedFornecedoresCotacao.join(', ')}`
                      : 'Ex: Elgin, Kalunga, Inovasupri...'
                  }
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
              <div className="flex items-center gap-2 flex-wrap">
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
                  onClick={handleOpenNovoProdutoModal}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Criar e inserir um novo produto na cotação com código de 6 dígitos automático"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Inserir Novo Produto</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleDiscardDraft();
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
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
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Exportar Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={handleImprimirCotacaoMontagem}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Imprimir ou gerar PDF somente dos produtos com quantidade a pedir preenchida (> 0)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleGerarCotacao}
                  disabled={finalizingCotacao || itensCotacaoSelecionados.length === 0}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black transition flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                  title="Gera cotações individuais por fornecedor e salva em Cotações em Andamento"
                >
                  {finalizingCotacao ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                  <span>Gerar Cotação ({itensCotacaoSelecionados.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tabela de Montar Cotação com todas as colunas solicitadas */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-3 bg-amber-50/70 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-950">
                  Montagem de Cotação de Compras {hasSearchedCotacao && `(${cotacaoProdutosList.length} produtos encontrados)`}
                </span>
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

            {/* Campo de pesquisa dentro do resultado apresentado */}
            {hasSearchedCotacao && cotacaoProdutosList.length > 0 && (
              <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="relative flex-1 min-w-[280px] max-w-lg">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={buscaFiltroResultado}
                    onChange={(e) => setBuscaFiltroResultado(e.target.value)}
                    placeholder="Pesquisar nos resultados por código interno ou nome do produto..."
                    className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-amber-600 font-medium bg-white shadow-2xs"
                  />
                  {buscaFiltroResultado && (
                    <button
                      type="button"
                      onClick={() => setBuscaFiltroResultado('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-0.5 cursor-pointer"
                      title="Limpar pesquisa nos resultados"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500 font-medium">
                    Exibindo <strong className="text-slate-800 font-bold">{produtosFiltradosResultado.length}</strong> de {cotacaoProdutosList.length} produtos
                  </span>
                  {itensCotacaoSelecionados.length > 0 && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                      <span>{itensCotacaoSelecionados.length} {itensCotacaoSelecionados.length === 1 ? 'produto com pedido' : 'produtos com pedido'}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Barra de rolagem superior e navegação rápida sempre visível */}
            {hasSearchedCotacao && cotacaoProdutosList.length > 0 && (
              <div className="bg-slate-100 border-b border-slate-300 px-3 py-2 flex items-center justify-between gap-3 text-xs select-none">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold shrink-0">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mr-1">Rolar colunas:</span>
                  <button
                    type="button"
                    onClick={scrollToLeft}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-200 border border-slate-300 text-[#002B49] font-bold transition flex items-center gap-1 text-[11px] shadow-xs cursor-pointer"
                  >
                    ⬅️ Código / Produto
                  </button>
                  <button
                    type="button"
                    onClick={scrollToRight}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition flex items-center gap-1 text-[11px] shadow-xs cursor-pointer"
                  >
                    Qtd a Pedir & Subtotal ➡️
                  </button>
                </div>

                {/* Barra de rolagem horizontal superior sincronizada */}
                <div
                  ref={topScrollRef}
                  onScroll={handleTopScroll}
                  className="flex-1 overflow-x-auto h-4 bg-slate-200/90 rounded-full cursor-ew-resize border border-slate-300 shadow-inner"
                  title="Arraste esta barra para rolar horizontalmente as colunas da tabela"
                >
                  <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
                </div>
              </div>
            )}

            <div
              ref={tableContainerRef}
              onScroll={handleTableScroll}
              className="overflow-x-auto max-h-[620px] scrollbar-thin scrollbar-thumb-[#002B49] scrollbar-track-slate-200"
              style={{
                scrollbarWidth: 'auto',
                scrollbarColor: '#002B49 #e2e8f0',
              }}
            >
              <table className="w-full text-left text-xs border-separate border-spacing-0">
                <thead className="select-none">
                  <tr className="text-[10px]">
                    {/* 1. Código interno (Sticky) */}
                    <th className="px-2.5 py-2 font-bold whitespace-nowrap sticky top-0 left-0 z-30 bg-[#002B49] text-white w-[110px] min-w-[110px] max-w-[110px] border-b border-r border-blue-900 shadow-[2px_0_4px_rgba(0,0,0,0.15)]">
                      CÓDIGO INTERNO
                    </th>

                    {/* 2. Nome do Produto (Sticky) */}
                    <th className="px-3 py-2 font-bold sticky top-0 left-[110px] z-30 bg-[#002B49] text-white w-[280px] min-w-[280px] max-w-[280px] border-b border-r border-blue-900 shadow-[2px_0_4px_rgba(0,0,0,0.15)]">
                      NOME DO PRODUTO
                    </th>

                    {/* 3. Estoque */}
                    <th className="px-2 py-2 font-bold text-center whitespace-nowrap sticky top-0 z-20 bg-[#002B49] text-white border-b border-blue-900">
                      ESTOQUE
                    </th>

                    {/* 4. Qtd Mínima */}
                    <th className="px-2 py-2 font-bold text-center whitespace-nowrap sticky top-0 z-20 bg-blue-950 text-white border-b border-blue-900">
                      QTD MÍNIMA
                    </th>

                    {/* 5. Qtd Máxima */}
                    <th className="px-2 py-2 font-bold text-center whitespace-nowrap sticky top-0 z-20 bg-blue-950 text-white border-b border-blue-900">
                      QTD MÁXIMA
                    </th>

                    {/* 6. Salvar Limites (Foto 2 e 3: Apenas o ícone compacto logo após Qtd Máxima) */}
                    <th className="px-1.5 py-2 font-bold text-center whitespace-nowrap sticky top-0 z-20 bg-blue-950 text-emerald-300 border-b border-blue-900" title="Salvar limites de estoque mínimo e máximo">
                      <Save className="w-3.5 h-3.5 mx-auto" />
                    </th>

                    {/* 7. Qtd a Pedir (Foto 2 e 3: Logo depois do botão salvar!) */}
                    <th className="px-2.5 py-2 font-bold text-center whitespace-nowrap sticky top-0 z-20 bg-amber-500 text-slate-950 font-black border-b border-blue-900">
                      QTD A PEDIR
                    </th>
                    
                    {/* 8. Vendas Mês Anterior */}
                    <th className="px-2 py-2 font-bold text-center whitespace-nowrap sticky top-0 z-20 bg-[#0F2D4A] text-indigo-200 border-b border-blue-900" title="Quantidade vendida no mês anterior">
                      VENDAS {mesesLabels.mesAnterior} (MÊS ANTERIOR)
                    </th>

                    {/* 9. Vendas Mês Atual */}
                    <th className="px-2 py-2 font-bold text-center whitespace-nowrap sticky top-0 z-20 bg-[#163D63] text-cyan-200 font-black border-b border-blue-900" title="Quantidade vendida no mês atual">
                      VENDAS {mesesLabels.mesAtual} (MÊS ATUAL)
                    </th>

                    {/* 10. Data da Última Compra */}
                    <th className="px-2 py-2 font-bold whitespace-nowrap sticky top-0 z-20 bg-[#002B49] text-white border-b border-blue-900">
                      ÚLTIMA COMPRA
                    </th>

                    {/* 11. Qtd Última Compra */}
                    <th className="px-2 py-2 font-bold text-center whitespace-nowrap sticky top-0 z-20 bg-[#002B49] text-white border-b border-blue-900">
                      QTD ÚLT. COMPRA
                    </th>

                    {/* 12. Valor Última Compra */}
                    <th className="px-2 py-2 font-bold text-right whitespace-nowrap sticky top-0 z-20 bg-slate-900 text-white border-b border-blue-900">
                      VALOR ÚLT. COMPRA
                    </th>

                    {/* 13. Valor Cotação */}
                    <th className="px-2.5 py-2 font-bold text-right whitespace-nowrap sticky top-0 z-20 bg-amber-950 text-amber-300 border-b border-blue-900">
                      VALOR COTAÇÃO (R$)
                    </th>

                    {/* 14. Subtotal */}
                    <th className="px-2.5 py-2 font-bold text-right whitespace-nowrap sticky top-0 z-20 bg-[#001D33] text-white border-b border-blue-900">
                      SUBTOTAL (R$)
                    </th>

                    {/* 15. Reservas (OS / Venda) */}
                    <th className="px-2.5 py-2 font-bold text-center whitespace-nowrap sticky top-0 z-20 bg-[#153e5e] text-amber-200 border-b border-blue-900" title="Nomes e quantidades reservadas para ordem de serviço ou venda">
                      RESERVAS (OS / VENDA)
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loadingCotacao ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                          <span className="font-semibold text-xs">Pesquisando produtos com códigos internos e fornecedores...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !hasSearchedCotacao ? (
                    <tr>
                      <td colSpan={15} className="py-16 text-center text-slate-500 bg-slate-50/50">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                          <Search className="w-8 h-8 text-amber-500/80 mb-1" />
                          <span className="font-bold text-sm text-slate-800">
                            Nenhuma pesquisa realizada ainda
                          </span>
                          <span className="text-xs text-slate-500 text-center leading-relaxed">
                            Preencha os campos da guia de pesquisa acima ou clique em <strong className="text-emerald-700 font-bold">"Inserir Novo Produto"</strong> para montar sua cotação diretamente.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : produtosFiltradosResultado.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-slate-400">
                        {buscaFiltroResultado.trim()
                          ? `Nenhum produto encontrado para a busca "${buscaFiltroResultado}".`
                          : 'Nenhum produto encontrado para os filtros selecionados.'}
                      </td>
                    </tr>
                  ) : (
                    produtosFiltradosResultado.map((item, idx) => {
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
                              ? 'bg-amber-50 font-medium'
                              : isEven
                              ? 'bg-slate-100/70'
                              : 'bg-white'
                          } hover:bg-amber-100/40`}
                        >
                          {/* 1. Código interno do produto (Sticky) */}
                          <td className={`px-2.5 py-1.5 font-mono font-bold text-[#002B49] whitespace-nowrap sticky left-0 z-10 w-[110px] min-w-[110px] max-w-[110px] border-b border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.06)] ${
                            qPedida > 0 ? 'bg-amber-100' : isEven ? 'bg-slate-100' : 'bg-white'
                          }`}>
                            {item.codigo}
                          </td>

                          {/* 2. Nome do Produto (Sticky) */}
                          <td className={`px-3 py-1.5 sticky left-[110px] z-10 w-[280px] min-w-[280px] max-w-[280px] border-b border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.06)] ${
                            qPedida > 0 ? 'bg-amber-100' : isEven ? 'bg-slate-100' : 'bg-white'
                          }`}>
                            <span className="font-semibold text-slate-900 block truncate" title={item.nome}>{item.nome}</span>
                            <span className="text-[10px] text-slate-400 block font-medium truncate">{item.nomeGrupo}</span>
                          </td>

                          {/* 3. Estoque Atual */}
                          <td className="px-2 py-1.5 text-center font-bold font-mono border-b border-slate-200">
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
                          <td className="px-1.5 py-1 text-center whitespace-nowrap bg-blue-50/40 border-b border-slate-200">
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
                          <td className="px-1.5 py-1 text-center whitespace-nowrap bg-blue-50/40 border-b border-slate-200">
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

                          {/* 6. Botão Salvar Limites (Foto 2 e 3: Apenas o ícone compacto, logo após Quantidade Máxima) */}
                          <td className="px-1.5 py-1 text-center whitespace-nowrap bg-blue-50/50 border-b border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleSaveLimits(item)}
                              disabled={isSaving}
                              className={`p-1.5 rounded-md transition mx-auto cursor-pointer flex items-center justify-center ${
                                isSaved
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-200 hover:bg-[#002B49] text-slate-700 hover:text-white'
                              }`}
                              title={`Salvar limites de estoque para "${item.nome}"`}
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isSaved ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>

                          {/* 7. Quantidade a Ser Pedida (Foto 2 e 3: Logo depois do botão salvar!) */}
                          <td className="px-1.5 py-1 text-center whitespace-nowrap bg-amber-100/60 border-b border-slate-200">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={item.quantidadePedida}
                              onChange={(e) =>
                                handleUpdateProductRow(item.produtoId, 'quantidadePedida', e.target.value)
                              }
                              className={`w-16 px-1.5 py-1 text-xs text-center font-black font-mono rounded border transition focus:outline-none ${
                                qPedida > 0
                                  ? 'border-amber-600 bg-amber-200 text-amber-950 ring-2 ring-amber-500'
                                  : 'border-slate-300 bg-white text-slate-900 focus:border-amber-500'
                              }`}
                              title="Digite a quantidade a ser pedida nesta cotação"
                            />
                          </td>

                          {/* 6. Vendas Mês Anterior (Gestão Click) */}
                          <td className="px-2 py-1.5 text-center font-mono font-bold text-slate-700 bg-indigo-50/30 whitespace-nowrap border-b border-slate-200">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs">
                              {item.vendasMesAnterior ?? 0}
                            </span>
                          </td>

                          {/* 7. Vendas Mês Atual (Gestão Click) */}
                          <td className="px-2 py-1.5 text-center font-mono font-bold text-indigo-900 bg-indigo-50/60 whitespace-nowrap border-b border-slate-200">
                            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-950 text-xs font-black">
                              {item.vendasMesAtual ?? 0}
                            </span>
                          </td>

                          {/* 8. Data da Última Compra */}
                          <td className="px-2 py-1.5 font-mono text-[11px] text-slate-600 whitespace-nowrap border-b border-slate-200">
                            {item.dataUltimaCompra || '-'}
                          </td>

                          {/* 9. Quantidade Comprada na Última Compra */}
                          <td className="px-2 py-1.5 text-center font-mono font-medium text-slate-700 whitespace-nowrap border-b border-slate-200">
                            {item.quantidadeUltimaCompra ?? '-'}
                          </td>

                          {/* 10. Valor da Última Compra */}
                          <td className="px-2 py-1.5 text-right font-mono font-semibold text-slate-700 whitespace-nowrap bg-slate-50 border-b border-slate-200">
                            {item.valorUltimaCompra
                              ? `R$ ${item.valorUltimaCompra.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '-'}
                          </td>

                          {/* 11. Valor na Cotação (Editável pelo usuário) */}
                          <td className="px-1.5 py-1 text-right whitespace-nowrap bg-amber-50/70 border-b border-slate-200">
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

                          {/* 14. Subtotal Calculado */}
                          <td className="px-2.5 py-1.5 text-right font-mono font-bold whitespace-nowrap border-b border-slate-200">
                            <span className={subtotal > 0 ? 'text-emerald-800' : 'text-slate-400'}>
                              R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* 15. Reservas (OS / Venda) */}
                          <td className="px-2 py-1 text-center whitespace-nowrap border-b border-slate-200 bg-amber-50/20">
                            <input
                              type="text"
                              placeholder="Ex: 2 un OS 4501, 1 un Venda"
                              value={item.reservas || ''}
                              onChange={(e) =>
                                handleUpdateProductRow(item.produtoId, 'reservas', e.target.value)
                              }
                              className="w-44 px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-amber-600 bg-white text-slate-800 font-medium"
                              title="Nomes e quantidades reservadas para ordem de serviço ou venda"
                            />
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
      {/* MENU 3: COTAÇÕES EM ANDAMENTO                                 */}
      {/* ============================================================== */}
      {activeTab === 'cotacoes_andamento' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <h2 className="text-sm font-bold text-[#002B49]">Cotações em Andamento</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cotações geradas agrupadas individualmente por fornecedor. Clique em <strong>"Gerar Pedido"</strong> para revisar valores e quantidades antes de efetivar o pedido.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchCotacoesAndamento}
                disabled={loadingCotacoesAndamento}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {loadingCotacoesAndamento ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>Atualizar Cotações</span>
              </button>
            </div>
          </div>

          {loadingCotacoesAndamento ? (
            <div className="bg-white rounded-xl p-12 text-center text-slate-500 border border-slate-200">
              <Loader2 className="w-7 h-7 animate-spin text-amber-600 mx-auto mb-2" />
              <span className="text-xs font-semibold">Carregando cotações em andamento...</span>
            </div>
          ) : cotacoesAndamentoList.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center text-slate-500 border border-slate-200 space-y-2">
              <Clock className="w-10 h-10 text-amber-300 mx-auto mb-1" />
              <h3 className="text-sm font-bold text-slate-700">Nenhuma cotação em andamento no momento</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Para iniciar, vá até o menu <strong>"2. Montar Cotação"</strong>, preencha as quantidades desejadas nos produtos e clique no botão <strong>"Gerar Cotação"</strong>.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('montar_cotacao')}
                className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Ir para Montar Cotação</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {cotacoesAndamentoList.map((cotacao) => {
                const itensList = Array.isArray(cotacao.itens) ? cotacao.itens : [];
                const dataFormatada = new Date(cotacao.createdAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={cotacao.id}
                    className="bg-white rounded-xl shadow-xs border border-slate-200 hover:border-amber-300 transition overflow-hidden"
                  >
                    {/* Topo do Card da Cotação */}
                    <div className="p-4 bg-gradient-to-r from-slate-50 via-amber-50/30 to-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#002B49] text-white font-mono font-black text-xs shadow-xs">
                          Cotação #{cotacao.numero}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-blue-700" />
                              <span>{cotacao.nomeFornecedor || 'Fornecedor Diversos'}</span>
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Em Andamento
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>📅 Data: <strong>{dataFormatada}</strong></span>
                            <span>&bull;</span>
                            <span>🏷️ Grupos: <strong className="text-slate-700">{cotacao.grupos || 'Geral'}</strong></span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 block">Total Estimado</span>
                          <span className="text-sm font-black font-mono text-emerald-700">
                            R$ {(cotacao.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Botão GERAR PEDIDO no final de cada cotação */}
                        <button
                          type="button"
                          onClick={() => handleOpenGerarPedidoModal(cotacao)}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                          title="Abre a cotação com dados dos produtos para editar valores e quantidades e gerar o pedido"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Gerar Pedido</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintCotacao(cotacao)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Visualizar / Imprimir Cotação"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExcluirCotacaoAndamento(cotacao.id, cotacao.numero)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Excluir Cotação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Prévia dos Produtos da Cotação */}
                    <div className="p-3 bg-slate-50/50">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="text-[10px] text-slate-500 border-b border-slate-200">
                              <th className="py-1 px-2 font-bold w-24">CÓDIGO</th>
                              <th className="py-1 px-2 font-bold">PRODUTO</th>
                              <th className="py-1 px-2 font-bold whitespace-nowrap">GRUPO</th>
                              <th className="py-1 px-2 font-bold text-center whitespace-nowrap">QTD A PEDIR</th>
                              <th className="py-1 px-2 font-bold text-right whitespace-nowrap">VALOR COTAÇÃO</th>
                              <th className="py-1 px-2 font-bold text-right whitespace-nowrap">SUBTOTAL</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px]">
                            {itensList.slice(0, 10).map((it: any, i: number) => {
                              const q = parseFloat(it.quantidadePedida) || 0;
                              const v = parseFloat(it.valorCotacao) || 0;
                              return (
                                <tr key={it.produtoId || i} className="hover:bg-slate-100/50">
                                  <td className="py-1.5 px-2 font-mono font-bold text-[#002B49]">{it.codigo}</td>
                                  <td className="py-1.5 px-2 font-semibold text-slate-800">{it.nome}</td>
                                  <td className="py-1.5 px-2 text-slate-500 text-[10px]">{it.nomeGrupo || '-'}</td>
                                  <td className="py-1.5 px-2 text-center font-bold font-mono text-amber-900 bg-amber-50/60 rounded">{q}</td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-600">R$ {v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-800">R$ {(q * v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {itensList.length > 10 && (
                        <p className="text-[10px] text-slate-400 mt-2 text-center">
                          + {itensList.length - 10} outros produtos nesta cotação... (Clique em "Gerar Pedido" para ver e editar todos)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MENU 4: PEDIDOS FEITOS (SEQUENCIAL 0001, 0002...)              */}
      {/* ============================================================== */}
      {(activeTab === 'pedidos_feitos' || (activeTab as any) === 'cotacoes_feitas') && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#002B49]">Histórico de Pedidos Feitos</h2>
              <p className="text-xs text-slate-500">
                Numeração crescente automática iniciada em 0001. Visualize, confira os produtos recebidos ou imprima cada pedido.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchCotacoesFeitas}
              disabled={loadingFeitas}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              {loadingFeitas ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>Atualizar Histórico</span>
            </button>
          </div>

          {/* PAINEL DE PESQUISA & FILTROS PARA PEDIDOS FEITOS (Foto 2) */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-[#002B49] uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-cyan-600" />
                <span>Filtros de Pesquisa de Pedidos</span>
              </span>
              {(selectedFornecedoresFeitas.length > 0 ||
                filtroSituacaoFeitas !== 'TODAS' ||
                filtroDataInicioFeitas ||
                filtroDataFimFeitas) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFornecedoresFeitas([]);
                    setBuscaFornecedorFeitas('');
                    setFiltroSituacaoFeitas('TODAS');
                    setFiltroDataInicioFeitas('');
                    setFiltroDataFimFeitas('');
                  }}
                  className="text-[11px] text-rose-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpar Todos os Filtros</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Campo 1: Fornecedor (seguindo os parâmetros anteriores: combobox pesquisável com todos os fornecedores) */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Fornecedor ({selectedFornecedoresFeitas.length} selecionado{selectedFornecedoresFeitas.length !== 1 ? 's' : ''})</span>
                  {selectedFornecedoresFeitas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedFornecedoresFeitas([])}
                      className="text-[10px] text-cyan-700 hover:underline font-normal cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={
                      selectedFornecedoresFeitas.length === 0
                        ? 'Buscar fornecedor...'
                        : `${selectedFornecedoresFeitas.length} selecionado(s)...`
                    }
                    value={buscaFornecedorFeitas}
                    onChange={(e) => {
                      setBuscaFornecedorFeitas(e.target.value);
                      setIsFornecedoresFeitasOpen(true);
                    }}
                    onFocus={() => setIsFornecedoresFeitasOpen(true)}
                    className="w-full px-3 py-1.5 pr-8 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-cyan-600 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setIsFornecedoresFeitasOpen(!isFornecedoresFeitasOpen)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isFornecedoresFeitasOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-2 space-y-2 min-w-[300px] md:min-w-[350px]">
                    {(() => {
                      const termo = buscaFornecedorFeitas.trim().toLowerCase();
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
                                ? `${filtrados.length} fornecedores encontrados`
                                : `${fornecedores.length} fornecedores no Gestão`}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsFornecedoresFeitasOpen(false)}
                              className="hover:underline text-slate-500 font-bold cursor-pointer"
                            >
                              ✕ Fechar
                            </button>
                          </div>

                          <div className="max-h-56 overflow-y-auto space-y-1">
                            {filtrados.length === 0 ? (
                              <div className="py-4 text-center text-slate-400 text-xs">
                                Nenhum fornecedor encontrado para "{buscaFornecedorFeitas}".
                              </div>
                            ) : (
                              filtrados.map((f) => {
                                const isChecked = selectedFornecedoresFeitas.includes(f.nome);
                                return (
                                  <label
                                    key={f.id}
                                    className={`flex items-start gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition ${
                                      isChecked ? 'bg-cyan-50 font-bold text-cyan-950' : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        setSelectedFornecedoresFeitas((prev) =>
                                          prev.includes(f.nome)
                                            ? prev.filter((item) => item !== f.nome)
                                            : [...prev, f.nome]
                                        );
                                      }}
                                      className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500"
                                    />
                                    <div className="leading-tight">
                                      <div className="line-clamp-1">{f.nome}</div>
                                      {f.razaoSocial && f.razaoSocial !== f.nome && (
                                        <div className="text-[10px] text-slate-400 font-normal line-clamp-1">
                                          {f.razaoSocial}
                                        </div>
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

              {/* Campo 2: Situação */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Situação da Cotação
                </label>
                <select
                  value={filtroSituacaoFeitas}
                  onChange={(e) => setFiltroSituacaoFeitas(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-cyan-600 font-medium"
                >
                  <option value="TODAS">Todas as Situações</option>
                  <option value="AGUARDANDO_CHEGAR">🕒 Aguardando chegar</option>
                  <option value="FINALIZADA">✓ Finalizada</option>
                  <option value="ENTREGA_PARCIAL">⚠️ Entrega parcial</option>
                </select>
              </div>

              {/* Campo 3: Data Inicial */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-cyan-600" />
                  <span>Data do Pedido (Inicial)</span>
                </label>
                <input
                  type="date"
                  value={filtroDataInicioFeitas}
                  onChange={(e) => setFiltroDataInicioFeitas(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-cyan-600 font-medium"
                />
              </div>

              {/* Campo 4: Data Final */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-cyan-600" />
                  <span>Data do Pedido (Final)</span>
                </label>
                <input
                  type="date"
                  value={filtroDataFimFeitas}
                  onChange={(e) => setFiltroDataFimFeitas(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-cyan-600 font-medium"
                />
              </div>
            </div>

            {/* Tags e Contador dos Filtros Ativos */}
            {(selectedFornecedoresFeitas.length > 0 ||
              filtroSituacaoFeitas !== 'TODAS' ||
              filtroDataInicioFeitas ||
              filtroDataFimFeitas) && (
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 text-xs">
                <span className="text-[11px] font-bold text-slate-500">Filtros aplicados:</span>

                {selectedFornecedoresFeitas.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300"
                  >
                    <span>{f}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFornecedoresFeitas(selectedFornecedoresFeitas.filter((item) => item !== f))}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {filtroSituacaoFeitas !== 'TODAS' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                    <span>
                      Situação: {filtroSituacaoFeitas === 'AGUARDANDO_CHEGAR' ? 'Aguardando chegar' : filtroSituacaoFeitas === 'FINALIZADA' ? 'Finalizada' : 'Entrega parcial'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiltroSituacaoFeitas('TODAS')}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                )}

                {filtroDataInicioFeitas && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                    <span>De: {new Date(filtroDataInicioFeitas + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    <button
                      type="button"
                      onClick={() => setFiltroDataInicioFeitas('')}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                )}

                {filtroDataFimFeitas && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                    <span>Até: {new Date(filtroDataFimFeitas + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    <button
                      type="button"
                      onClick={() => setFiltroDataFimFeitas('')}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                )}

                <span className="text-[11px] font-bold text-cyan-800 ml-auto">
                  Encontradas: {cotacoesFeitasFiltradas.length} de {cotacoesFeitasList.length} cotações
                </span>
              </div>
            )}
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
                    <th className="px-4 py-2.5 font-bold text-center whitespace-nowrap">SITUAÇÃO</th>
                    <th className="px-4 py-2.5 font-bold whitespace-nowrap">CRIADO POR</th>
                    <th className="px-4 py-2.5 font-bold text-center whitespace-nowrap bg-[#001D33]">AÇÕES</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingFeitas ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-cyan-700" />
                          <span className="font-semibold text-xs">Carregando cotações feitas...</span>
                        </div>
                      </td>
                    </tr>
                  ) : cotacoesFeitasList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Nenhuma cotação finalizada ainda. Acesse a aba "Montar Cotação" para criar a primeira!
                      </td>
                    </tr>
                  ) : cotacoesFeitasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Search className="w-6 h-6 text-slate-300" />
                          <span className="font-semibold text-xs">Nenhuma cotação encontrada com os filtros selecionados.</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFornecedoresFeitas([]);
                              setBuscaFornecedorFeitas('');
                              setFiltroSituacaoFeitas('TODAS');
                              setFiltroDataInicioFeitas('');
                              setFiltroDataFimFeitas('');
                            }}
                            className="text-[11px] text-cyan-700 hover:underline font-bold mt-1"
                          >
                            Limpar filtros de pesquisa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cotacoesFeitasFiltradas.map((c, idx) => {
                      const isEven = idx % 2 === 0;
                      const status = c.status || 'AGUARDANDO_CHEGAR';
                      const isFinalizada = status === 'FINALIZADA';
                      const isParcial = status === 'ENTREGA_PARCIAL';
                      const isAguardando = status === 'AGUARDANDO_CHEGAR';

                      return (
                        <tr
                          key={c.id}
                          className={`transition ${
                            isFinalizada
                              ? 'bg-emerald-50/30 border-l-4 border-l-emerald-500 hover:bg-emerald-50/60 border-b border-emerald-100'
                              : isParcial
                              ? 'bg-rose-50/30 border-l-4 border-l-rose-500 hover:bg-rose-50/60 border-b border-rose-100'
                              : 'bg-amber-50/20 border-l-4 border-l-amber-400 hover:bg-amber-50/50 border-b border-slate-200'
                          }`}
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

                          {/* Fornecedor Destinatário */}
                          <td className="px-4 py-2.5 font-semibold text-slate-800">
                            {getNomeFornecedorCotacao(c)}
                          </td>

                          {/* Quantidade de Itens */}
                          <td className="px-3 py-2.5 text-center font-bold font-mono text-slate-700 whitespace-nowrap">
                            {c.quantidadeItens} {c.quantidadeItens === 1 ? 'item' : 'itens'}
                          </td>

                          {/* Valor Total */}
                          <td className="px-4 py-2.5 text-right font-bold font-mono text-emerald-800 text-sm whitespace-nowrap">
                            R$ {c.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Situação / Status da Cotação & Conferência */}
                          <td className="px-4 py-2.5 text-center whitespace-nowrap">
                            {isFinalizada ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Finalizada
                              </span>
                            ) : isParcial ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                Entrega parcial
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Aguardando chegar
                              </span>
                            )}
                          </td>

                          {/* Criado Por */}
                          <td className="px-4 py-2.5 text-slate-600 text-[11px] whitespace-nowrap">
                            {c.criadoPor || 'Administrador'}
                          </td>

                          {/* Ações: Conferir, Visualizar e Imprimir */}
                          <td className="px-4 py-2 text-center whitespace-nowrap border-l border-slate-200">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Botão 1: Conferir Produtos */}
                              <button
                                type="button"
                                onClick={() => handleOpenConferenciaModal(c)}
                                className="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title="Conferir entrega dos produtos desta cotação"
                              >
                                <CheckSquare className="w-3.5 h-3.5 text-blue-200" />
                                <span>Conferir Produtos</span>
                              </button>

                              {/* Botão 2: Visualizar Cotação */}
                              <button
                                type="button"
                                onClick={() => handleOpenViewModal(c)}
                                className="px-2.5 py-1.5 bg-[#002B49] hover:bg-[#001D33] text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title="Visualizar detalhes da cotação"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Visualizar</span>
                              </button>

                              {/* Botão 3: Imprimir Cotação */}
                              <button
                                type="button"
                                onClick={() => handlePrintCotacao(c)}
                                className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title="Imprimir ou gerar PDF desta cotação"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Imprimir</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150 print:p-0 print:bg-white print:fixed print:inset-0">
          <div
            id="printable-quotation-modal"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 print:max-h-none print:border-none print:shadow-none print:rounded-none"
          >
            {/* Topo do Modal (Não impresso no papel) */}
            <div className="bg-[#002B49] text-white px-6 py-3.5 flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center font-bold">
                  <FileCheck2 className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Cotação de Preços #{selectedCotacao.numero}</h3>
                  <p className="text-xs text-cyan-200">
                    {selectedCotacao.numero === 'EM MONTAGEM'
                      ? 'Prévia dos itens selecionados com quantidade a pedir'
                      : `Finalizada em ${new Date(selectedCotacao.createdAt).toLocaleDateString('pt-BR')} às ${new Date(selectedCotacao.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
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
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
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

              {/* Tabela dos Itens Cotados (Apenas itens com Qtd a Pedir > 0) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Itens Requisitados para Cotação (Qtd Pedida &gt; 0)
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                      <tr>
                        <th className="p-2 w-10 text-center">Item</th>
                        <th className="p-2 w-28">Código Interno</th>
                        <th className="p-2">Descrição do Produto</th>
                        <th className="p-2">Reservas (OS / Venda)</th>
                        <th className="p-2 text-center w-20">Qtd Pedida</th>
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
                              <td className="p-2 text-xs font-semibold text-amber-900">
                                {item.reservas ? (
                                  <span>{item.reservas}</span>
                                ) : (
                                  <span className="text-slate-400 font-normal italic">-</span>
                                )}
                              </td>
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
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold text-white bg-[#002B49] hover:bg-[#001D33] rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / Gerar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: INSERIR NOVO PRODUTO NA COTAÇÃO (6 DÍGITOS AUTOMÁTICO)  */}
      {/* ============================================================== */}
      {isNovoProdutoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200">
            {/* Cabeçalho do Modal */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">
                    Inserir Novo Produto na Cotação
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Gera código exclusivo e insere na listagem em aberto
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNovoProdutoModalOpen(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSalvarNovoProduto} className="p-5 space-y-4 text-xs">
              {/* Código Interno Automático ou Personalizado (Sem limite de dígitos) */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                    Código Interno (Sugestão de 6 dígitos ou digite sem limite)
                  </label>
                  <button
                    type="button"
                    onClick={handleRegerarCodigo}
                    disabled={loadingGerarCodigo}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingGerarCodigo ? 'animate-spin' : ''}`} />
                    <span>Gerar Outro</span>
                  </button>
                </div>
                <div>
                  <input
                    type="text"
                    required
                    value={novoProdutoCodigo}
                    onChange={(e) => setNovoProdutoCodigo(e.target.value)}
                    className={`w-full px-3 py-1.5 text-center font-mono font-black text-base tracking-widest bg-white border rounded-lg focus:outline-none shadow-inner transition ${
                      codigoDuplicadoInfo?.exists
                        ? 'border-rose-500 text-rose-950 bg-rose-50/50 focus:border-rose-600'
                        : codigoDuplicadoInfo?.exists === false
                        ? 'border-emerald-500 text-emerald-950 focus:border-emerald-600'
                        : 'border-emerald-300 text-[#002B49] focus:border-emerald-600'
                    }`}
                    placeholder="Digite qualquer código interno..."
                  />
                </div>

                {/* Feedback em tempo real de duplicidade */}
                {checkingCodigo ? (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                    <span>Verificando duplicidade no ERP...</span>
                  </p>
                ) : codigoDuplicadoInfo?.exists ? (
                  <div className="text-[11px] text-rose-700 font-bold flex items-start gap-1.5 bg-rose-50 p-2 rounded-lg border border-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>
                      Código já cadastrado para o produto <strong>"{codigoDuplicadoInfo.produtoNome}"</strong>. Por favor, escolha outro número.
                    </span>
                  </div>
                ) : codigoDuplicadoInfo?.exists === false ? (
                  <div className="text-[11px] text-emerald-800 font-bold flex items-center gap-1 bg-emerald-100/70 p-1.5 rounded border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Código exclusivo verificado e disponível no Gestão Click!</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-emerald-800 leading-tight">
                    Você pode manter a sugestão de 6 dígitos ou digitar qualquer código sem limite de tamanho.
                  </p>
                )}
              </div>

              {/* Nome do Produto */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                  Nome do Produto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CABO FLAT DO SCANNER EPSON L3150..."
                  value={novoProdutoNome}
                  onChange={(e) => setNovoProdutoNome(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Fornecedor com seleção de todos os 679 fornecedores do ERP */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">
                      Fornecedor ({fornecedores.length})
                    </label>
                    <span className="text-[10px] text-cyan-800 font-semibold">
                      Gestão Click
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Pesquise ou selecione um fornecedor..."
                      value={novoProdutoFornecedor}
                      onFocus={() => setIsFornecedorModalDropdownOpen(true)}
                      onChange={(e) => {
                        setNovoProdutoFornecedor(e.target.value);
                        setBuscaFornecedorModal(e.target.value);
                        setIsFornecedorModalDropdownOpen(true);
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setIsFornecedorModalDropdownOpen(!isFornecedorModalDropdownOpen)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isFornecedorModalDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-2 space-y-1.5 max-h-60 overflow-y-auto">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-[10px] font-bold text-slate-500">
                        <span>Escolha um dos {fornecedores.length} fornecedores:</span>
                        <button
                          type="button"
                          onClick={() => setIsFornecedorModalDropdownOpen(false)}
                          className="hover:underline text-slate-400 font-bold"
                        >
                          ✕ Fechar
                        </button>
                      </div>

                      <div className="space-y-0.5 max-h-48 overflow-y-auto">
                        {fornecedores
                          .filter((f) => {
                            if (!buscaFornecedorModal.trim()) return true;
                            const t = buscaFornecedorModal.toLowerCase();
                            return (
                              f.nome.toLowerCase().includes(t) ||
                              (f.razaoSocial && f.razaoSocial.toLowerCase().includes(t)) ||
                              (f.documento && f.documento.includes(t))
                            );
                          })
                          .slice(0, 100)
                          .map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                setNovoProdutoFornecedor(f.nome);
                                setBuscaFornecedorModal('');
                                setIsFornecedorModalDropdownOpen(false);
                              }}
                              className={`w-full text-left p-1.5 rounded text-xs transition flex flex-col cursor-pointer ${
                                novoProdutoFornecedor === f.nome
                                  ? 'bg-emerald-50 text-emerald-950 font-bold'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="leading-tight">{f.nome}</span>
                              {f.razaoSocial && f.razaoSocial !== f.nome && (
                                <span className="text-[10px] text-slate-400 font-normal truncate">
                                  {f.razaoSocial}
                                </span>
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Grupo do Produto */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                    Grupo do Produto
                  </label>
                  <select
                    value={novoProdutoNomeGrupo}
                    onChange={(e) => {
                      const selNome = e.target.value;
                      setNovoProdutoNomeGrupo(selNome);
                      const gObj = grupos.find((g) => g.nome === selNome);
                      setNovoProdutoGrupoId(gObj ? gObj.id : '');
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-emerald-600 font-medium text-slate-800"
                  >
                    {grupos.map((g) => (
                      <option key={g.id} value={g.nome}>
                        {g.nome}
                      </option>
                    ))}
                    {!grupos.some((g) => g.nome === 'Diversos') && (
                      <option value="Diversos">Diversos</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Valor Estimado / Cotação */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                    Valor Cotação (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={novoProdutoValorCusto}
                    onChange={(e) => setNovoProdutoValorCusto(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>

                {/* Quantidade a Pedir */}
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1 uppercase">
                    Qtd a Pedir Inicial
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Ex: 5"
                    value={novoProdutoQtdPedida}
                    onChange={(e) => setNovoProdutoQtdPedida(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-amber-50/50 focus:outline-none focus:border-amber-600 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Reservas (OS / Venda) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                  Reservas (OS / Venda) (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 2 un OS 4501, 1 un Venda Balcão"
                  value={novoProdutoReservas}
                  onChange={(e) => setNovoProdutoReservas(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNovoProdutoModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNovoProduto || Boolean(codigoDuplicadoInfo?.exists) || checkingCodigo}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingNovoProduto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Inserir na Cotação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFERÊNCIA DE PRODUTOS DA COTAÇÃO                      */}
      {/* ============================================================== */}
      {isConferenciaModalOpen && cotacaoEmConferencia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Topo do Modal */}
            <div className="bg-[#002B49] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center font-bold">
                  <CheckSquare className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Conferência de Entrega &bull; Cotação #{cotacaoEmConferencia.numero}
                  </h3>
                  <p className="text-xs text-cyan-200">
                    Confira as quantidades recebidas e marque os itens para finalizar ou sinalizar entrega parcial
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConferenciaModalOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações da Cotação & Banner de Status em Tempo Real */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Fornecedor</span>
                  <span className="font-bold text-slate-800 truncate block mt-0.5" title={cotacaoEmConferencia.nomeFornecedor}>
                    {cotacaoEmConferencia.nomeFornecedor || 'Múltiplos Fornecedores'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Data do Pedido</span>
                  <span className="font-bold text-slate-800 block mt-0.5">
                    {new Date(cotacaoEmConferencia.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Total de Itens</span>
                  <span className="font-bold text-slate-800 block mt-0.5">
                    {cotacaoEmConferencia.quantidadeItens} {cotacaoEmConferencia.quantidadeItens === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Valor Total</span>
                  <span className="font-mono font-bold text-emerald-700 block mt-0.5">
                    R$ {cotacaoEmConferencia.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Status em Tempo Real */}
              {(() => {
                const isTudoOk =
                  itensConferencia.length > 0 &&
                  itensConferencia.every((item) => {
                    const qPed = parseFloat(item.quantidadePedida) || 0;
                    const qConf = parseFloat(item.quantidadeConferida) || 0;
                    return Boolean(item.conferido && qConf === qPed);
                  });

                return isTudoOk ? (
                  <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-950 text-xs font-bold shadow-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                      <span>
                        Tudo OK! Todos os {itensConferencia.length} itens conferidos com quantidade 100% igual à do pedido. Ao salvar, a cotação ficará em VERDE com a situação: <strong>FINALIZADA</strong>.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl flex items-center justify-between text-rose-950 text-xs font-bold shadow-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
                      <span>
                        Atenção: Existem itens não conferidos, caixinha desmarcada ou com quantidade diferente da pedida. Ao salvar, a cotação ficará em VERMELHO com a situação: <strong>ENTREGA PARCIAL</strong>.
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Barra de Ações Rápidas */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500 text-[11px]">
                  Preencha a quantidade recebida e marque o check de cada produto recebido.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarcarTodosConferidos}
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Marcar Tudo 100% OK</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLimparConferencia}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </div>

            {/* Tabela dos Produtos na Conferência */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#002B49] text-white">
                    <tr className="text-[11px]">
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5 w-24">CÓDIGO</th>
                      <th className="p-2.5 min-w-[200px]">NOME DO PRODUTO</th>
                      <th className="p-2.5 min-w-[140px]">RESERVAS (OS / VENDA)</th>
                      <th className="p-2.5 text-center w-28 bg-[#0F2D4A]">QTD PEDIDO</th>
                      <th className="p-2.5 text-center w-36 bg-amber-950 text-amber-200">QTD CONFERIDA</th>
                      <th className="p-2.5 text-center w-24 bg-cyan-950 text-cyan-200">CHECK</th>
                      <th className="p-2.5 text-center w-28 bg-[#001D33]">SITUAÇÃO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {itensConferencia.map((item, idx) => {
                      const qPed = parseFloat(item.quantidadePedida) || 0;
                      const qConf = parseFloat(item.quantidadeConferida) || 0;
                      const isItemOk = Boolean(item.conferido && qConf === qPed);
                      const isPartial = Boolean(item.conferido && qConf > 0 && qConf !== qPed);

                      return (
                        <tr
                          key={idx}
                          className={`transition ${
                            isItemOk
                              ? 'bg-emerald-50/50 hover:bg-emerald-100/40'
                              : isPartial
                              ? 'bg-amber-50/50 hover:bg-amber-100/40'
                              : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-[#002B49] whitespace-nowrap">
                            {item.codigo}
                          </td>
                          <td className="p-2.5">
                            <span className="font-semibold text-slate-900 block">{item.nome}</span>
                            <span className="text-[10px] text-slate-400 block">{item.grupo || item.nomeGrupo}</span>
                          </td>
                          <td className="p-2.5 text-xs">
                            {item.reservas ? (
                              <span className="font-semibold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200 block">
                                {item.reservas}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono font-black text-sm text-[#002B49] bg-slate-50">
                            {qPed}
                          </td>
                          <td className="p-2.5 text-center bg-amber-50/30">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={item.quantidadeConferida}
                              onChange={(e) =>
                                handleUpdateItemConferencia(idx, 'quantidadeConferida', e.target.value)
                              }
                              className={`w-20 px-2 py-1 text-center font-black font-mono text-sm rounded border transition focus:outline-none ${
                                isItemOk
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                                  : qConf > 0
                                  ? 'border-rose-500 bg-rose-50 text-rose-950'
                                  : 'border-slate-300 bg-white text-slate-900 focus:border-cyan-600'
                              }`}
                            />
                          </td>
                          <td className="p-2.5 text-center bg-cyan-50/30">
                            <input
                              type="checkbox"
                              checked={item.conferido}
                              onChange={(e) =>
                                handleUpdateItemConferencia(idx, 'conferido', e.target.checked)
                              }
                              className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            {isItemOk ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                OK (100%)
                              </span>
                            ) : isPartial ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                {qConf}/{qPed} un
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                Pendente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rodapé do Modal com Ações */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsConferenciaModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSalvarConferencia}
                disabled={savingConferencia}
                className="px-6 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {savingConferencia ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
                <span>Salvar Conferência</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: GERAR PEDIDO A PARTIR DE COTAÇÃO EM ANDAMENTO          */}
      {/* ============================================================== */}
      {isGerarPedidoModalOpen && cotacaoParaPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Topo do Modal */}
            <div className="bg-[#002B49] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600/30 flex items-center justify-center font-bold text-emerald-400">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <span>Gerar Pedido &bull; Cotação #{cotacaoParaPedido.numero}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      Em Andamento
                    </span>
                  </h3>
                  <p className="text-xs text-cyan-200">
                    Fornecedor: <strong>{cotacaoParaPedido.nomeFornecedor}</strong> &bull; Edite os valores e quantidades a pedir antes de efetivar o pedido
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGerarPedidoModalOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner de Informações & Resumo do Pedido */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
              {(() => {
                const itensValidos = itensParaPedido.filter((it) => (parseFloat(it.quantidadePedida) || 0) > 0);
                const totalPedido = itensValidos.reduce((acc, curr) => {
                  const q = parseFloat(curr.quantidadePedida) || 0;
                  const v = parseFloat(curr.valorCotacao) || 0;
                  return acc + q * v;
                }, 0);

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Fornecedor</span>
                        <span className="font-bold text-slate-800 truncate block mt-0.5" title={cotacaoParaPedido.nomeFornecedor}>
                          {cotacaoParaPedido.nomeFornecedor}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Data da Cotação</span>
                        <span className="font-bold text-slate-800 block mt-0.5">
                          {new Date(cotacaoParaPedido.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Itens com Quantidade</span>
                        <span className="font-bold text-slate-800 block mt-0.5">
                          {itensValidos.length} de {itensParaPedido.length} produtos
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Total do Pedido</span>
                        <span className="font-mono font-black text-emerald-700 block mt-0.5 text-sm">
                          R$ {totalPedido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-amber-950 text-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>Regra de Geração:</strong> Somente produtos com <strong>quantidade a pedir maior que zero</strong> entrarão no pedido final. Produtos com quantidade zerada serão ignorados.
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Tabela de Produtos Editáveis */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#002B49] text-white">
                    <tr className="text-[11px]">
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5 w-24">CÓDIGO</th>
                      <th className="p-2.5 min-w-[200px]">NOME DO PRODUTO</th>
                      <th className="p-2.5 min-w-[140px]">RESERVAS (OS / VENDA)</th>
                      <th className="p-2.5 text-center w-36 bg-[#003B66]">VALOR COTAÇÃO (R$)</th>
                      <th className="p-2.5 text-center w-32 bg-amber-950 text-amber-200">QTD A PEDIR</th>
                      <th className="p-2.5 text-right w-32 bg-[#00233D]">SUBTOTAL</th>
                      <th className="p-2.5 text-center w-16">AÇÃO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {itensParaPedido.map((item, idx) => {
                      const qPed = parseFloat(item.quantidadePedida) || 0;
                      const vCot = parseFloat(item.valorCotacao) || 0;
                      const subtotal = qPed * vCot;
                      const hasQty = qPed > 0;

                      return (
                        <tr
                          key={item.produtoId || item.codigo || idx}
                          className={`transition ${hasQty ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/70 text-slate-400 opacity-60 hover:opacity-100'}`}
                        >
                          <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-[#002B49] whitespace-nowrap">
                            {item.codigo}
                          </td>
                          <td className="p-2.5">
                            <span className="font-semibold text-slate-900 block leading-tight">{item.nome}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{item.nomeGrupo || item.grupo || '-'}</span>
                          </td>
                          <td className="p-2.5 text-xs">
                            {item.reservas ? (
                              <span className="font-semibold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200 block truncate" title={item.reservas}>
                                {item.reservas}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center bg-cyan-50/20">
                            <div className="relative inline-block w-full">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={item.valorCotacao ?? ''}
                                onChange={(e) =>
                                  handleUpdateItemParaPedido(
                                    item.produtoId || item.codigo,
                                    'valorCotacao',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-28 px-2 py-1 text-right font-mono font-bold text-xs rounded border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-500 shadow-2xs"
                              />
                            </div>
                          </td>
                          <td className="p-2.5 text-center bg-amber-50/30">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={item.quantidadePedida ?? ''}
                              onChange={(e) =>
                                handleUpdateItemParaPedido(
                                  item.produtoId || item.codigo,
                                  'quantidadePedida',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className={`w-20 px-2 py-1 text-center font-mono font-black text-xs rounded border transition focus:outline-none ${
                                hasQty
                                  ? 'border-amber-400 bg-amber-50 text-amber-950 focus:border-amber-600'
                                  : 'border-slate-300 bg-white text-slate-400 focus:border-slate-500'
                              }`}
                            />
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-xs whitespace-nowrap text-emerald-800">
                            R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-center">
                            {hasQty ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateItemParaPedido(item.produtoId || item.codigo, 'quantidadePedida', 0)
                                }
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                title="Zerar quantidade deste produto (não entrará no pedido)"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Zerado</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Campo Opcional: Observações do Pedido */}
              <div className="mt-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                  Observações do Pedido (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Prazo de entrega urgente, faturamento 30 dias..."
                  value={observacoesPedido}
                  onChange={(e) => setObservacoesPedido(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>
            </div>

            {/* Rodapé do Modal com Ações */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsGerarPedidoModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>

              {(() => {
                const itensValidos = itensParaPedido.filter((it) => (parseFloat(it.quantidadePedida) || 0) > 0);
                const totalPedido = itensValidos.reduce((acc, curr) => {
                  const q = parseFloat(curr.quantidadePedida) || 0;
                  const v = parseFloat(curr.valorCotacao) || 0;
                  return acc + q * v;
                }, 0);

                return (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-600 hidden sm:inline">
                      {itensValidos.length} {itensValidos.length === 1 ? 'produto selecionado' : 'produtos selecionados'} &bull; Total: <span className="text-emerald-700 font-mono font-black">R$ {totalPedido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </span>

                    <button
                      type="button"
                      onClick={handleConfirmarGerarPedido}
                      disabled={savingGerarPedido || itensValidos.length === 0}
                      className="px-6 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingGerarPedido ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 text-white" />
                      )}
                      <span>Gerar Pedido ({itensValidos.length})</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
