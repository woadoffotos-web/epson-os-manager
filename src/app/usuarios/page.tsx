'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/app/ClientLayout';
import EditUserModal from '@/components/EditUserModal';
import {
  ShieldCheck,
  History,
  UserPlus,
  Users,
  Search,
  KeyRound,
  CheckCircle,
  Eye,
  Loader2,
  Lock,
  Pencil,
  Trash2,
  ShieldAlert,
} from 'lucide-react';

export default function UsersAndAuditPage() {
  const { currentUser, refreshUsers } = useApp();
  const [subTab, setSubTab] = useState<'usuarios' | 'logs'>('usuarios');

  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Modal de edição de usuário
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Permissão de gerenciamento: ADMIN e GERENTE
  const canManageUsers = currentUser?.role === 'ADMIN' || currentUser?.role === 'GERENTE';

  // Formulário de Novo Usuário
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [newRole, setNewRole] = useState('TECNICO');
  const [newApps, setNewApps] = useState<string[]>(['APP_EPSON_OS']);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const toggleNewApp = (appId: string) => {
    setNewApps((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  // Filtro de Logs
  const [logSearch, setLogSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/auth?action=users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch(`/api/audit-logs?search=${encodeURIComponent(logSearch)}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (subTab === 'usuarios') fetchUsers();
    if (subTab === 'logs') fetchLogs();
  }, [subTab]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers) {
      alert('Acesso negado: Somente administradores e gerentes podem cadastrar novos usuários.');
      return;
    }
    if (!newName.trim() || !newEmail.trim()) return;

    try {
      setCreatingUser(true);
      setUserError(null);

      const basePerms = getDefaultPermissionsForRole(newRole);
      const combinedPermissions = Array.from(new Set([...basePerms, ...newApps]));

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_user',
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          role: newRole,
          permissions: combinedPermissions,
          userAuthor: currentUser?.name || 'Administrador',
          userRole: currentUser?.role || 'ADMIN',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUserError(data.error || 'Erro ao criar usuário');
        return;
      }

      setNewName('');
      setNewEmail('');
      fetchUsers();
      refreshUsers();
    } catch (e: any) {
      setUserError('Falha ao comunicar com o servidor');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!canManageUsers) {
      alert('Acesso negado: Somente administradores e gerentes podem excluir usuários.');
      return;
    }

    if (userId === currentUser?.id) {
      alert('Operação não permitida: Você não pode excluir o seu próprio usuário logado.');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir permanentemente o usuário "${userName}"? Esta ação removerá o acesso ao sistema.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/auth?userId=${userId}&userAuthor=${encodeURIComponent(currentUser?.name || 'Admin')}&userRole=${encodeURIComponent(currentUser?.role || 'ADMIN')}&currentUserId=${currentUser?.id || ''}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao excluir usuário.');
        return;
      }
      fetchUsers();
      refreshUsers();
    } catch (e) {
      console.error(e);
      alert('Falha ao comunicar com o servidor.');
    }
  };

  const getDefaultPermissionsForRole = (role: string) => {
    switch (role) {
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

  const handleToggleUserActive = async (user: any) => {
    if (!canManageUsers) {
      alert('Acesso negado: Somente administradores e gerentes podem alterar o status de usuários.');
      return;
    }
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user',
          userId: user.id,
          active: !user.active,
          userAuthor: currentUser?.name || 'Administrador',
          userRole: currentUser?.role || 'ADMIN',
        }),
      });
      fetchUsers();
      refreshUsers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#002B49] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-600" />
            Controle de Acesso, Usuários e Trilha de Auditoria
          </h2>
          <p className="text-xs text-slate-500">
            Gerencie o cadastro de usuários, grupos/permissões e consulte o histórico de todas as alterações feitas no sistema
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setSubTab('usuarios')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              subTab === 'usuarios' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Usuários & Grupos
          </button>

          <button
            onClick={() => setSubTab('logs')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              subTab === 'logs' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Logs de Auditoria
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: USUÁRIOS E PERMISSÕES                                    */}
      {/* ============================================================== */}
      {subTab === 'usuarios' && (
        <div className="space-y-4">
          {!canManageUsers ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-8 rounded-lg text-center space-y-2 shadow-xs">
              <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto" />
              <h3 className="font-bold text-sm">Acesso Restrito ao Cadastro de Usuários</h3>
              <p className="text-xs text-amber-700 max-w-md mx-auto">
                Somente usuários dos perfis <strong>Administrador</strong> e <strong>Gerência</strong> possuem permissão para cadastrar, editar e excluir contas de usuários no sistema.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Formulário de Novo Usuário */}
              <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
                <h3 className="font-bold text-sm text-[#002B49] mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-cyan-600" /> Cadastrar Novo Usuário
                </h3>

                {userError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-lg mb-3">
                    {userError}
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Nome Completo</label>
                      <input
                        type="text"
                        placeholder="Ex: Roberto Técnico"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-emerald-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">E-mail / Login</label>
                      <input
                        type="email"
                        placeholder="Ex: roberto@infoged.com.br"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-emerald-600 font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Senha Inicial</label>
                      <input
                        type="password"
                        placeholder="Senha"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-emerald-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Grupo / Cargo</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 bg-white"
                      >
                        <option value="ADMIN">Administrador (Total)</option>
                        <option value="GERENTE">Gerente</option>
                        <option value="TECNICO">Técnico</option>
                        <option value="ATENDENTE">Atendente</option>
                      </select>
                    </div>
                  </div>

                  {/* Seleção de Aplicativos Liberados para o Novo Usuário */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-700 uppercase">Liberar Aplicativos:</span>
                      {[
                        { id: 'APP_EPSON_OS', label: 'Epson CSA (O.S.)' },
                        { id: 'APP_VIPZ', label: 'Vipz Infoged (Clube)' },
                        { id: 'APP_ESTOQUE', label: 'Estoque' },
                        { id: 'APP_CHAMADOS', label: 'Chamados TI' },
                        { id: 'APP_GESTAO', label: 'Gestão Central' },
                      ].map((app) => {
                        const isChecked = newApps.includes(app.id);
                        return (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => toggleNewApp(app.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
                              isChecked
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <span>{isChecked ? '✓' : '+'}</span>
                            <span>{app.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="submit"
                      disabled={creatingUser || !newName.trim() || !newEmail.trim()}
                      className="px-5 py-2 bg-[#07241A] text-white text-xs font-bold rounded-lg hover:bg-[#0E3A2B] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {creatingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <UserPlus className="w-3.5 h-3.5" />}
                      Salvar Usuário
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabela de Usuários Cadastrados */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
                  <span>Usuários Registrados no Sistema ({users.length})</span>
                  <span className="text-[11px] text-slate-500 font-normal">Acesso restrito: Administrador e Gerência</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#002B49] text-white font-bold">
                      <tr>
                        <th className="p-3">NOME</th>
                        <th className="p-3">E-MAIL / LOGIN</th>
                        <th className="p-3">GRUPO / CARGO</th>
                        <th className="p-3">APLICATIVOS LIBERADOS</th>
                        <th className="p-3 text-center">STATUS</th>
                        <th className="p-3 text-center">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => {
                        const permList: string[] = JSON.parse(u.permissions || '[]');
                        return (
                          <tr key={u.id} className="hover:bg-slate-50 transition">
                            <td className="p-3 font-bold text-slate-800">{u.name}</td>
                            <td className="p-3 text-slate-600 font-mono">{u.email}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  u.role === 'ADMIN'
                                    ? 'bg-purple-100 text-purple-900'
                                    : u.role === 'GERENTE'
                                    ? 'bg-blue-100 text-blue-900'
                                    : u.role === 'TECNICO'
                                    ? 'bg-cyan-100 text-cyan-900'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 text-[11px]">
                              {permList.includes('ALL') || u.role === 'ADMIN' ? (
                                <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-300 inline-block text-[10px]">
                                  Acesso Total a Todos os Apps
                                </span>
                              ) : (
                                <div className="flex gap-1.5 flex-wrap">
                                  {permList.filter((p: string) => p.startsWith('APP_')).map((p: string) => {
                                    const appLabels: Record<string, string> = {
                                      APP_EPSON_OS: 'Epson CSA',
                                      APP_VIPZ: 'Vipz Infoged',
                                      APP_ESTOQUE: 'Estoque',
                                      APP_CHAMADOS: 'Chamados TI',
                                      APP_GESTAO: 'Gestão Central',
                                    };
                                    return (
                                      <span
                                        key={p}
                                        className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-bold text-[10px]"
                                      >
                                        {appLabels[p] || p}
                                      </span>
                                    );
                                  })}
                                  {!permList.some((p: string) => p.startsWith('APP_')) && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-200 rounded font-bold text-[10px]">
                                      Epson CSA
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {u.active ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  Ativo
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                  Inativo
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingUser(u)}
                                  className="p-1.5 text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 rounded transition"
                                  title={`Editar usuário ${u.name}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  disabled={u.id === currentUser?.id}
                                  className={`p-1.5 rounded transition ${
                                    u.id === currentUser?.id
                                      ? 'text-slate-300 cursor-not-allowed'
                                      : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  }`}
                                  title={u.id === currentUser?.id ? 'Não é possível excluir o próprio usuário logado' : `Excluir usuário ${u.name}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserActive(u)}
                                  className="text-[11px] text-slate-500 hover:text-cyan-700 underline font-semibold ml-1"
                                >
                                  {u.active ? 'Desativar' : 'Ativar'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: LOGS DE AUDITORIA                                       */}
      {/* ============================================================== */}
      {subTab === 'logs' && (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-[#002B49]">Histórico e Trilha de Auditoria (Audit Log)</h3>
              <p className="text-xs text-slate-500">
                Registro detalhado de cada inclusão, alteração ou exclusão feita por qualquer usuário no sistema
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por usuário, ação ou O.S...."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 w-64 focus:outline-none"
                />
              </div>
              <button
                onClick={fetchLogs}
                className="px-3 py-1.5 bg-[#002B49] text-white text-xs font-bold rounded hover:bg-[#001B30]"
              >
                Buscar
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#002B49] text-white font-bold">
                <tr>
                  <th className="p-2.5">DATA / HORA</th>
                  <th className="p-2.5">USUÁRIO</th>
                  <th className="p-2.5 text-center">AÇÃO</th>
                  <th className="p-2.5">ENTIDADE</th>
                  <th className="p-2.5">DETALHES DA MODIFICAÇÃO</th>
                  <th className="p-2.5 text-center">VER DETALHES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      Nenhum registro de log encontrado.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-2.5 font-bold text-slate-800 whitespace-nowrap">
                        {log.userName}
                        {log.userEmail && <span className="text-[10px] text-slate-400 block font-normal">{log.userEmail}</span>}
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action === 'UPDATE'
                              ? 'bg-blue-100 text-blue-800'
                              : log.action === 'DELETE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-2.5 font-semibold text-slate-700">{log.entity}</td>
                      <td className="p-2.5 text-slate-600">{log.details}</td>
                      <td className="p-2.5 text-center">
                        {(log.oldValues || log.newValues) && (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1 rounded text-cyan-700 hover:bg-cyan-50"
                            title="Ver dados anteriores e novos"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modal de Detalhes do Log (Antes vs Depois) */}
          {selectedLog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h4 className="font-bold text-sm text-[#002B49]">
                    Detalhes do Log #{selectedLog.id.slice(0, 8)}
                  </h4>
                  <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-700">
                    ✕
                  </button>
                </div>

                <div className="text-xs space-y-1">
                  <p><strong>Usuário:</strong> {selectedLog.userName} ({selectedLog.userEmail})</p>
                  <p><strong>Ação:</strong> {selectedLog.action} em {selectedLog.entity}</p>
                  <p><strong>Data/Hora:</strong> {new Date(selectedLog.createdAt).toLocaleString('pt-BR')}</p>
                  <p><strong>Descrição:</strong> {selectedLog.details}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-red-50/50 rounded border border-red-200">
                    <span className="text-[11px] font-bold text-red-800 block mb-1">Dados Anteriores (Before):</span>
                    <pre className="text-[10px] text-slate-700 font-mono overflow-auto max-h-48 whitespace-pre-wrap">
                      {selectedLog.oldValues
                        ? JSON.stringify(JSON.parse(selectedLog.oldValues), null, 2)
                        : '(Nenhum valor anterior)'}
                    </pre>
                  </div>

                  <div className="p-3 bg-emerald-50/50 rounded border border-emerald-200">
                    <span className="text-[11px] font-bold text-emerald-800 block mb-1">Novos Dados (After):</span>
                    <pre className="text-[10px] text-slate-700 font-mono overflow-auto max-h-48 whitespace-pre-wrap">
                      {selectedLog.newValues
                        ? JSON.stringify(JSON.parse(selectedLog.newValues), null, 2)
                        : '(Nenhum novo valor)'}
                    </pre>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold text-slate-700"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pop-up Modal de Editar Usuário */}
      <EditUserModal
        isOpen={Boolean(editingUser)}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={() => {
          fetchUsers();
          refreshUsers();
        }}
        currentUser={currentUser}
      />
    </div>
  );
}
