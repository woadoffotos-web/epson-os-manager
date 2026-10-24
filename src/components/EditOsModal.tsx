'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, Loader2, Edit3 } from 'lucide-react';

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
  const [osNumber, setOsNumber] = useState('');
  const [modelId, setModelId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [situationId, setSituationId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [technicianId, setTechnicianId] = useState('');

  // Estados de crítica e validação
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estado de checagem dos 90 dias para reincidência
  const [checkingSerial, setCheckingSerial] = useState(false);
  const [serialFeedback, setSerialFeedback] = useState<{
    isEligible: boolean;
    message: string;
  } | null>(null);

  // Inicializar dados do formulário a partir da O.S. selecionada
  useEffect(() => {
    if (order) {
      setOsNumber(order.osNumber || '');
      setModelId(order.modelId || '');
      setSerialNumber(order.serialNumber || '');
      setSituationId(order.situationId || '');
      setLocationId(order.locationId || '');
      setEntryDate(
        order.entryDate ? new Date(order.entryDate).toISOString().split('T')[0] : ''
      );
      setIsRecurrent(Boolean(order.isRecurrent));
      setTechnicianId(order.technicianId || '');
      setFieldErrors({});
      setGeneralError(null);
      setSerialFeedback(null);
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

  // Checagem automática dos 90 dias quando o usuário altera o número de série
  const handleSerialBlur = async () => {
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

  const selectedModel = models.find((m) => m.id === modelId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const errors: Record<string, string> = {};

    // Críticas de campos obrigatórios
    if (!osNumber.trim()) errors.osNumber = 'O Número de O.S. é obrigatório.';
    if (!modelId) errors.modelId = 'O Modelo do equipamento é obrigatório.';
    if (!serialNumber.trim()) errors.serialNumber = 'O Número de Série é obrigatório.';
    if (!situationId) errors.situationId = 'A Situação é obrigatória.';
    if (!entryDate) errors.entryDate = 'A Data de Entrada é obrigatória.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGeneralError('Por favor, corrija as críticas nos campos destacados antes de prosseguir.');
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/work-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          userId: currentUser?.id,
          updates: {
            osNumber: osNumber.trim(),
            modelId,
            serialNumber: serialNumber.trim(),
            situationId,
            locationId: locationId || null,
            entryDate,
            isRecurrent,
            technicianId: technicianId || null,
          },
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

      // Sucesso
      onSuccess();
      onClose();
    } catch (err: any) {
      setGeneralError('Falha de conexão com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
        {/* Cabeçalho do Modal */}
        <div className="bg-[#002B49] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-bold text-sm">
              <Edit3 className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Editar Dados de Cadastro da O.S.</h2>
              <p className="text-xs text-cyan-200">
                Alteração restrita aos perfis Administrador e Gerência ({order.osNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-md hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com Críticas */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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

          {/* Linha 1: Número de OS e Modelo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Número de O.S. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={osNumber}
                onChange={(e) => {
                  setOsNumber(e.target.value);
                  if (fieldErrors.osNumber) setFieldErrors({ ...fieldErrors, osNumber: '' });
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition ${
                  fieldErrors.osNumber
                    ? 'border-red-500 bg-red-50/50 focus:border-red-500'
                    : 'border-slate-300 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600'
                }`}
              />
              {fieldErrors.osNumber && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.osNumber}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Modelo <span className="text-red-500">*</span>
                </label>
                {selectedModel && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Tipo: {selectedModel.type?.name}
                  </span>
                )}
              </div>
              <select
                value={modelId}
                onChange={(e) => {
                  setModelId(e.target.value);
                  if (fieldErrors.modelId) setFieldErrors({ ...fieldErrors, modelId: '' });
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none transition ${
                  fieldErrors.modelId
                    ? 'border-red-500 bg-red-50/50 focus:border-red-500'
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
                <p className="text-xs text-red-600 mt-1">{fieldErrors.modelId}</p>
              )}
            </div>
          </div>

          {/* Linha 2: Número de Série e Situação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Número de Série <span className="text-red-500">*</span>
                </label>
                {checkingSerial && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Verificando 90D...
                  </span>
                )}
              </div>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => {
                  setSerialNumber(e.target.value.toUpperCase());
                  if (fieldErrors.serialNumber) setFieldErrors({ ...fieldErrors, serialNumber: '' });
                }}
                onBlur={handleSerialBlur}
                className={`w-full px-3 py-2 text-sm rounded-lg border font-mono uppercase focus:outline-none transition ${
                  fieldErrors.serialNumber
                    ? 'border-red-500 bg-red-50/50 focus:border-red-500'
                    : 'border-slate-300 focus:border-cyan-600'
                }`}
              />
              {fieldErrors.serialNumber && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.serialNumber}</p>
              )}

              {/* Feedback dos 90 Dias */}
              {serialFeedback && (
                <div
                  className={`mt-2 p-2 rounded text-xs flex items-center gap-2 ${
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Situação <span className="text-red-500">*</span>
              </label>
              <select
                value={situationId}
                onChange={(e) => {
                  setSituationId(e.target.value);
                  if (fieldErrors.situationId) setFieldErrors({ ...fieldErrors, situationId: '' });
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none transition ${
                  fieldErrors.situationId
                    ? 'border-red-500 bg-red-50/50 focus:border-red-500'
                    : 'border-slate-300 focus:border-cyan-600'
                }`}
              >
                {situations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isCanceled ? '(Anulada)' : ''}
                  </option>
                ))}
              </select>
              {fieldErrors.situationId && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.situationId}</p>
              )}
            </div>
          </div>

          {/* Linha 3: Local e Técnico Responsável */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Local (Prateleira / Bancada)
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-cyan-600"
              >
                <option value="">Não definido</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Técnico Responsável
              </label>
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-cyan-600"
              >
                <option value="">Não atribuído</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 4: Data de Entrada e Reincidência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Data de Entrada <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => {
                  setEntryDate(e.target.value);
                  if (fieldErrors.entryDate) setFieldErrors({ ...fieldErrors, entryDate: '' });
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none transition ${
                  fieldErrors.entryDate
                    ? 'border-red-500 bg-red-50/50 focus:border-red-500'
                    : 'border-slate-300 focus:border-cyan-600'
                }`}
              />
              {fieldErrors.entryDate && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.entryDate}</p>
              )}
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={isRecurrent}
                  onChange={(e) => setIsRecurrent(e.target.checked)}
                  className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Marcar como Reincidência (Retorno $\le$ 90 dias)
                </span>
              </label>
            </div>
          </div>

          {/* Rodapé do Modal com Botões */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-bold text-white bg-[#002B49] hover:bg-[#001B30] rounded-lg shadow-sm flex items-center gap-2 transition disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
