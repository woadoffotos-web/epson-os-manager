'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/app/ClientLayout';
import EditSituationModal from '@/components/EditSituationModal';
import EditUserModal from '@/components/EditUserModal';
import {
  Settings,
  Tag,
  MapPin,
  Printer,
  Award,
  Plus,
  Trash2,
  Edit2,
  Pencil,
  Check,
  Loader2,
  Save,
  Users,
  UserPlus,
  ShieldAlert,
} from 'lucide-react';

export default function ManagementPage() {
  const { currentUser, refreshUsers } = useApp();
  const [activeTab, setActiveTab] = useState<'situacoes' | 'locais' | 'modelos' | 'auditoria' | 'usuarios'>('situacoes');

  const [situations, setSituations] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de edição de situação
  const [editingSituation, setEditingSituation] = useState<any | null>(null);

  // Modal de edição de usuário
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Formulário de novo usuário
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('123456');
  const [newUserRole, setNewUserRole] = useState('TECNICO');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const canManageUsers = currentUser?.role === 'ADMIN' || currentUser?.role === 'GERENTE';

  // Forms states
  const [newSitName, setNewSitName] = useState('');
  const [newSitColor, setNewSitColor] = useState('#BAE6FD');
  const [newSitIsCanceled, setNewSitIsCanceled] = useState(false);

  const [newLocCode, setNewLocCode] = useState('');

  const [newModelName, setNewModelName] = useState('');
  const [newModelTypeId, setNewModelTypeId] = useState('');

  const [auditFy, setAuditFy] = useState(2026);
  const [auditScore, setAuditScore] = useState(90.1);
  const [savingAudit, setSavingAudit] = useState(false);
  const [auditSavedMessage, setAuditSavedMessage] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/management');
      const data = await res.json();
      setSituations(data.situations || []);
      setLocations(data.locations || []);
      setModels(data.models || []);
      setTypes(data.types || []);
      setAudits(data.audits || []);

      if (data.types?.length > 0 && !newModelTypeId) {
        setNewModelTypeId(data.types[0].id);
      }
      if (data.audits?.length > 0) {
        const currentAudit = data.audits.find((a: any) => a.fiscalYear === auditFy);
        if (currentAudit) setAuditScore(currentAudit.score);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth?action=users');
      const data = await res.json();
      setUsersList(data.users || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUsers();
  }, []);

  // 1. Criar Situação
  const handleCreateSituation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSitName.trim()) return;

    try {
      const res = await fetch('/api/management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'situation',
          data: { name: newSitName.trim(), color: newSitColor, isCanceled: newSitIsCanceled },
          userAuthor: currentUser?.name || 'Administrador',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao criar situação.');
        return;
      }
      setNewSitName('');
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Excluir Situação
  const handleDeleteSituation = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir a situação "${name}"?`)) return;
    try {
      const res = await fetch(`/api/management?section=situation&id=${id}&userAuthor=${encodeURIComponent(currentUser?.name || 'Admin')}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao excluir situação.');
        return;
      }
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Falha ao comunicar com o servidor.');
    }
  };

  // Ações de Usuários (ADMIN e GERÊNCIA)
  const getDefaultPermissions = (r: string) => {
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers) {
      alert('Acesso negado: Somente administradores e gerentes podem cadastrar usuários.');
      return;
    }
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    try {
      setCreatingUser(true);
      setUserError(null);

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_user',
          name: newUserName.trim(),
          email: newUserEmail.trim().toLowerCase(),
          password: newUserPassword,
          role: newUserRole,
          permissions: getDefaultPermissions(newUserRole),
          userAuthor: currentUser?.name || 'Administrador',
          userRole: currentUser?.role || 'ADMIN',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUserError(data.error || 'Erro ao criar usuário');
        return;
      }

      setNewUserName('');
      setNewUserEmail('');
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

    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"? Esta ação removerá o acesso permanentemente.`)) {
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

  const handleToggleUserActive = async (u: any) => {
    if (!canManageUsers) {
      alert('Acesso negado: Somente administradores e gerentes podem alterar status de usuários.');
      return;
    }
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user',
          userId: u.id,
          active: !u.active,
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

  // 2. Criar Local
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocCode.trim()) return;

    try {
      await fetch('/api/management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'location',
          data: { code: newLocCode.trim().toUpperCase() },
          userAuthor: currentUser?.name || 'Administrador',
        }),
      });
      setNewLocCode('');
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteLocation = async (id: string, code: string) => {
    if (!confirm(`Deseja excluir o local "${code}"?`)) return;
    try {
      await fetch(`/api/management?section=location&id=${id}&userAuthor=${encodeURIComponent(currentUser?.name || 'Admin')}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Criar Modelo
  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim() || !newModelTypeId) return;

    try {
      await fetch('/api/management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'model',
          data: { name: newModelName.trim().toUpperCase(), typeId: newModelTypeId },
          userAuthor: currentUser?.name || 'Administrador',
        }),
      });
      setNewModelName('');
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteModel = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir o modelo "${name}"?`)) return;
    try {
      await fetch(`/api/management?section=model&id=${id}&userAuthor=${encodeURIComponent(currentUser?.name || 'Admin')}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Salvar Nota de Auditoria
  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingAudit(true);
      await fetch('/api/management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'audit_score',
          data: { fiscalYear: auditFy, score: auditScore },
          userAuthor: currentUser?.name || 'Administrador',
        }),
      });
      setAuditSavedMessage(true);
      setTimeout(() => setAuditSavedMessage(false), 2500);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingAudit(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho do Módulo de Gerência */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#002B49] flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-600" />
            Central de Gerência e Parâmetros Operacionais
          </h2>
          <p className="text-xs text-slate-500">
            Configure as opções dinâmicas de Situações, Locais físicos na oficina, Modelos/Tipos e Nota Anual da Auditoria
          </p>
        </div>

        {/* Abas de Gerência */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('situacoes')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'situacoes' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" /> Situações ({situations.length})
          </button>

          <button
            onClick={() => setActiveTab('locais')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'locais' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" /> Locais ({locations.length})
          </button>

          <button
            onClick={() => setActiveTab('modelos')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'modelos' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-3.5 h-3.5" /> Modelos & Tipos ({models.length})
          </button>

          <button
            onClick={() => setActiveTab('auditoria')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'auditoria' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> Auditoria Anual
          </button>

          <button
            onClick={() => setActiveTab('usuarios')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'usuarios' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Usuários ({usersList.length})
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: SITUAÇÕES                                               */}
      {/* ============================================================== */}
      {activeTab === 'situacoes' && (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-[#002B49]">Cadastro de Situações de O.S.</h3>
              <p className="text-xs text-slate-500">
                Personalize o nome, cor de identificação visual e defina situações que anulam/ignoram métricas
              </p>
            </div>

            <form onSubmit={handleCreateSituation} className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Nome da situação..."
                value={newSitName}
                onChange={(e) => setNewSitName(e.target.value)}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-cyan-600 bg-white"
              />
              <input
                type="color"
                value={newSitColor}
                onChange={(e) => setNewSitColor(e.target.value)}
                className="w-8 h-8 rounded border border-slate-300 p-0.5 cursor-pointer"
                title="Escolher cor da etiqueta"
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newSitIsCanceled}
                  onChange={(e) => setNewSitIsCanceled(e.target.checked)}
                  className="rounded text-cyan-600"
                />
                Anulada (Ignora SLA)
              </label>
              <button
                type="submit"
                disabled={!newSitName.trim()}
                className="px-3 py-1.5 bg-[#002B49] text-white rounded text-xs font-bold hover:bg-[#001B30] flex items-center gap-1 transition disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Cadastrar
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {situations.map((s) => (
              <div
                key={s.id}
                style={{ borderLeftColor: s.color, borderLeftWidth: '6px' }}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between shadow-2xs"
              >
                <div>
                  <span
                    style={{ backgroundColor: s.color }}
                    className="px-2.5 py-0.5 rounded text-xs font-bold text-slate-900 inline-block"
                  >
                    {s.name}
                  </span>
                  {s.isCanceled && (
                    <span className="text-[10px] text-amber-700 font-bold block mt-1">
                      ⚠️ Anulada (Não pontua)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingSituation(s)}
                    className="text-slate-400 hover:text-cyan-700 p-1.5 rounded hover:bg-cyan-50 transition"
                    title={`Editar situação ${s.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSituation(s.id, s.name)}
                    className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition"
                    title={`Excluir situação ${s.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: LOCAIS FÍSICOS (1A a 16H)                               */}
      {/* ============================================================== */}
      {activeTab === 'locais' && (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-[#002B49]">Locais Físicos de Armazenamento na Oficina</h3>
              <p className="text-xs text-slate-500">
                128 posições cadastradas (16 fileiras $\times$ 8 posições de A até H). Adicione ou edite conforme necessário.
              </p>
            </div>

            <form onSubmit={handleCreateLocation} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ex: 17A ou Bancada 1"
                value={newLocCode}
                onChange={(e) => setNewLocCode(e.target.value)}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-cyan-600 uppercase font-bold"
              />
              <button
                type="submit"
                disabled={!newLocCode.trim()}
                className="px-3 py-1.5 bg-[#002B49] text-white rounded text-xs font-bold hover:bg-[#001B30] flex items-center gap-1 transition disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </form>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-2">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="p-2 rounded bg-slate-50 border border-slate-200 text-center font-bold text-xs text-slate-700 hover:bg-cyan-50 hover:border-cyan-300 transition group relative"
              >
                <span>{loc.code}</span>
                <button
                  onClick={() => handleDeleteLocation(loc.id, loc.code)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-4 h-4 rounded-full text-[10px] items-center justify-center hidden group-hover:flex shadow"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: MODELOS E TIPOS                                         */}
      {/* ============================================================== */}
      {activeTab === 'modelos' && (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-[#002B49]">Catálogo de Modelos e Tipos Epson</h3>
              <p className="text-xs text-slate-500">
                Modelos vinculados aos tipos. Modelos do tipo EcoTank alimentam a métrica de Consumo de Cabeças CISS.
              </p>
            </div>

            <form onSubmit={handleCreateModel} className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Nome do Modelo (ex: L3250)..."
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none uppercase font-bold"
              />
              <select
                value={newModelTypeId}
                onChange={(e) => setNewModelTypeId(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white"
              >
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!newModelName.trim()}
                className="px-3 py-1.5 bg-[#002B49] text-white rounded text-xs font-bold hover:bg-[#001B30] flex items-center gap-1 transition disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Modelo
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {models.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-xs text-slate-800 block">{m.name}</span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded mt-1 inline-block ${
                      m.type.name === 'EcoTank'
                        ? 'bg-blue-100 text-blue-800'
                        : m.type.name === 'Comercial'
                        ? 'bg-purple-100 text-purple-800'
                        : m.type.name === 'Projetor'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {m.type.name}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteModel(m.id, m.name)}
                  className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                  title="Excluir modelo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 4: AUDITORIA ANUAL                                         */}
      {/* ============================================================== */}
      {activeTab === 'auditoria' && (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200 max-w-xl mx-auto space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="font-bold text-sm text-[#002B49] flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Nota da Auditoria Anual (Ano Fiscal Epson)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Insira a nota de 0 a 100 pontos obtida na auditoria do ciclo fiscal para compor o cálculo mensal de pontuação
            </p>
          </div>

          <form onSubmit={handleSaveAudit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ano Fiscal (FY)</label>
              <select
                value={auditFy}
                onChange={(e) => {
                  const y = parseInt(e.target.value, 10);
                  setAuditFy(y);
                  const found = audits.find((a) => a.fiscalYear === y);
                  setAuditScore(found ? found.score : 80.0);
                }}
                className="w-full px-3 py-2 text-sm rounded border border-slate-300 bg-white"
              >
                <option value={2026}>FY26 (Abril/2026 a Março/2027)</option>
                <option value={2025}>FY25 (Abril/2025 a Março/2026)</option>
                <option value={2024}>FY24 (Abril/2024 a Março/2025)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Nota da Auditoria (0 a 100)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={auditScore}
                onChange={(e) => setAuditScore(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-base font-bold text-slate-800 rounded border border-slate-300 focus:outline-none focus:border-cyan-600"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Meta mínima para pontuação máxima (5,0 pts): $\ge$ 95,01 pts. Aprovação: $\ge$ 80,0 pts (4,0 pts).
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              {auditSavedMessage ? (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Nota salva e recalculada no Dashboard!
                </span>
              ) : (
                <span />
              )}

              <button
                type="submit"
                disabled={savingAudit}
                className="px-6 py-2 bg-[#002B49] hover:bg-[#001B30] text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow transition"
              >
                {savingAudit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Nota de Auditoria
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 5: USUÁRIOS & PERMISSÕES (ADMIN E GERÊNCIA)                */}
      {/* ============================================================== */}
      {activeTab === 'usuarios' && (
        <div className="space-y-4">
          {!canManageUsers ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-8 rounded-lg text-center space-y-2 shadow-xs">
              <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto" />
              <h3 className="font-bold text-sm">Acesso Restrito ao Gerenciamento de Usuários</h3>
              <p className="text-xs text-amber-700 max-w-md mx-auto">
                Somente usuários dos perfis <strong>Administrador</strong> e <strong>Gerência</strong> possuem permissão para cadastrar, editar e excluir contas de usuários no sistema.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Formulário de Cadastro de Novo Usuário */}
              <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
                <h3 className="font-bold text-sm text-[#002B49] mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-cyan-600" /> Cadastrar Novo Usuário
                </h3>

                {userError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-lg mb-3">
                    {userError}
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Nome Completo</label>
                    <input
                      type="text"
                      placeholder="Ex: Roberto Técnico"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-cyan-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">E-mail / Login</label>
                    <input
                      type="email"
                      placeholder="Ex: roberto@csa.com.br"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-cyan-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Senha Inicial</label>
                    <input
                      type="password"
                      placeholder="Senha"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-cyan-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">Grupo / Cargo</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 bg-white"
                    >
                      <option value="ADMIN">Administrador (Total)</option>
                      <option value="GERENTE">Gerente CSA</option>
                      <option value="TECNICO">Técnico (Oficina)</option>
                      <option value="ATENDENTE">Atendente Recepção</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={creatingUser || !newUserName.trim() || !newUserEmail.trim()}
                      className="w-full px-4 py-2 bg-[#002B49] text-white text-xs font-bold rounded hover:bg-[#001B30] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {creatingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                      Salvar Usuário
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabela de Usuários Cadastrados */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
                  <span>Usuários Registrados no Sistema ({usersList.length})</span>
                  <span className="text-[11px] text-slate-500 font-normal">Acesso restrito: Administrador e Gerência</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#002B49] text-white font-bold">
                      <tr>
                        <th className="p-3">NOME</th>
                        <th className="p-3">E-MAIL / LOGIN</th>
                        <th className="p-3">GRUPO / CARGO</th>
                        <th className="p-3 text-center">STATUS</th>
                        <th className="p-3 text-center">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usersList.map((u) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pop-up Modal de Editar Situação */}
      <EditSituationModal
        isOpen={Boolean(editingSituation)}
        situation={editingSituation}
        onClose={() => setEditingSituation(null)}
        onSuccess={() => fetchData()}
        currentUser={currentUser}
      />

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
