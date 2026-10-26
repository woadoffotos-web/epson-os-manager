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
  Settings,
  Pencil,
  Trash2,
  Sliders,
  Tag,
  Package,
  Layers,
  MapPin,
  Calendar,
  Phone,
  Mail,
  ShieldAlert,
  CalendarClock,
  Sparkle,
} from 'lucide-react';

interface VipzCustomer {
  id: string;
  erpCustomerId?: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  birthDate?: string;
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
  active: boolean;
  erpItemId?: string;
  erpItemType?: string;
  erpItemCode?: string;
  originalPrice?: number;
  rewardType?: string;
  discountValue?: number;
  validityDays?: number;
  termsOfUse?: string;
  imageUrl?: string;
}

interface VipzRule {
  id: string;
  name: string;
  code: string;
  type: string;
  description?: string;
  pointsPerReal: number;
  fixedPoints: number;
  minSaleValue: number;
  targetTier: string;
  active: boolean;
}

interface VipzTier {
  id: string;
  name: string;
  code: string;
  minPoints: number;
  multiplier: number;
  benefits?: string;
  color?: string;
  bonusServices?: string; // JSON string
  active: boolean;
}

export default function VipzInfogedPage() {
  const { currentUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'clientes' | 'recompensas' | 'vendas_erp' | 'extrato' | 'gerencia'>('clientes');
  const [gerenciaSubTab, setGerenciaSubTab] = useState<'regras' | 'premios' | 'niveis'>('niveis');

  const isAdminOrManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'GERENTE';

  // Busca e Seleção de Clientes
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Modais de Operação: Crédito de Venda
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditSaleValue, setCreditSaleValue] = useState('');
  const [creditSaleDesc, setCreditSaleDesc] = useState('');
  const [creditCampoVipz, setCreditCampoVipz] = useState('');
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  // Modal: Cadastro de Cliente com Endereço e CEP
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustCpf, setNewCustCpf] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCep, setNewCustCep] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustNumber, setNewCustNumber] = useState('');
  const [newCustComplement, setNewCustComplement] = useState('');
  const [newCustNeighborhood, setNewCustNeighborhood] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustState, setNewCustState] = useState('');
  const [newCustBirthDate, setNewCustBirthDate] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [custFormError, setCustFormError] = useState<string | null>(null);
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

  // Gerência: Níveis Vipz
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<VipzTier | null>(null);
  const [tierName, setTierName] = useState('');
  const [tierCode, setTierCode] = useState('');
  const [tierMinPoints, setTierMinPoints] = useState('1000');
  const [tierMultiplier, setTierMultiplier] = useState('1.2');
  const [tierBenefits, setTierBenefits] = useState('');
  const [tierColor, setTierColor] = useState('#d97706');
  const [tierBonusServicesList, setTierBonusServicesList] = useState<Array<{ serviceName: string; validUntil: string }>>([
    { serviceName: '', validUntil: '2026-12-31' },
  ]);
  const [isSubmittingTier, setIsSubmittingTier] = useState(false);

  // Gerência: Regras de Pontuação
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<VipzRule | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleCode, setRuleCode] = useState('');
  const [ruleType, setRuleType] = useState('BASICA');
  const [ruleDesc, setRuleDesc] = useState('');
  const [rulePointsPerReal, setRulePointsPerReal] = useState('1.0');
  const [ruleFixedPoints, setRuleFixedPoints] = useState('0');
  const [ruleMinSaleValue, setRuleMinSaleValue] = useState('0');
  const [ruleTargetTier, setRuleTargetTier] = useState('TODOS');
  const [ruleActive, setRuleActive] = useState(true);
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);

  // Gerência: Prêmios & Cupons
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<VipzReward | null>(null);
  const [selectedErpItemId, setSelectedErpItemId] = useState('');
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardType, setRewardType] = useState('PRODUTO');
  const [rewardCategory, setRewardCategory] = useState('Brindes Vipz');
  const [rewardPointsCost, setRewardPointsCost] = useState('500');
  const [rewardStock, setRewardStock] = useState('10');
  const [rewardDiscountVal, setRewardDiscountVal] = useState('');
  const [rewardValidityDays, setRewardValidityDays] = useState('30');
  const [rewardTerms, setRewardTerms] = useState('');
  const [isSubmittingReward, setIsSubmittingReward] = useState(false);

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

  // Consulta automática de CEP via ViaCEP
  const handleCepLookup = async (cepInput: string) => {
    setNewCustCep(cepInput);
    const cleanCep = cepInput.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        setLoadingCep(true);
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const json = await res.json();
        if (!json.erro) {
          setNewCustAddress(json.logradouro || '');
          setNewCustNeighborhood(json.bairro || '');
          setNewCustCity(json.localidade || '');
          setNewCustState(json.uf || '');
        }
      } catch (err) {
        console.error('Erro no ViaCEP:', err);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  // ==============================================================
  // AÇÕES: RESGATE DE RECOMPENSA
  // ==============================================================
  const handleRedeem = async (reward: VipzReward) => {
    if (!selectedCustomer) {
      alert('Por favor, selecione primeiro o cliente que irá resgatar este prêmio.');
      setActiveTab('clientes');
      return;
    }

    if (selectedCustomer.pointsBalance < reward.pointsCost) {
      alert(`Saldo insuficiente! O cliente possui ${selectedCustomer.pointsBalance} pontos e este prêmio custa ${reward.pointsCost} pontos.`);
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

      fetchData(searchQuery);
    } catch (err: any) {
      console.error(err);
      alert('Falha ao comunicar com o servidor');
    }
  };

  // ==============================================================
  // AÇÕES: CREDITAR VENDA COM REGRA DUAL & EXPIRAÇÃO DE 1 ANO
  // ==============================================================
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
          description: creditSaleDesc || `Venda confirmada - R$ ${val.toFixed(2)}`,
          campoVipzIndicador: creditCampoVipz.trim(),
          userName: currentUser?.name || 'Atendente INFOGED',
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        alert(resJson.error || 'Erro ao creditar pontos');
        return;
      }

      let msg = `Sucesso!\n• ${selectedCustomer.name} recebeu +${resJson.buyerPoints} pontos (Regra Básica - Validade 1 ano). Novo saldo: ${resJson.buyerNewBalance} pts.`;
      if (resJson.partnerResult) {
        msg += `\n• Contador/Parceiro (${resJson.partnerResult.partnerName}) recebeu +${resJson.partnerResult.pointsEarned} pontos (Regra Contadores - Validade 1 ano). Novo saldo: ${resJson.partnerResult.newBalance} pts!`;
      }

      alert(msg);
      setIsCreditModalOpen(false);
      setCreditSaleValue('');
      setCreditSaleDesc('');
      setCreditCampoVipz('');
      fetchData(searchQuery);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar crédito de venda');
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  // ==============================================================
  // AÇÕES: CADASTRO DE CLIENTE COM VERIFICAÇÃO NO ERP & ENDEREÇO
  // ==============================================================
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustFormError(null);

    // Validação de campos obrigatórios
    if (
      !newCustName.trim() ||
      !newCustCpf.trim() ||
      !newCustPhone.trim() ||
      !newCustEmail.trim() ||
      !newCustCep.trim() ||
      !newCustAddress.trim() ||
      !newCustNumber.trim() ||
      !newCustNeighborhood.trim() ||
      !newCustCity.trim() ||
      !newCustState.trim()
    ) {
      setCustFormError('Todos os campos marcados com * são de preenchimento obrigatório.');
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
          phone: newCustPhone.trim(),
          email: newCustEmail.trim(),
          cep: newCustCep.trim(),
          address: newCustAddress.trim(),
          number: newCustNumber.trim(),
          complement: newCustComplement.trim() || null,
          neighborhood: newCustNeighborhood.trim(),
          city: newCustCity.trim(),
          state: newCustState.trim(),
          birthDate: newCustBirthDate || null,
          userName: currentUser?.name || 'Atendente INFOGED',
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        setCustFormError(resJson.error || 'Falha ao cadastrar cliente');
        return;
      }

      alert(
        `Cliente ${newCustName} cadastrado com sucesso!\n• Registrado no Vipz Infoged (+100 pontos válidos por 1 ano).\n• Sincronizado no ERP Gestão Click com o campo 'Vipz' preenchido.`
      );

      setIsNewCustomerModalOpen(false);
      // Resetar form
      setNewCustName('');
      setNewCustCpf('');
      setNewCustEmail('');
      setNewCustPhone('');
      setNewCustCep('');
      setNewCustAddress('');
      setNewCustNumber('');
      setNewCustComplement('');
      setNewCustNeighborhood('');
      setNewCustCity('');
      setNewCustState('');
      setNewCustBirthDate('');
      setCustFormError(null);
      fetchData(newCustCpf.trim());
    } catch (err: any) {
      setCustFormError(err.message || 'Erro de comunicação');
    } finally {
      setIsSubmittingNewCust(false);
    }
  };

  // ==============================================================
  // AÇÕES DA GERÊNCIA: NÍVEIS VIPZ & SERVIÇOS BÔNUS COM VALIDADE
  // ==============================================================
  const openNewTierModal = () => {
    setEditingTier(null);
    setTierName('');
    setTierCode('');
    setTierMinPoints('1000');
    setTierMultiplier('1.2');
    setTierBenefits('');
    setTierColor('#d97706');
    setTierBonusServicesList([{ serviceName: '', validUntil: '2026-12-31' }]);
    setIsTierModalOpen(true);
  };

  const openEditTierModal = (tier: VipzTier) => {
    setEditingTier(tier);
    setTierName(tier.name);
    setTierCode(tier.code);
    setTierMinPoints(tier.minPoints.toString());
    setTierMultiplier(tier.multiplier.toString());
    setTierBenefits(tier.benefits || '');
    setTierColor(tier.color || '#d97706');

    try {
      const parsed = JSON.parse(tier.bonusServices || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        setTierBonusServicesList(parsed);
      } else {
        setTierBonusServicesList([{ serviceName: '', validUntil: '2026-12-31' }]);
      }
    } catch {
      setTierBonusServicesList([{ serviceName: '', validUntil: '2026-12-31' }]);
    }

    setIsTierModalOpen(true);
  };

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierName.trim()) {
      alert('Nome do nível é obrigatório.');
      return;
    }

    try {
      setIsSubmittingTier(true);
      const action = editingTier ? 'UPDATE_TIER' : 'CREATE_TIER';

      const validBonusServices = tierBonusServicesList.filter((s) => s.serviceName.trim().length > 0);

      const payload: any = {
        action,
        name: tierName.trim(),
        code: editingTier ? editingTier.code : tierCode.trim() || tierName.toUpperCase().replace(/\s+/g, '_'),
        minPoints: parseInt(tierMinPoints) || 0,
        multiplier: parseFloat(tierMultiplier) || 1.0,
        benefits: tierBenefits.trim(),
        color: tierColor,
        bonusServices: JSON.stringify(validBonusServices),
        userName: currentUser?.name || 'Gerente Vipz',
      };
      if (editingTier) payload.id = editingTier.id;

      const res = await fetch('/api/vipz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok) {
        alert(resJson.error || 'Erro ao salvar nível');
        return;
      }

      alert(editingTier ? 'Nível Vipz atualizado com sucesso!' : 'Novo nível Vipz cadastrado com sucesso!');
      setIsTierModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar nível');
    } finally {
      setIsSubmittingTier(false);
    }
  };

  const handleDeleteTier = async (tier: VipzTier) => {
    if (tier.code === 'BRONZE') {
      alert('O nível Bronze é a categoria base e não pode ser excluído.');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir o nível '${tier.name}'?`)) return;

    try {
      const res = await fetch('/api/vipz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_TIER',
          id: tier.id,
          userName: currentUser?.name || 'Gerente Vipz',
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        alert(resJson.error || 'Erro ao excluir');
        return;
      }

      alert('Nível excluído com sucesso!');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir nível');
    }
  };

  // Gerência: Funções para Regras
  const openNewRuleModal = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleCode('');
    setRuleType('BASICA');
    setRuleDesc('');
    setRulePointsPerReal('1.0');
    setRuleFixedPoints('0');
    setRuleMinSaleValue('0');
    setRuleTargetTier('TODOS');
    setRuleActive(true);
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: VipzRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleCode(rule.code);
    setRuleType(rule.type);
    setRuleDesc(rule.description || '');
    setRulePointsPerReal(rule.pointsPerReal.toString());
    setRuleFixedPoints(rule.fixedPoints.toString());
    setRuleMinSaleValue(rule.minSaleValue.toString());
    setRuleTargetTier(rule.targetTier);
    setRuleActive(rule.active);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      alert('Nome da regra é obrigatório.');
      return;
    }

    try {
      setIsSubmittingRule(true);
      const action = editingRule ? 'UPDATE_RULE' : 'CREATE_RULE';
      const payload: any = {
        action,
        name: ruleName.trim(),
        code: editingRule ? editingRule.code : ruleCode.trim() || ruleName.toUpperCase().replace(/\s+/g, '_'),
        type: ruleType,
        description: ruleDesc.trim(),
        pointsPerReal: parseFloat(rulePointsPerReal) || 1.0,
        fixedPoints: parseInt(ruleFixedPoints) || 0,
        minSaleValue: parseFloat(ruleMinSaleValue) || 0,
        targetTier: ruleTargetTier,
        active: ruleActive,
        userName: currentUser?.name || 'Gerente Vipz',
      };
      if (editingRule) payload.id = editingRule.id;

      const res = await fetch('/api/vipz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok) {
        alert(resJson.error || 'Erro ao salvar regra');
        return;
      }

      alert(editingRule ? 'Regra atualizada com sucesso!' : 'Regra cadastrada com sucesso!');
      setIsRuleModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar regra');
    } finally {
      setIsSubmittingRule(false);
    }
  };

  // Gerência: Funções para Prêmios
  const openNewRewardModal = () => {
    setEditingReward(null);
    setSelectedErpItemId('');
    setRewardTitle('');
    setRewardDesc('');
    setRewardType('PRODUTO');
    setRewardCategory('Brindes Vipz');
    setRewardPointsCost('500');
    setRewardStock('10');
    setRewardDiscountVal('');
    setRewardValidityDays('30');
    setRewardTerms('');
    setIsRewardModalOpen(true);
  };

  const handleSelectErpItem = (erpId: string) => {
    setSelectedErpItemId(erpId);
    if (!erpId) return;

    const item = data?.erpItems?.find((it: any) => it.id === erpId);
    if (item) {
      setRewardTitle(item.nome);
      setRewardType(item.tipo === 'SERVICO' ? 'SERVICO' : 'PRODUTO');
      setRewardCategory(item.tipo === 'SERVICO' ? 'Serviços Cortesia' : 'Brindes Vipz');
      setRewardStock(item.estoque.toString());
      setRewardPointsCost(Math.round(item.valor * 10).toString());
    }
  };

  const openEditRewardModal = (reward: VipzReward) => {
    setEditingReward(reward);
    setRewardTitle(reward.title);
    setRewardDesc(reward.description || '');
    setRewardType(reward.rewardType || 'PRODUTO');
    setRewardCategory(reward.category);
    setRewardPointsCost(reward.pointsCost.toString());
    setRewardStock(reward.stock.toString());
    setRewardDiscountVal(reward.discountValue?.toString() || '');
    setRewardValidityDays(reward.validityDays?.toString() || '30');
    setRewardTerms(reward.termsOfUse || '');
    setIsRewardModalOpen(true);
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardTitle.trim() || !rewardPointsCost.trim()) {
      alert('Título e Custo em Pontos são obrigatórios.');
      return;
    }

    try {
      setIsSubmittingReward(true);
      const action = editingReward ? 'UPDATE_REWARD' : 'CREATE_REWARD';
      const erpItem = data?.erpItems?.find((it: any) => it.id === selectedErpItemId);

      const payload: any = {
        action,
        title: rewardTitle.trim(),
        description: rewardDesc.trim(),
        category: rewardCategory,
        pointsCost: parseInt(rewardPointsCost),
        stock: parseInt(rewardStock) || 0,
        rewardType,
        discountValue: rewardDiscountVal ? parseFloat(rewardDiscountVal) : null,
        validityDays: parseInt(rewardValidityDays) || 30,
        termsOfUse: rewardTerms.trim(),
        userName: currentUser?.name || 'Gerente Vipz',
      };

      if (!editingReward && erpItem) {
        payload.erpItemId = erpItem.id;
        payload.erpItemType = erpItem.tipo;
        payload.erpItemCode = erpItem.codigo;
        payload.originalPrice = erpItem.valor;
      }
      if (editingReward) payload.id = editingReward.id;

      const res = await fetch('/api/vipz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok) {
        alert(resJson.error || 'Erro ao salvar prêmio/cupom');
        return;
      }

      alert(editingReward ? 'Prêmio atualizado com sucesso!' : 'Novo prêmio/cupom cadastrado no catálogo!');
      setIsRewardModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar prêmio');
    } finally {
      setIsSubmittingReward(false);
    }
  };

  // Helper de badges para os níveis
  const renderTierBadge = (tierCode: string) => {
    const tierObj = data?.tiers?.find((t: VipzTier) => t.code === tierCode);
    const label = tierObj?.name || tierCode;
    const color = tierObj?.color || '#d97706';

    return (
      <span
        style={{ borderColor: `${color}80`, color: color }}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border text-[10px] font-black tracking-wider uppercase shadow-xs"
      >
        <Crown className="w-3 h-3" style={{ color: color }} />
        {label}
      </span>
    );
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
              Consulte pontos válidos por 1 ano, gerencie níveis com serviços bônus, bonifique contadores parceiros e emita vouchers de resgate.
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
              <span>Conformidade LGPD & Validação ERP Ativa</span>
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
            <span className="text-[11px] text-slate-400 block">Pontos Ativos (1 ano)</span>
            <span className="text-lg font-black text-amber-300">
              {data?.metrics?.totalPointsActive ? Number(data.metrics.totalPointsActive).toLocaleString('pt-BR') : '0'} pts
            </span>
          </div>
          <div className="bg-[#061C14]/70 p-3 rounded-xl border border-emerald-800/30">
            <span className="text-[11px] text-slate-400 block">Níveis Cadastrados</span>
            <span className="text-lg font-black text-emerald-400">{data?.metrics?.totalTiers ?? 4} níveis</span>
          </div>
          <div className="bg-[#061C14]/70 p-3 rounded-xl border border-emerald-800/30">
            <span className="text-[11px] text-slate-400 block">Catálogo de Prêmios</span>
            <span className="text-lg font-black text-cyan-300">{data?.metrics?.totalRewards ?? 5} itens</span>
          </div>
        </div>
      </div>

      {/* Navegação entre Abas Principais */}
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
            <span>Catálogo de Prêmios</span>
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
            <span>Vendas ERP & Regra VIPZ</span>
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

          {/* ABA GERÊNCIA */}
          {isAdminOrManager && (
            <button
              onClick={() => setActiveTab('gerencia')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 border ${
                activeTab === 'gerencia'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-300'
              }`}
            >
              <Settings className="w-4 h-4 text-amber-300" />
              <span>Gerência Vipz</span>
            </button>
          )}
        </div>

        <button
          onClick={() => {
            setCustFormError(null);
            setIsNewCustomerModalOpen(true);
          }}
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
                        {cust.city && (
                          <span className="text-[10px] text-slate-400 block">
                            {cust.city} - {cust.state}
                          </span>
                        )}
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

          <div className="lg:col-span-7">
            {selectedCustomer ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
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

                    {/* Endereço Completo & Data de Nascimento */}
                    <div className="pt-2 text-xs text-slate-600 space-y-1">
                      {selectedCustomer.address && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {selectedCustomer.address}, {selectedCustomer.number}
                            {selectedCustomer.complement ? ` (${selectedCustomer.complement})` : ''} -{' '}
                            {selectedCustomer.neighborhood}, {selectedCustomer.city}/{selectedCustomer.state} &bull; CEP: {selectedCustomer.cep}
                          </span>
                        </div>
                      )}
                      {selectedCustomer.birthDate && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Aniversário: {new Date(selectedCustomer.birthDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-500 to-amber-700 text-white px-5 py-3 rounded-2xl shadow-md text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-200 block">Saldo Atual</span>
                    <span className="text-2xl font-black">{selectedCustomer.pointsBalance}</span>
                    <span className="text-xs font-bold text-amber-100 ml-1">pontos</span>
                    <span className="text-[9px] text-amber-200/80 block mt-0.5">Validade de 1 ano</span>
                  </div>
                </div>

                {/* Serviços Bônus do Nível Atual deste Cliente */}
                {(() => {
                  const currentTierObj = data?.tiers?.find((t: VipzTier) => t.code === selectedCustomer.tier);
                  let bonusServices: Array<{ serviceName: string; validUntil: string }> = [];
                  try {
                    bonusServices = JSON.parse(currentTierObj?.bonusServices || '[]');
                  } catch {}

                  if (bonusServices.length === 0) return null;

                  return (
                    <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-amber-600" />
                        Serviços Bônus Inclusos neste Nível ({currentTierObj?.name})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {bonusServices.map((srv, idx) => (
                          <div key={idx} className="p-2.5 bg-white rounded-xl border border-amber-200 flex flex-col justify-between">
                            <span className="font-bold text-slate-800 text-[11px]">{srv.serviceName}</span>
                            <span className="text-[10px] text-amber-800 font-medium flex items-center gap-1 mt-1">
                              <CalendarClock className="w-3 h-3 text-amber-600" />
                              Vence em: {new Date(srv.validUntil).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Botões Rápidos de Ação */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setCreditSaleValue('');
                      setCreditSaleDesc('');
                      setCreditCampoVipz('');
                      setIsCreditModalOpen(true);
                    }}
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
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                              <span>{new Date(tx.createdAt).toLocaleString('pt-BR')}</span>
                              {tx.expiresAt && !tx.isExpired && (
                                <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  Expira em {new Date(tx.expiresAt).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                              {tx.isExpired && (
                                <span className="text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                  Expirado
                                </span>
                              )}
                            </div>
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
            {data?.rewards?.filter((r: any) => r.active).map((reward: VipzReward) => {
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
                        {hasStock ? `${reward.stock} disponível` : 'Esgotado'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-amber-700 transition">
                        {reward.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {reward.description || 'Válido para troca imediata no balcão INFOGED.'}
                      </p>
                      {reward.termsOfUse && (
                        <p className="text-[10px] text-amber-800 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          {reward.termsOfUse}
                        </p>
                      )}
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
      {/* ABA 3: VENDAS DO ERP & REGRA VIPZ                              */}
      {/* ============================================================== */}
      {activeTab === 'vendas_erp' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Vendas Confirmadas no ERP com Associação no Campo VIPZ
              </h3>
              <p className="text-slate-500 text-[11px]">
                Regra ativa: Se o campo VIPZ contiver o nome de outro cliente (ex.: Contador), ambos pontuam!
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full font-bold text-[11px]">
              {data?.erpSales?.length ?? 0} Vendas Faturadas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.erpSales?.map((sale: any) => {
              const temContador = Boolean(sale.campo_vipz_indicador && sale.campo_vipz_indicador.trim());

              return (
                <div key={sale.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-300 transition">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {sale.id}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Faturado / Liquidado
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Cliente da Venda</span>
                      <h4 className="text-xs font-bold text-slate-900">{sale.cliente_nome}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(sale.data_emissao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                      temContador
                        ? 'bg-purple-50/70 border-purple-200 text-purple-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-purple-600" />
                          Campo VIPZ:
                        </span>
                        <span className="font-bold text-[10px]">
                          {temContador ? 'Preenchido' : 'Em Branco'}
                        </span>
                      </div>

                      {temContador ? (
                        <div>
                          <span className="font-extrabold text-purple-950 block">{sale.campo_vipz_indicador}</span>
                          <span className="text-[10px] text-purple-700">
                            Regra Dual: O cliente recebe pontos normais e este contador recebe a pontuação parceira!
                          </span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500">
                          Apenas o cliente titular receberá pontos pela regra básica.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 pt-1 text-[11px] text-slate-600">
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
                      <span className="text-[10px] text-slate-400 block">Total da Venda</span>
                      <span className="text-sm font-black text-slate-900">R$ {sale.valor_total.toFixed(2)}</span>
                    </div>

                    <button
                      onClick={() => {
                        const matchedCust = data?.customers?.find((c: VipzCustomer) =>
                          c.name.toLowerCase().includes(sale.cliente_nome.toLowerCase()) ||
                          sale.cliente_nome.toLowerCase().includes(c.name.toLowerCase())
                        );

                        if (matchedCust) {
                          setSelectedCustomerId(matchedCust.id);
                          setCreditSaleValue(sale.valor_total.toString());
                          setCreditSaleDesc(`Venda ERP #${sale.id} - ${sale.itens?.[0]?.nome || 'Serviços'}`);
                          setCreditCampoVipz(sale.campo_vipz_indicador || '');
                          setIsCreditModalOpen(true);
                        } else {
                          alert(`Cliente "${sale.cliente_nome}" ainda não possui cadastro no Vipz. Cadastre-o primeiro.`);
                          setNewCustName(sale.cliente_nome);
                          setIsNewCustomerModalOpen(true);
                        }
                      }}
                      className="px-3.5 py-1.5 bg-[#07241A] hover:bg-[#0E3A2B] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Processar Pontuação</span>
                    </button>
                  </div>
                </div>
              );
            })}
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
              Histórico Consolidado de Créditos e Resgates (Validade de 1 Ano)
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
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span>{new Date(t.createdAt).toLocaleString('pt-BR')}</span>
                    {t.expiresAt && !t.isExpired && (
                      <span className="text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                        Expira em {new Date(t.expiresAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {t.isExpired && (
                      <span className="text-rose-700 bg-rose-50 px-1 rounded border border-rose-200">
                        Expirado
                      </span>
                    )}
                  </div>
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
      {/* ABA 5: GERÊNCIA VIPZ (NÍVEIS, REGRAS & PRÊMIOS)                */}
      {/* ============================================================== */}
      {activeTab === 'gerencia' && isAdminOrManager && (
        <div className="space-y-6">
          {/* Submenu da Gerência */}
          <div className="bg-amber-50/80 border border-amber-300 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGerenciaSubTab('niveis')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  gerenciaSubTab === 'niveis'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-900 hover:bg-amber-100'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Níveis Vipz & Serviços ({data?.tiers?.length ?? 0})</span>
              </button>

              <button
                onClick={() => setGerenciaSubTab('regras')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  gerenciaSubTab === 'regras'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-900 hover:bg-amber-100'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Regras de Pontuação ({data?.rules?.length ?? 0})</span>
              </button>

              <button
                onClick={() => setGerenciaSubTab('premios')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  gerenciaSubTab === 'premios'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-900 hover:bg-amber-100'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Gestão de Prêmios & Cupons ({data?.rewards?.length ?? 0})</span>
              </button>
            </div>

            {gerenciaSubTab === 'niveis' && (
              <button
                onClick={openNewTierModal}
                className="px-3.5 py-1.5 bg-[#07241A] hover:bg-[#0E3A2B] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Novo Nível Vipz</span>
              </button>
            )}

            {gerenciaSubTab === 'regras' && (
              <button
                onClick={openNewRuleModal}
                className="px-3.5 py-1.5 bg-[#07241A] hover:bg-[#0E3A2B] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Nova Regra de Pontuação</span>
              </button>
            )}

            {gerenciaSubTab === 'premios' && (
              <button
                onClick={openNewRewardModal}
                className="px-3.5 py-1.5 bg-[#07241A] hover:bg-[#0E3A2B] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Novo Prêmio ou Cupom (do ERP)</span>
              </button>
            )}
          </div>

          {/* SUB-ABA 1: NÍVEIS VIPZ & SERVIÇOS BÔNUS */}
          {gerenciaSubTab === 'niveis' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.tiers?.map((tier: VipzTier) => {
                  let bonusServices: Array<{ serviceName: string; validUntil: string }> = [];
                  try {
                    bonusServices = JSON.parse(tier.bonusServices || '[]');
                  } catch {}

                  return (
                    <div
                      key={tier.id}
                      className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-300 transition"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              style={{ backgroundColor: tier.color || '#d97706' }}
                              className="w-4 h-4 rounded-full inline-block shadow-xs"
                            />
                            <h4 className="text-base font-black text-slate-900">{tier.name}</h4>
                            <span className="text-[10px] font-mono text-slate-400">({tier.code})</span>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                              {tier.minPoints} pts mínimos
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {tier.benefits || 'Benefícios da categoria.'}
                        </p>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Multiplicador de Pontos:</span>
                          <span className="font-black text-emerald-700">{tier.multiplier}x nas compras</span>
                        </div>

                        {/* Lista de Serviços Bônus com Data de Vencimento */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <span className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                            <Gift className="w-3.5 h-3.5 text-amber-600" />
                            Serviços Bônus Inclusos:
                          </span>

                          {bonusServices.length > 0 ? (
                            <div className="space-y-1.5">
                              {bonusServices.map((srv, idx) => (
                                <div key={idx} className="p-2 bg-amber-50/60 rounded-lg border border-amber-200 flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-800">{srv.serviceName}</span>
                                  <span className="text-[10px] text-amber-800 font-medium flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    Vence: {new Date(srv.validUntil).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              Nenhum serviço bônus cadastrado para este nível.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditTierModal(tier)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
                          <span>Editar Nível</span>
                        </button>

                        {tier.code !== 'BRONZE' && (
                          <button
                            onClick={() => handleDeleteTier(tier)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Excluir nível"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-ABA 2: REGRAS DE PONTUAÇÃO */}
          {gerenciaSubTab === 'regras' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data?.rules?.map((rule: VipzRule) => {
                  const isProtected = rule.code === 'BASICA' || rule.code === 'CONTADORES';

                  return (
                    <div
                      key={rule.id}
                      className={`p-5 bg-white rounded-2xl border shadow-sm flex flex-col justify-between space-y-4 transition ${
                        rule.active ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            rule.code === 'BASICA'
                              ? 'bg-blue-100 text-blue-900'
                              : rule.code === 'CONTADORES'
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {rule.code}
                          </span>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            rule.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {rule.active ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">{rule.name}</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {rule.description || 'Regra de conversão de pontos.'}
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Paridade:</span>
                            <span className="font-bold text-slate-800">
                              R$ 1,00 = {rule.pointsPerReal} {rule.pointsPerReal === 1 ? 'ponto' : 'pontos'}
                            </span>
                          </div>
                          {rule.fixedPoints > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Bônus Fixo:</span>
                              <span className="font-bold text-emerald-700">+{rule.fixedPoints} pts</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-500">Validade:</span>
                            <span className="font-bold text-amber-700">1 ano (365 dias)</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditRuleModal(rule)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
                          <span>Editar</span>
                        </button>

                        {!isProtected && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Excluir regra ${rule.name}?`)) {
                                fetch('/api/vipz', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'DELETE_RULE', id: rule.id }),
                                }).then(() => fetchData());
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-ABA 3: PRÊMIOS & CUPONS */}
          {gerenciaSubTab === 'premios' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data?.rewards?.map((reward: VipzReward) => (
                  <div
                    key={reward.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {reward.category}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          reward.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {reward.active ? 'No Catálogo' : 'Pausado'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">{reward.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{reward.description}</p>
                      </div>

                      <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-amber-900 font-medium">Custo do Resgate:</span>
                          <span className="font-black text-amber-700">{reward.pointsCost} pontos</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-amber-900 font-medium">Estoque Disponível:</span>
                          <span className="font-bold text-slate-800">{reward.stock} un</span>
                        </div>
                        {reward.originalPrice && (
                          <div className="flex justify-between">
                            <span className="text-amber-900 font-medium">Valor no ERP:</span>
                            <span className="font-mono text-slate-600">R$ {reward.originalPrice.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditRewardModal(reward)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-500" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Remover ${reward.title}?`)) {
                            fetch('/api/vipz', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'DELETE_REWARD', id: reward.id }),
                            }).then(() => fetchData());
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CADASTRO DE CLIENTE VIPZ COM ENDEREÇO & VALIDAÇÃO ERP   */}
      {/* ============================================================== */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-amber-500/30 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Novo Cadastro Vipz Infoged</h3>
                  <span className="text-[11px] text-slate-500">Validação com Gestão Click ERP integrada</span>
                </div>
              </div>
              <button
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alerta de Erro de Validação com o ERP */}
            {custFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Atenção na Validação:</span>
                  <p className="leading-relaxed">{custFormError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              {/* 1. Dados Pessoais */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  1. Dados Pessoais & Contato
                </span>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nome Completo / Razão Social <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nome completo do cliente"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      CPF ou CNPJ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={newCustCpf}
                      onChange={(e) => setNewCustCpf(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Data de Nascimento <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <input
                      type="date"
                      value={newCustBirthDate}
                      onChange={(e) => setNewCustBirthDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Telefone / WhatsApp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="(81) 9...."
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      E-mail <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="cliente@dominio.com"
                      value={newCustEmail}
                      onChange={(e) => setNewCustEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Endereço Completo */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  2. Endereço Completo
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      CEP <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="00000-000"
                        value={newCustCep}
                        onChange={(e) => handleCepLookup(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-amber-600"
                      />
                      {loadingCep && (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 absolute right-2.5 top-2.5" />
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Logradouro / Rua <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Rua, Av..."
                      value={newCustAddress}
                      onChange={(e) => setNewCustAddress(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Número <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nº"
                      value={newCustNumber}
                      onChange={(e) => setNewCustNumber(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Complemento</label>
                    <input
                      type="text"
                      placeholder="Apto, Sala"
                      value={newCustComplement}
                      onChange={(e) => setNewCustComplement(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Bairro <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Bairro"
                      value={newCustNeighborhood}
                      onChange={(e) => setNewCustNeighborhood(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Cidade <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={newCustCity}
                      onChange={(e) => setNewCustCity(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      UF <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="PE"
                      maxLength={2}
                      value={newCustState}
                      onChange={(e) => setNewCustState(e.target.value.toUpperCase())}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl uppercase font-bold focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>

              {/* Informação sobre sincronização e regras */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Regras de Validação & Sincronização:
                </span>
                <p>• O sistema consulta se o cliente já existe no seu ERP Gestão Click. Se já existir, a duplicação é barrada.</p>
                <p>• Se for novo, ele será cadastrado no Vipz e no ERP Gestão Click com o campo <strong>Vipz</strong> preenchido como Bronze.</p>
                <p>• O cliente receberá 100 pontos bônus com <strong>validade de 1 ano (365 dias)</strong>.</p>
              </div>

              <div className="flex gap-2 pt-2">
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
                  Salvar Cliente no ERP & Vipz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVO OU EDITAR NÍVEL VIPZ COM SERVIÇOS BÔNUS            */}
      {/* ============================================================== */}
      {isTierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-500/30 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingTier ? `Editar Nível: ${editingTier.name}` : 'Novo Nível Vipz'}
                </h3>
              </div>
              <button
                onClick={() => setIsTierModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome do Nível</label>
                  <input
                    type="text"
                    placeholder="Ex: Diamante"
                    value={tierName}
                    onChange={(e) => setTierName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Pontos Mínimos Acumulados</label>
                  <input
                    type="number"
                    placeholder="5000"
                    value={tierMinPoints}
                    onChange={(e) => setTierMinPoints(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Multiplicador de Pontos</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="1.5"
                    value={tierMultiplier}
                    onChange={(e) => setTierMultiplier(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Cor do Selo (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tierColor}
                      onChange={(e) => setTierColor(e.target.value)}
                      className="w-9 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={tierColor}
                      onChange={(e) => setTierColor(e.target.value)}
                      className="w-full px-2 py-2 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Descrição Geral dos Benefícios</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Atendimento exclusivo, descontos de 15% e multiplicador 1.5x..."
                  value={tierBenefits}
                  onChange={(e) => setTierBenefits(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                />
              </div>

              {/* SERVIÇOS BÔNUS COM DATA PARA VENCER */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-amber-600" />
                    Serviços Bônus Inclusos (Com Data para Vencer)
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setTierBonusServicesList([...tierBonusServicesList, { serviceName: '', validUntil: '2026-12-31' }])
                    }
                    className="text-[11px] text-amber-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar Serviço</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {tierBonusServicesList.map((srv, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Nome do serviço cortesia (Ex: Limpeza de Cabeça)"
                          value={srv.serviceName}
                          onChange={(e) => {
                            const updated = [...tierBonusServicesList];
                            updated[idx].serviceName = e.target.value;
                            setTierBonusServicesList(updated);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        />
                      </div>

                      <div className="w-36">
                        <input
                          type="date"
                          value={srv.validUntil}
                          onChange={(e) => {
                            const updated = [...tierBonusServicesList];
                            updated[idx].validUntil = e.target.value;
                            setTierBonusServicesList(updated);
                          }}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-[11px] bg-white font-mono"
                          title="Data de vencimento do serviço bônus"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setTierBonusServicesList(tierBonusServicesList.filter((_, i) => i !== idx));
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Remover serviço"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTierModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTier}
                  className="w-1/2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSubmittingTier ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Crown className="w-4 h-4" />}
                  Salvar Nível
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: LANÇAR CRÉDITO DE VENDA (COM CAMPO VIPZ)                */}
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
                  <h3 className="text-sm font-bold text-slate-900">Pontuar Venda no Vipz</h3>
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
                  Valor da Venda / Serviço Faturado (R$)
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
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-purple-600" />
                  Campo VIPZ (Nome do Contador ou Parceiro Associado)
                </label>
                <input
                  type="text"
                  placeholder="Deixe em branco se não houver contador parceiro"
                  value={creditCampoVipz}
                  onChange={(e) => setCreditCampoVipz(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 bg-purple-50/30"
                />
                <span className="text-[10px] text-purple-700 mt-1 block">
                  {creditCampoVipz.trim()
                    ? `✓ Regra Contadores ativada para "${creditCampoVipz.trim()}". Ambos pontuarão!`
                    : 'Campo em branco: apenas o cliente titular pontuará pela Regra Básica.'}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Descrição da Venda / O.S.
                </label>
                <input
                  type="text"
                  placeholder="Ex: Contrato Manutenção #9102"
                  value={creditSaleDesc}
                  onChange={(e) => setCreditSaleDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Os pontos gerados terão validade de <strong>1 ano (365 dias)</strong>.</span>
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
                  Confirmar Pontuação
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

      {/* ============================================================== */}
      {/* MODAL: CRIAR OU EDITAR REGRA DE PONTUAÇÃO                      */}
      {/* ============================================================== */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-500/30 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingRule ? `Editar Regra: ${editingRule.name}` : 'Nova Regra de Pontuação'}
                </h3>
              </div>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome da Regra</label>
                <input
                  type="text"
                  placeholder="Ex: Pontuação Especial de Serviços"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                />
              </div>

              {!editingRule && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Código Identificador</label>
                  <input
                    type="text"
                    placeholder="Ex: REGRA_SERVICOS_PREMIUM"
                    value={ruleCode}
                    onChange={(e) => setRuleCode(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:outline-none focus:border-amber-600"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Pontos por Real (R$)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="1.0"
                    value={rulePointsPerReal}
                    onChange={(e) => setRulePointsPerReal(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Bônus Fixo em Pontos</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={ruleFixedPoints}
                    onChange={(e) => setRuleFixedPoints(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Explicação da regra de pontuação..."
                  value={ruleDesc}
                  onChange={(e) => setRuleDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ruleActiveCheck"
                  checked={ruleActive}
                  onChange={(e) => setRuleActive(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-0"
                />
                <label htmlFor="ruleActiveCheck" className="text-xs font-bold text-slate-700">
                  Regra ativa e pontuando
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRule}
                  className="w-1/2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSubmittingRule ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <CheckCircle2 className="w-4 h-4" />}
                  Salvar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CRIAR OU EDITAR PRÊMIO / CUPOM (DO ERP)                 */}
      {/* ============================================================== */}
      {isRewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-500/30 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingReward ? `Editar: ${editingReward.title}` : 'Novo Prêmio / Cupom (do ERP)'}
                </h3>
              </div>
              <button
                onClick={() => setIsRewardModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReward} className="space-y-3.5 text-xs">
              {!editingReward && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <label className="block text-[11px] font-bold text-amber-900">
                    Selecione um Produto ou Serviço do seu ERP Gestão Click:
                  </label>
                  <select
                    value={selectedErpItemId}
                    onChange={(e) => handleSelectErpItem(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white font-medium text-xs focus:outline-none focus:border-amber-600"
                  >
                    <option value="">-- Escolha um item do ERP ou cadastre avulso --</option>
                    {data?.erpItems?.map((it: any) => (
                      <option key={it.id} value={it.id}>
                        [{it.tipo}] {it.nome} - R$ {it.valor.toFixed(2)} ({it.estoque} em estoque)
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-amber-800 block">
                    Ao selecionar, o sistema preenche título, categoria, preço e estoque automaticamente.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Título da Recompensa</label>
                <input
                  type="text"
                  placeholder="Nome exibido no catálogo"
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Custo em Pontos</label>
                  <input
                    type="number"
                    placeholder="Ex: 500"
                    value={rewardPointsCost}
                    onChange={(e) => setRewardPointsCost(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-amber-700 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Estoque Disponível</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={rewardStock}
                    onChange={(e) => setRewardStock(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Recompensa</label>
                  <select
                    value={rewardType}
                    onChange={(e) => setRewardType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-amber-600"
                  >
                    <option value="PRODUTO">Produto Físico / Brinde</option>
                    <option value="SERVICO">Serviço Cortesia</option>
                    <option value="CUPOM_VALOR">Cupom de Desconto em R$</option>
                    <option value="CUPOM_PERCENTUAL">Cupom de Desconto em %</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Validade do Cupom (Dias)</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={rewardValidityDays}
                    onChange={(e) => setRewardValidityDays(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Descrição do Prêmio</label>
                <textarea
                  rows={2}
                  placeholder="Detalhes sobre o produto ou benefício..."
                  value={rewardDesc}
                  onChange={(e) => setRewardDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Regras / Termos de Uso do Voucher</label>
                <input
                  type="text"
                  placeholder="Ex: Válido exclusivamente em ordens de serviço acima de R$ 100."
                  value={rewardTerms}
                  onChange={(e) => setRewardTerms(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRewardModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReward}
                  className="w-1/2 py-2.5 bg-[#07241A] hover:bg-[#0E3A2B] text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSubmittingReward ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <CheckCircle2 className="w-4 h-4" />}
                  Salvar Prêmio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
