'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, Edit3, ShieldAlert } from 'lucide-react';

interface EditUserModalProps {
  isOpen: boolean;
  user: any | null;
  onClose: () => void;
  onSuccess: () => void;
  currentUser?: any;
}

export default function EditUserModal({
  isOpen,
  user,
  onClose,
  onSuccess,
  currentUser,
}: EditUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('TECNICO');
  const [active, setActive] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPassword('');
      setRole(user.role || 'TECNICO');
      setActive(user.active !== undefined ? user.active : true);
      setError(null);
    }
  }, [user, isOpen]);

  // Tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const getDefaultPermissionsForRole = (r: string) => {
    switch (r) {
      case 'ADMIN':
        return ['ALL'];
      case 'GERENTE':
        return ['DASHBOARD_VIEW', 'OS_ALL', 'COURSES_ALL', 'MANAGEMENT_ALL', 'AUDIT_VIEW'];
      case 'TECNICO':
        return ['DASHBOARD_VIEW', 'OS_EDIT', 'COURSES_VIEW'];
      case 'ATENDENTE':
        return ['OS_CREATE', 'OS_SEARCH'];
      default:
        return ['DASHBOARD_VIEW'];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome completo é obrigatório.');
      return;
    }
    if (!email.trim()) {
      setError('O e-mail / login é obrigatório.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user',
          userId: user.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          permissions: getDefaultPermissionsForRole(role),
          password: password.trim() ? password.trim() : undefined,
          active,
          userAuthor: currentUser?.name || 'Administrador',
          userRole: currentUser?.role || 'ADMIN',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao atualizar dados do usuário.');
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Cabeçalho */}
        <div className="bg-[#002B49] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-bold text-sm">
              <Edit3 className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Editar Usuário</h2>
              <p className="text-xs text-cyan-200">
                Acesso restrito a Administradores e Gerência ({user.name})
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
              Nome Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
              placeholder="Ex: João da Silva"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              E-mail / Login <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 font-mono"
              placeholder="Ex: joao@csa.com.br"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Grupo / Cargo <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-cyan-600"
              >
                <option value="ADMIN">Administrador (Total)</option>
                <option value="GERENTE">Gerente CSA</option>
                <option value="TECNICO">Técnico Oficina</option>
                <option value="ATENDENTE">Atendente Recepção</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Status da Conta
              </label>
              <select
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
                className={`w-full px-3 py-2 text-sm font-semibold rounded-lg border focus:outline-none ${
                  active
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-rose-300 bg-rose-50 text-rose-800'
                }`}
              >
                <option value="true">Ativo (Acesso Liberado)</option>
                <option value="false">Inativo (Bloqueado)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nova Senha (Opcional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deixe em branco para manter a senha atual"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-cyan-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Só preencha se desejar redefinir a senha do usuário.
            </p>
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
