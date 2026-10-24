'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, Tag } from 'lucide-react';

interface EditSituationModalProps {
  isOpen: boolean;
  situation: any | null;
  onClose: () => void;
  onSuccess: () => void;
  currentUser?: any;
}

export default function EditSituationModal({
  isOpen,
  situation,
  onClose,
  onSuccess,
  currentUser,
}: EditSituationModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#BAE6FD');
  const [isCanceled, setIsCanceled] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (situation) {
      setName(situation.name || '');
      setColor(situation.color || '#BAE6FD');
      setIsCanceled(Boolean(situation.isCanceled));
      setError(null);
    }
  }, [situation, isOpen]);

  // Tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !situation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome da situação é obrigatório.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'situation',
          data: {
            id: situation.id,
            name: name.trim(),
            color: color || '#e2e8f0',
            isCanceled,
          },
          userAuthor: currentUser?.name || 'Administrador',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao atualizar situação.');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError('Falha de conexão com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        {/* Cabeçalho */}
        <div className="bg-[#002B49] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-bold text-sm">
              <Tag className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Editar Situação de O.S.</h2>
              <p className="text-xs text-cyan-200">Altere o nome e a cor de identificação visual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-md hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Atenção!</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nome da Situação <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
              placeholder="Ex: Em Diagnóstico"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Cor de Identificação Visual
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-10 rounded border border-slate-300 p-1 cursor-pointer bg-white"
                title="Escolha a cor da etiqueta"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-28 px-3 py-2 text-sm font-mono uppercase rounded-lg border border-slate-300 focus:outline-none focus:border-cyan-600"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Pré-visualização da Etiqueta */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
              Pré-visualização:
            </span>
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: color || '#e2e8f0' }}
                className="px-3 py-1 rounded text-xs font-bold text-slate-900 shadow-2xs inline-block"
              >
                {name || 'Nome da Situação'}
              </span>
              {isCanceled && (
                <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded">
                  ⚠️ Anulada (Não pontua)
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
              <input
                type="checkbox"
                checked={isCanceled}
                onChange={(e) => setIsCanceled(e.target.checked)}
                className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                Situação Anulada (Ignora SLA e exclui do cálculo de métricas)
              </span>
            </label>
          </div>

          {/* Rodapé com Botões */}
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
