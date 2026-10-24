'use client';

import React, { useState } from 'react';
import { Lock, Mail, Loader2, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
  availableUsers?: any[];
}

export default function LoginScreen({ onLoginSuccess, availableUsers = [] }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Por favor, informe o seu e-mail e a senha.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Credenciais inválidas ou usuário inativo.');
        return;
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError('Falha ao comunicar com o servidor. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: any) => {
    setEmail(u.email);
    setPassword('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 bg-radial-gradient">
      {/* Background decorativo */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#001B30] via-[#002B49] to-slate-950 opacity-95 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Topo Corporativo Epson */}
          <div className="bg-[#002B49] px-6 py-8 text-center text-white relative">
            <div className="inline-flex items-center gap-1.5 font-black text-3xl tracking-tighter text-white mb-2">
              EPSON<span className="text-xs text-cyan-300 font-normal align-top">®</span>
            </div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-cyan-200">
              Controle de O.S. & Performance CSA
            </h1>
            <p className="text-[11px] text-slate-300 mt-1 max-w-xs mx-auto">
              Acesso restrito a técnicos e gestores autorizados Epson
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                E-mail / Login
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@epson.com.br"
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 transition"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Senha
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full mt-2 py-3 bg-[#002B49] hover:bg-[#001B30] text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Acesso Rápido para Demonstração / Teste */}
            {availableUsers.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                  Contas cadastradas no sistema:
                </span>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {availableUsers.slice(0, 4).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickLogin(u)}
                      className="px-2.5 py-1 text-[11px] rounded-md bg-slate-100 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 border border-slate-200 transition font-medium"
                      title={`Preencher como ${u.name} (${u.role})`}
                    >
                      {u.name.split(' ')[0]} ({u.role})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>

          {/* Rodapé Seguro */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-500 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Ambiente Seguro com Trilha de Auditoria</span>
          </div>
        </div>

        {/* Informação sobre acesso simultâneo */}
        <p className="text-center text-xs text-slate-400 mt-4">
          Acesso multiusuário simultâneo para Computadores e Smartphones.
        </p>
      </div>
    </div>
  );
}
