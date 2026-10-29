'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, Edit3, ShieldAlert, Layers, CheckSquare, Square } from 'lucide-react';

interface EditUserModalProps {
  isOpen: boolean;
  user: any | null;
  onClose: () => void;
  onSuccess: () => void;
  currentUser?: any;
}

const AVAILABLE_APPS = [
  { id: 'APP_EPSON_OS', label: 'Epson CSA - Controle de O.S. & SLA', description: 'Acesso às ordens de serviço, manômetros e relatórios Epson.' },
  { id: 'APP_VIPZ', label: 'Vipz Infoged - Clube de Benefícios & Fidelidade', description: 'Consulta de clientes, extrato de pontos, confirmação de vendas e resgate de prêmios.' },
  { id: 'APP_ESTOQUE', label: 'Pedido de Produtos & Central de Cotações', description: 'Giro de vendas, limites de estoque mínimo/máximo e montagem de cotações.' },
  { id: 'APP_OUTSOURCING', label: 'Outsourcing de Impressão - Gestão de Locações', description: 'Contratos, apuração mensal de contadores, cálculo de franquias e trocas de máquinas.' },
  { id: 'APP_CHAMADOS', label: 'Chamados & Suporte TI', description: 'Central de tickets de suporte técnico e atendimento.' },
  { id: 'APP_GESTAO', label: 'Gestão Corporativa & Auditoria', description: 'Gerenciamento de usuários, permissões e auditoria global.', adminOnly: true },
];

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
  const [selectedApps, setSelectedApps] = useState<string[]>(['APP_EPSON_OS']);

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

      // Carregar aplicativos permitidos a partir do campo permissions
      try {
        const perms: string[] = JSON.parse(user.permissions || '[]');
        const appPerms = perms.filter((p) => p.startsWith('APP_'));
        if (appPerms.length > 0) {
          setSelectedApps(appPerms);
        } else {
          // Usuário legado: concede acesso à Epson por padrão
          const defaultApps = ['APP_EPSON_OS'];
          if (user.role === 'ADMIN' || user.role === 'GERENTE') {
            defaultApps.push('APP_GESTAO');
          }
          setSelectedApps(defaultApps);
        }
      } catch {
        setSelectedApps(['APP_EPSON_OS']);
      }
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

  const toggleApp = (appId: string) => {
    setSelectedApps((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

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
    if (selectedApps.length === 0) {
      setError('Selecione pelo menos um aplicativo para o usuário ter acesso.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Unir as permissões de papel com os aplicativos selecionados
      const basePerms = getDefaultPermissionsForRole(role);
      const combinedPermissions = Array.from(new Set([...basePerms, ...selectedApps]));

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user',
          userId: user.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          permissions: combinedPermissions,
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="bg-[#07241A] text-white px-6 py-4 flex items-center justify-between border-b border-emerald-900/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center font-bold text-sm border border-emerald-600/40">
              <Edit3 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold">Editar Usuário & Permissões</h2>
              <p className="text-xs text-emerald-300">
                Acesso unificado aos aplicativos INFOGED ({user.name})
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

        {/* Formulário com Scroll Interno se necessário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start gap-3 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Atenção!</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              placeholder="Ex: João da Silva"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              E-mail / Login <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono"
              placeholder="Ex: joao@infoged.com.br"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Grupo / Cargo <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-emerald-600"
              >
                <option value="ADMIN">Administrador (Total)</option>
                <option value="GERENTE">Gerente</option>
                <option value="TECNICO">Técnico</option>
                <option value="ATENDENTE">Atendente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status da Conta
              </label>
              <select
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
                className={`w-full px-3 py-2 text-sm font-bold rounded-xl border focus:outline-none ${
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

          {/* ============================================================== */}
          {/* SELEÇÃO DE APLICATIVOS / APIS AUTORIZADAS                       */}
          {/* ============================================================== */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold text-[#07241A] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Aplicativos Liberados para este Usuário <span className="text-red-500">*</span></span>
            </label>
            <p className="text-[11px] text-slate-500 mb-2.5">
              Marque quais aplicações aparecerão no Hub do colaborador:
            </p>

            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {AVAILABLE_APPS.map((app) => {
                const isSelected = selectedApps.includes(app.id);
                return (
                  <div
                    key={app.id}
                    onClick={() => toggleApp(app.id)}
                    className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-emerald-50/80 border border-emerald-300 text-emerald-950'
                        : 'hover:bg-slate-100 border border-transparent text-slate-600'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="text-xs">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{app.label}</span>
                        {app.adminOnly && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold">
                            Gestão
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        {app.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nova Senha (Opcional)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deixe em branco para manter a senha atual"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Caso o usuário esteja bloqueado por tentativas falhas, salvar as alterações desbloqueará a conta automaticamente.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-[#07241A] hover:bg-[#0E3A2B] text-white rounded-xl shadow transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
