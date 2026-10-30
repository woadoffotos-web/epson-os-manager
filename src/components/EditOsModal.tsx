'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Edit3,
  Lock,
  Calendar,
  Wrench,
  Clock,
  Truck,
  FileText,
  Layers,
  ShieldCheck,
  Check,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { getOsSlaAlerts, computeTmfDays } from '@/lib/sla-alerts';

interface EditOsModalProps {
  isOpen: boolean;
  order: any | null;
  onClose: () => void;
  onSuccess: () => void;
  situations: any[];
  models: any[];
  locations: any[];
  technicians: any[];
  currentUser?: any;
}

export default function EditOsModal({
  isOpen,
  order,
  onClose,
  onSuccess,
  situations,
  models,
  locations,
  technicians,
  currentUser,
}: EditOsModalProps) {
  // Aba ativa dentro da janela de edição
  const [activeTab, setActiveTab] = useState<'all' | 'cad' | 'tech' | 'comm' | 'notes'>('all');

  // 1. Dados Básicos & Cadastro
  const [osNumber, setOsNumber] = useState('');
  const [modelId, setModelId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [situationId, setSituationId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [technicianId, setTechnicianId] = useState('');

  // 2. Diagnóstico & E-mails
  const [diagnosisDate, setDiagnosisDate] = useState('');
  const [emailSentDate, setEmailSentDate] = useState('');
  const [emailReceivedDate, setEmailReceivedDate] = useState('');

  // 3. Peças & Suprimentos
  const [partsOrderDate, setPartsOrderDate] = useState('');
  const [partsInvoiceDate, setPartsInvoiceDate] = useState('');
  const [partsHeadQty, setPartsHeadQty] = useState<number>(0);
  const [partsTotalQty, setPartsTotalQty] = useState<number>(0);
  const [partsArrivalDate, setPartsArrivalDate] = useState('');
  const [partsChangeInk, setPartsChangeInk] = useState<boolean>(false);

  // 4. Conserto, Avisos & Saídas
  const [repairDate, setRepairDate] = useState('');
  const [notice1Date, setNotice1Date] = useState('');
  const [notice2Date, setNotice2Date] = useState('');
  const [notice3Date, setNotice3Date] = useState('');
  const [systemExitDate, setSystemExitDate] = useState('');
  const [exitDate, setExitDate] = useState('');

  // 5. Laudo & Observações
  const [notes, setNotes] = useState('');

  // Estados de feedback & validações
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Checagem de 90 dias
  const [checkingSerial, setCheckingSerial] = useState(false);
  const [serialFeedback, setSerialFeedback] = useState<{
    isEligible: boolean;
    message: string;
  } | null>(null);

  // Helper para formatar datas ISO (YYYY-MM-DD)
  const toInputDate = (d?: string | Date | null) => {
    if (!d) return '';
    try {
      return new Date(d).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Inicializar todos os 24 campos ao abrir ou alterar a O.S.
  useEffect(() => {
    if (order) {
      setOsNumber(order.osNumber || '');
      setModelId(order.modelId || '');
      setSerialNumber(order.serialNumber || '');
      setSituationId(order.situationId || '');
      setLocationId(order.locationId || '');
      setEntryDate(toInputDate(order.entryDate));
      setIsRecurrent(Boolean(order.isRecurrent));
      setTechnicianId(order.technicianId || '');

      setDiagnosisDate(toInputDate(order.diagnosisDate));
      setEmailSentDate(toInputDate(order.emailSentDate));
      setEmailReceivedDate(toInputDate(order.emailReceivedDate));

      setPartsOrderDate(toInputDate(order.partsOrderDate));
      setPartsInvoiceDate(toInputDate(order.partsInvoiceDate));
      setPartsHeadQty(order.partsHeadQty ?? 0);
      setPartsTotalQty(order.partsTotalQty ?? 0);
      setPartsArrivalDate(toInputDate(order.partsArrivalDate));
      setPartsChangeInk(Boolean(order.partsChangeInk));

      setRepairDate(toInputDate(order.repairDate));
      setNotice1Date(toInputDate(order.notice1Date));
      setNotice2Date(toInputDate(order.notice2Date));
      setNotice3Date(toInputDate(order.notice3Date));
      setSystemExitDate(toInputDate(order.systemExitDate));
      setExitDate(toInputDate(order.exitDate));

      setNotes(order.notes || '');

      setFieldErrors({});
      setGeneralError(null);
      setSerialFeedback(null);
      setActiveTab('all');
    }
  }, [order, isOpen]);

  // Tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Checagem das permissões de acordo com o papel do usuário (login)
  const userRole = (currentUser?.role || 'TECNICO').toUpperCase();
  const isAdminOrManager = userRole === 'ADMIN' || userRole === 'GERENTE';
  const isTechnician = userRole === 'TECNICO';
  const isAttendant = userRole === 'ATENDENTE';

  let hasCustomAll = false;
  try {
    const perms = JSON.parse(currentUser?.permissions || '[]');
    if (perms.includes('ALL') || perms.includes('OS_ALL')) {
      hasCustomAll = true;
    }
  } catch {}

  // O usuário solicitou explicitamente:
  // "Foto 2 preciso que todos os usuários que tenham acesso a essa aplicação possa editar todos os campos desse menu."
  const canEditCore = true;
  const canEditTechnical = true;
  const canEditCustomerDesk = true;
  const canEditOperational = true;

  // Cálculos dinâmicos de SLA e TMF para exibição imediata
  const liveTmf = useMemo(() => {
    return computeTmfDays(entryDate, repairDate || null);
  }, [entryDate, repairDate]);

  const liveAlerts = useMemo(() => {
    if (!order) return null;
    return getOsSlaAlerts({
      ...order,
      entryDate,
      diagnosisDate: diagnosisDate || null,
      emailSentDate: emailSentDate || null,
      emailReceivedDate: emailReceivedDate || null,
      partsOrderDate: partsOrderDate || null,
      partsInvoiceDate: partsInvoiceDate || null,
      partsArrivalDate: partsArrivalDate || null,
      repairDate: repairDate || null,
      notice1Date: notice1Date || null,
      notice2Date: notice2Date || null,
      notice3Date: notice3Date || null,
      systemExitDate: systemExitDate || null,
      exitDate: exitDate || null,
    });
  }, [
    order,
    entryDate,
    diagnosisDate,
    emailSentDate,
    emailReceivedDate,
    partsOrderDate,
    partsInvoiceDate,
    partsArrivalDate,
    repairDate,
    notice1Date,
    notice2Date,
    notice3Date,
    systemExitDate,
    exitDate,
  ]);

  // Checagem automática dos 90 dias quando o usuário altera o número de série
  const handleCheckSerial90Days = async () => {
    if (!serialNumber.trim() || serialNumber.trim().length < 4) {
      setSerialFeedback(null);
      return;
    }

    try {
      setCheckingSerial(true);
      const res = await fetch(
        `/api/work-orders?check_serial=${encodeURIComponent(serialNumber.trim())}&entry_date=${entryDate}`
      );
      const data = await res.json();
      if (data.isEligibleRecurrent) {
        setIsRecurrent(true);
        setSerialFeedback({ isEligible: true, message: data.message });
      } else {
        setIsRecurrent(false);
        setSerialFeedback({ isEligible: false, message: data.message });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingSerial(false);
    }
  };

  if (!isOpen || !order) return null;

  const selectedModel = models.find((m) => m.id === modelId) || order.model;
  const currentSituation = situations.find((s) => s.id === situationId) || order.situation;

  // Submissão das alterações
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const errors: Record<string, string> = {};

    // Críticas de campos obrigatórios
    if (canEditCore) {
      if (!osNumber.trim()) errors.osNumber = 'O Número de O.S. é obrigatório.';
      if (!modelId) errors.modelId = 'O Modelo do equipamento é obrigatório.';
      if (!serialNumber.trim()) errors.serialNumber = 'O Número de Série é obrigatório.';
      if (!entryDate) errors.entryDate = 'A Data de Entrada é obrigatória.';
    }
    if (!situationId) errors.situationId = 'A Situação da O.S. é obrigatória.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGeneralError('Por favor, corrija as críticas nos campos destacados antes de prosseguir.');
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      // Monta os updates apenas com o que o perfil do usuário pode alterar
      const updates: any = {};

      // 1. Campos fundamentais (somente se permitido)
      if (canEditCore) {
        if (osNumber.trim() !== order.osNumber) updates.osNumber = osNumber.trim();
        if (modelId !== order.modelId) updates.modelId = modelId;
        if (serialNumber.trim() !== order.serialNumber) updates.serialNumber = serialNumber.trim();
        if (entryDate !== toInputDate(order.entryDate)) updates.entryDate = entryDate;
        if (isRecurrent !== Boolean(order.isRecurrent)) updates.isRecurrent = isRecurrent;
      }

      // 2. Campos operacionais (situação, local, técnico, notas)
      if (situationId !== order.situationId) updates.situationId = situationId;
      if (locationId !== (order.locationId || '')) updates.locationId = locationId || null;
      if (technicianId !== (order.technicianId || '')) updates.technicianId = technicianId || null;
      if (notes !== (order.notes || '')) updates.notes = notes;

      // 3. Campos técnicos / oficina
      if (canEditTechnical) {
        if (diagnosisDate !== toInputDate(order.diagnosisDate)) {
          updates.diagnosisDate = diagnosisDate || null;
        }
        if (partsOrderDate !== toInputDate(order.partsOrderDate)) {
          updates.partsOrderDate = partsOrderDate || null;
        }
        if (partsInvoiceDate !== toInputDate(order.partsInvoiceDate)) {
          updates.partsInvoiceDate = partsInvoiceDate || null;
        }
        if (Number(partsHeadQty) !== (order.partsHeadQty ?? 0)) {
          updates.partsHeadQty = Number(partsHeadQty);
        }
        if (Number(partsTotalQty) !== (order.partsTotalQty ?? 0)) {
          updates.partsTotalQty = Number(partsTotalQty);
        }
        if (partsArrivalDate !== toInputDate(order.partsArrivalDate)) {
          updates.partsArrivalDate = partsArrivalDate || null;
        }
        if (Boolean(partsChangeInk) !== Boolean(order.partsChangeInk)) {
          updates.partsChangeInk = Boolean(partsChangeInk);
        }
        if (repairDate !== toInputDate(order.repairDate)) {
          updates.repairDate = repairDate || null;
        }
      }

      // 4. Campos de atendimento / avisos / saídas
      if (canEditCustomerDesk) {
        if (emailSentDate !== toInputDate(order.emailSentDate)) {
          updates.emailSentDate = emailSentDate || null;
        }
        if (emailReceivedDate !== toInputDate(order.emailReceivedDate)) {
          updates.emailReceivedDate = emailReceivedDate || null;
        }
        if (notice1Date !== toInputDate(order.notice1Date)) {
          updates.notice1Date = notice1Date || null;
        }
        if (notice2Date !== toInputDate(order.notice2Date)) {
          updates.notice2Date = notice2Date || null;
        }
        if (notice3Date !== toInputDate(order.notice3Date)) {
          updates.notice3Date = notice3Date || null;
        }
        if (systemExitDate !== toInputDate(order.systemExitDate)) {
          updates.systemExitDate = systemExitDate || null;
        }
        if (exitDate !== toInputDate(order.exitDate)) {
          updates.exitDate = exitDate || null;
        }
      }

      // Se nenhum campo foi alterado
      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      const res = await fetch('/api/work-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          userId: currentUser?.id,
          updates,
          userAuthor: currentUser?.name || 'Administrador',
          userEmail: currentUser?.email || 'admin@epson.com.br',
          userRole: currentUser?.role || 'ADMIN',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGeneralError(data.error || 'Erro ao atualizar dados da O.S.');
        return;
      }

      // Sucesso: atualiza lista e fecha
      onSuccess();
      onClose();
    } catch (err: any) {
      setGeneralError('Falha de conexão com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* ============================================================== */}
        {/* CABEÇALHO DO MODAL                                            */}
        {/* ============================================================== */}
        <div className="bg-[#002B49] text-white px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold text-base border border-white/20">
              <Edit3 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold tracking-tight">Ordem de Serviço #{order.osNumber}</h2>
                <span
                  style={{ backgroundColor: currentSituation?.color || '#334155' }}
                  className="px-2 py-0.5 rounded text-[11px] font-bold text-slate-900 shadow-xs"
                >
                  {currentSituation?.name || 'Em Andamento'}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-900/60 text-cyan-200 border border-cyan-700/60">
                  TMF: {liveTmf} {liveTmf === 1 ? 'dia' : 'dias'}
                </span>
              </div>
              <p className="text-xs text-cyan-200/90 flex items-center gap-2 mt-0.5">
                <span>
                  Equipamento: <strong>{selectedModel?.name}</strong> ({selectedModel?.type?.name || 'Epson'})
                </span>
                <span>•</span>
                <span>
                  Série: <strong className="font-mono">{serialNumber || order.serialNumber}</strong>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tag de identificação do Login e Permissões */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-cyan-300 font-semibold uppercase tracking-wider">
                Perfil de Acesso
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Edição Total ({userRole})
              </span>
            </div>

            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
              title="Fechar janela (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* BARRA DE NAVEGAÇÃO DE ABAS RÁPIDAS                             */}
        {/* ============================================================== */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2 flex items-center gap-2 overflow-x-auto shrink-0 select-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-[#002B49] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Todos os Campos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cad')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'cad'
                ? 'bg-[#002B49] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
            1. Equipamento & Cadastro
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tech')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'tech'
                ? 'bg-[#002B49] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-amber-600" />
            2. Oficina, Peças & Conserto
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comm')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'comm'
                ? 'bg-[#002B49] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            3. Atendimento, Avisos & Saídas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'notes'
                ? 'bg-[#002B49] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            4. Laudo & Observações
          </button>
        </div>

        {/* ============================================================== */}
        {/* CORPO DO FORMULÁRIO (SCROLLÁVEL)                              */}
        {/* ============================================================== */}
        <form onSubmit={handleSubmit} className="p-5 md:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Alerta de Crítica Geral */}
          {generalError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Atenção!</p>
                <p>{generalError}</p>
              </div>
            </div>
          )}

          {/* Faixa de Alerta SLA da O.S. (se houver estouro ou prazo crítico) */}
          {liveAlerts && (liveAlerts.isOsNumberAlert || liveAlerts.isFullRowAlert) && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-lg flex items-center justify-between text-xs text-rose-900 font-medium">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  {liveAlerts.fullRowReason === '27D'
                    ? 'Atenção Crítica: Mais de 27 dias decorridos da entrada sem baixa/saída do sistema!'
                    : liveAlerts.fullRowReason === '8D'
                    ? 'Estouro Crítico: Mais de 8 dias decorridos da entrada sem a finalização do conserto!'
                    : 'Atenção ao SLA: Esta ordem possui marcos em atraso conforme os prazos de atendimento Epson.'}
                </span>
              </div>
              <span className="font-extrabold px-2 py-0.5 rounded bg-rose-200 text-rose-950 uppercase text-[10px]">
                {liveAlerts.fullRowReason ? `Alerta SLA ${liveAlerts.fullRowReason}` : 'Alerta SLA'}
              </span>
            </div>
          )}

          {/* ============================================================ */}
          {/* SEÇÃO 1: EQUIPAMENTO & CADASTRO                              */}
          {/* ============================================================ */}
          {(activeTab === 'all' || activeTab === 'cad') && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#002B49]" />
                  <h3 className="text-xs font-black text-[#002B49] uppercase tracking-wider">
                    1. Identificação do Equipamento & Cadastro
                  </h3>
                </div>
                {!canEditCore && (
                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 bg-slate-200 px-2 py-0.5 rounded">
                    <Lock className="w-3 h-3 text-slate-500" /> Apenas Leitura (Admin/Gerência)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* 1.1 Número de OS */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Número de O.S. <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={!canEditCore}
                      value={osNumber}
                      onChange={(e) => {
                        setOsNumber(e.target.value);
                        if (fieldErrors.osNumber) setFieldErrors({ ...fieldErrors, osNumber: '' });
                      }}
                      className={`w-full px-3 py-2 text-xs rounded-lg border font-mono font-bold transition focus:outline-none ${
                        !canEditCore
                          ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                          : fieldErrors.osNumber
                          ? 'border-red-500 bg-red-50/50'
                          : 'border-slate-300 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600'
                      }`}
                    />
                    {!canEditCore && (
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                    )}
                  </div>
                  {fieldErrors.osNumber && (
                    <p className="text-[10px] text-red-600 mt-0.5">{fieldErrors.osNumber}</p>
                  )}
                </div>

                {/* 1.2 Modelo */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Modelo do Equipamento <span className="text-red-500">*</span>
                  </label>
                  <select
                    disabled={!canEditCore}
                    value={modelId}
                    onChange={(e) => {
                      setModelId(e.target.value);
                      if (fieldErrors.modelId) setFieldErrors({ ...fieldErrors, modelId: '' });
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-lg border bg-white transition focus:outline-none ${
                      !canEditCore
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : fieldErrors.modelId
                        ? 'border-red-500 bg-red-50/50'
                        : 'border-slate-300 focus:border-cyan-600'
                    }`}
                  >
                    <option value="">Selecione o Modelo...</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.type?.name})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.modelId && (
                    <p className="text-[10px] text-red-600 mt-0.5">{fieldErrors.modelId}</p>
                  )}
                </div>

                {/* 1.3 Número de Série */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Número de Série <span className="text-red-500">*</span>
                    </label>
                    {canEditCore && checkingSerial && (
                      <span className="text-[10px] text-cyan-700 flex items-center gap-1 font-semibold">
                        <Loader2 className="w-3 h-3 animate-spin" /> Checando...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={!canEditCore}
                      value={serialNumber}
                      onChange={(e) => {
                        setSerialNumber(e.target.value.toUpperCase());
                        if (fieldErrors.serialNumber) setFieldErrors({ ...fieldErrors, serialNumber: '' });
                      }}
                      onBlur={handleCheckSerial90Days}
                      className={`w-full px-3 py-2 text-xs rounded-lg border font-mono uppercase transition focus:outline-none ${
                        !canEditCore
                          ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                          : fieldErrors.serialNumber
                          ? 'border-red-500 bg-red-50/50'
                          : 'border-slate-300 focus:border-cyan-600'
                      }`}
                    />
                    {!canEditCore && (
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                    )}
                  </div>
                  {fieldErrors.serialNumber && (
                    <p className="text-[10px] text-red-600 mt-0.5">{fieldErrors.serialNumber}</p>
                  )}
                </div>

                {/* 1.4 Data de Entrada */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data de Entrada <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      disabled={!canEditCore}
                      value={entryDate}
                      onChange={(e) => {
                        setEntryDate(e.target.value);
                        if (fieldErrors.entryDate) setFieldErrors({ ...fieldErrors, entryDate: '' });
                      }}
                      className={`w-full px-3 py-1.5 text-xs rounded-lg border font-mono transition focus:outline-none ${
                        !canEditCore
                          ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                          : fieldErrors.entryDate
                          ? 'border-red-500 bg-red-50/50'
                          : 'border-slate-300 focus:border-cyan-600'
                      }`}
                    />
                    {!canEditCore && (
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                    )}
                  </div>
                  {fieldErrors.entryDate && (
                    <p className="text-[10px] text-red-600 mt-0.5">{fieldErrors.entryDate}</p>
                  )}
                </div>
              </div>

              {/* Feedback dos 90 dias de reincidência */}
              {serialFeedback && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    serialFeedback.isEligible
                      ? 'bg-amber-50 border border-amber-200 text-amber-900 font-medium'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}
                >
                  {serialFeedback.isEligible ? (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{serialFeedback.message}</span>
                </div>
              )}

              {/* Linha 2 de Cadastro: Situação, Local, Técnico, Reincidência */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                {/* 1.5 Situação */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Situação Atual <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={situationId}
                    onChange={(e) => {
                      setSituationId(e.target.value);
                      if (fieldErrors.situationId) setFieldErrors({ ...fieldErrors, situationId: '' });
                    }}
                    style={{ backgroundColor: currentSituation?.color || '#ffffff' }}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 focus:outline-none text-slate-900"
                  >
                    {situations.map((s) => (
                      <option key={s.id} value={s.id} style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                        {s.name} {s.isCanceled ? '(Anulada)' : ''}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.situationId && (
                    <p className="text-[10px] text-red-600 mt-0.5">{fieldErrors.situationId}</p>
                  )}
                </div>

                {/* 1.6 Local na Prateleira / Bancada */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Local (Prateleira / Bancada)
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:border-cyan-600"
                  >
                    <option value="">Não definido (-)</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.code} - {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 1.7 Técnico Responsável */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Técnico Responsável
                  </label>
                  <select
                    value={technicianId}
                    onChange={(e) => setTechnicianId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:border-cyan-600"
                  >
                    <option value="">Não atribuído</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 1.8 Reincidência */}
                <div className="flex flex-col justify-end">
                  <label
                    className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                      !canEditCore
                        ? 'bg-slate-100 border-slate-200 cursor-not-allowed'
                        : isRecurrent
                        ? 'bg-amber-50 border-amber-300 cursor-pointer'
                        : 'bg-white border-slate-300 cursor-pointer hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!canEditCore}
                      checked={isRecurrent}
                      onChange={(e) => setIsRecurrent(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">Reincidência (90D)</span>
                      <span className="text-[10px] text-slate-500">
                        {isRecurrent ? 'Marcado como reincidente' : 'Passagem padrão'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SEÇÃO 2: OFICINA, PEÇAS & CONSERTO                           */}
          {/* ============================================================ */}
          {(activeTab === 'all' || activeTab === 'tech') && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                    2. Oficina Técnica, Suprimentos & Conserto
                  </h3>
                </div>
                {!canEditTechnical && (
                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 bg-slate-200 px-2 py-0.5 rounded">
                    <Lock className="w-3 h-3 text-slate-500" /> Apenas Leitura (Técnicos/Admin)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* 2.1 Data de Diagnóstico */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Data de Diagnóstico
                    </label>
                    {liveAlerts?.isDiagnosisAlert && (
                      <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1 rounded">
                        Prazo SLA
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    disabled={!canEditTechnical}
                    value={diagnosisDate}
                    onChange={(e) => setDiagnosisDate(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border font-mono transition focus:outline-none ${
                      !canEditTechnical
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : liveAlerts?.isDiagnosisAlert
                        ? 'border-rose-400 bg-rose-50/60 text-rose-950 font-bold'
                        : 'border-slate-300 focus:border-cyan-600'
                    }`}
                  />
                </div>

                {/* 2.2 Pedido de Peças */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Data do Pedido de Peças
                    </label>
                    {liveAlerts?.isPartsOrderAlert && (
                      <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1 rounded">
                        Alerta SLA
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    disabled={!canEditTechnical}
                    value={partsOrderDate}
                    onChange={(e) => setPartsOrderDate(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border font-mono transition focus:outline-none ${
                      !canEditTechnical
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : liveAlerts?.isPartsOrderAlert
                        ? 'border-rose-400 bg-rose-50/60 text-rose-950'
                        : 'border-slate-300 focus:border-cyan-600'
                    }`}
                  />
                </div>

                {/* 2.3 Faturamento de Peças (Crucial para indicadores Epson) */}
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                    Faturamento de Peças
                  </label>
                  <input
                    type="date"
                    disabled={!canEditTechnical}
                    value={partsInvoiceDate}
                    onChange={(e) => setPartsInvoiceDate(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border font-mono font-bold transition focus:outline-none ${
                      !canEditTechnical
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : 'border-yellow-400 bg-yellow-50/80 text-yellow-900 focus:border-yellow-600'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Define mês do KPI de peças</span>
                </div>

                {/* 2.4 Chegada de Peças */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Chegada das Peças
                    </label>
                    {liveAlerts?.isPartsArrivalAlert && (
                      <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1 rounded">
                        Alerta SLA
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    disabled={!canEditTechnical}
                    value={partsArrivalDate}
                    onChange={(e) => setPartsArrivalDate(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border font-mono transition focus:outline-none ${
                      !canEditTechnical
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : liveAlerts?.isPartsArrivalAlert
                        ? 'border-rose-400 bg-rose-50/60 text-rose-950'
                        : 'border-slate-300 focus:border-cyan-600'
                    }`}
                  />
                </div>
              </div>

              {/* Quantitativo de Peças e Conserto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                {/* 2.5 Qtd Cabeças de Impressão */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Qtd Cabeças (0 a 10)
                  </label>
                  <select
                    disabled={!canEditTechnical}
                    value={partsHeadQty}
                    onChange={(e) => setPartsHeadQty(parseInt(e.target.value, 10))}
                    className={`w-full px-3 py-2 text-xs font-bold rounded-lg border bg-white focus:outline-none ${
                      !canEditTechnical
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : 'border-slate-300 focus:border-cyan-600'
                    }`}
                  >
                    {Array.from({ length: 11 }, (_, i) => (
                      <option key={i} value={i}>
                        {i} {i === 1 ? 'cabeça' : 'cabeças'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2.6 Qtd Total Peças */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Qtd Total Peças (0 a 30)
                  </label>
                  <select
                    disabled={!canEditTechnical}
                    value={partsTotalQty}
                    onChange={(e) => setPartsTotalQty(parseInt(e.target.value, 10))}
                    className={`w-full px-3 py-2 text-xs font-bold rounded-lg border bg-white focus:outline-none ${
                      !canEditTechnical
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : 'border-slate-300 focus:border-cyan-600'
                    }`}
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i} value={i}>
                        {i} {i === 1 ? 'peça' : 'peças'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2.7 Trocar Tinta */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Trocar Tinta?
                  </label>
                  <select
                    disabled={!canEditTechnical}
                    value={partsChangeInk ? 'true' : 'false'}
                    onChange={(e) => setPartsChangeInk(e.target.value === 'true')}
                    className={`w-full px-3 py-2 text-xs font-bold rounded-lg border bg-white focus:outline-none ${
                      !canEditTechnical
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : 'border-slate-300 focus:border-cyan-600'
                    }`}
                  >
                    <option value="false">Não</option>
                    <option value="true">Sim (Trocar)</option>
                  </select>
                </div>

                {/* 2.8 Data do Conserto & TMF */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      Data do Conserto
                    </label>
                    <span className="text-[10px] font-extrabold text-cyan-800 bg-cyan-100 px-1.5 py-0.2 rounded">
                      TMF: {liveTmf}d
                    </span>
                  </div>
                  <input
                    type="date"
                    disabled={!canEditTechnical}
                    value={repairDate}
                    onChange={(e) => setRepairDate(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition focus:outline-none ${
                      !canEditTechnical
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : liveAlerts?.isRepairAlert
                        ? 'border-rose-400 bg-rose-50 text-rose-950'
                        : 'border-emerald-400 bg-emerald-50/50 text-emerald-950 focus:border-emerald-600'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Finaliza o cálculo do TMF</span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SEÇÃO 3: ATENDIMENTO, COMUNICAÇÃO & SAÍDAS                   */}
          {/* ============================================================ */}
          {(activeTab === 'all' || activeTab === 'comm') && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider">
                    3. Atendimento ao Cliente, Avisos & Baixa / Saídas
                  </h3>
                </div>
                {!canEditCustomerDesk && (
                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 bg-slate-200 px-2 py-0.5 rounded">
                    <Lock className="w-3 h-3 text-slate-500" /> Apenas Leitura (Atendentes/Admin)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* 3.1 E-mail Enviado */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      E-mail Enviado
                    </label>
                    {liveAlerts?.isEmailSentAlert && (
                      <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1 rounded">
                        Alerta SLA
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    disabled={!canEditCustomerDesk}
                    value={emailSentDate}
                    onChange={(e) => setEmailSentDate(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border font-mono transition focus:outline-none ${
                      !canEditCustomerDesk
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : liveAlerts?.isEmailSentAlert
                        ? 'border-rose-400 bg-rose-50/60 text-rose-950 font-bold'
                        : 'border-slate-300 focus:border-cyan-600'
                    }`}
                  />
                </div>

                {/* 3.2 E-mail Recebido */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      E-mail Recebido
                    </label>
                    {liveAlerts?.isEmailReceivedAlert && (
                      <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1 rounded">
                        Alerta SLA
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    disabled={!canEditCustomerDesk}
                    value={emailReceivedDate}
                    onChange={(e) => setEmailReceivedDate(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border font-mono transition focus:outline-none ${
                      !canEditCustomerDesk
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : liveAlerts?.isEmailReceivedAlert
                        ? 'border-rose-400 bg-rose-50/60 text-rose-950 font-bold'
                        : 'border-slate-300 focus:border-cyan-600'
                    }`}
                  />
                </div>

                {/* 3.3 1º Aviso ao Cliente */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      1º Aviso (Pronto)
                    </label>
                    {liveAlerts?.isNotice1Alert && (
                      <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1 rounded">
                        Alerta SLA
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    disabled={!canEditCustomerDesk}
                    value={notice1Date}
                    onChange={(e) => setNotice1Date(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border font-mono transition focus:outline-none ${
                      !canEditCustomerDesk
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : liveAlerts?.isNotice1Alert
                        ? 'border-rose-400 bg-rose-50/60 text-rose-950 font-bold'
                        : 'border-slate-300 focus:border-cyan-600'
                    }`}
                  />
                </div>

                {/* 3.4 2º Aviso ao Cliente */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      2º Aviso
                    </label>
                    {liveAlerts?.isNotice2Alert && (
                      <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1 rounded">
                        Alerta SLA
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    disabled={!canEditCustomerDesk}
                    value={notice2Date}
                    onChange={(e) => setNotice2Date(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border font-mono transition focus:outline-none ${
                      !canEditCustomerDesk
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : liveAlerts?.isNotice2Alert
                        ? 'border-rose-400 bg-rose-50/60 text-rose-950 font-bold'
                        : 'border-slate-300 focus:border-cyan-600'
                    }`}
                  />
                </div>
              </div>

              {/* Linha 2 de Atendimento: 3º Aviso, Saída do Sistema (Baixa SAP) e Saída Física */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* 3.5 3º Aviso ao Cliente */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      3º Aviso (Retirada)
                    </label>
                    {liveAlerts?.isNotice3Alert && (
                      <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1 rounded">
                        Alerta SLA
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    disabled={!canEditCustomerDesk}
                    value={notice3Date}
                    onChange={(e) => setNotice3Date(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border font-mono transition focus:outline-none ${
                      !canEditCustomerDesk
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : liveAlerts?.isNotice3Alert
                        ? 'border-rose-400 bg-rose-50/60 text-rose-950 font-bold'
                        : 'border-slate-300 focus:border-cyan-600'
                    }`}
                  />
                </div>

                {/* 3.6 Saída Sistema (Baixa SAP) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                      Saída Sistema (Baixa SAP)
                    </label>
                    {liveAlerts?.isSystemExitAlert && (
                      <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1 rounded">
                        Alerta 27D
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    disabled={!canEditCustomerDesk}
                    value={systemExitDate}
                    onChange={(e) => setSystemExitDate(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition focus:outline-none ${
                      !canEditCustomerDesk
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : liveAlerts?.isSystemExitAlert
                        ? 'border-rose-400 bg-rose-50 text-rose-950'
                        : 'border-blue-400 bg-blue-50/50 text-blue-950 focus:border-blue-600'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Encerramento administrativo da O.S.</span>
                </div>

                {/* 3.7 Saída Física */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Saída Física (Entrega)
                    </label>
                    {liveAlerts?.isExitAlert && (
                      <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1 rounded">
                        Pendente Saída
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    disabled={!canEditCustomerDesk}
                    value={exitDate}
                    onChange={(e) => setExitDate(e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border font-mono transition focus:outline-none ${
                      !canEditCustomerDesk
                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200'
                        : liveAlerts?.isExitAlert
                        ? 'border-rose-400 bg-rose-50/60 text-rose-950 font-bold'
                        : 'border-slate-300 focus:border-cyan-600'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Equipamento entregue ao cliente</span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SEÇÃO 4: COLOCAR NA O.S. (LAUDO & OBSERVAÇÕES)               */}
          {/* ============================================================ */}
          {(activeTab === 'all' || activeTab === 'notes') && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                    4. Colocar na Ordem de Serviço (Laudo Técnico & Observações)
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  Visível em relatórios e no histórico da O.S.
                </span>
              </div>

              <div>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Descreva o defeito diagnosticado, peças substituídas, testes realizados, orientações passadas ao cliente ou observações operacionais..."
                  className="w-full p-3 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 text-slate-800 transition"
                />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* RODAPÉ DO FORMULÁRIO COM AÇÕES                               */}
          {/* ============================================================ */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-[11px] text-slate-500">
              <span>Campos com </span>
              <span className="text-red-500 font-bold">*</span>
              <span> são obrigatórios. Alterações são registradas no Log de Auditoria.</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 text-xs font-bold text-white bg-[#002B49] hover:bg-[#001B30] rounded-lg shadow-sm flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-cyan-400" />
                    Salvar Alterações da O.S.
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
