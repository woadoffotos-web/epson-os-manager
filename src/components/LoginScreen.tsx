'use client';

import React, { useState } from 'react';
import { Lock, Mail, Loader2, AlertCircle, ArrowRight, ShieldCheck, ShieldAlert, Layers } from 'lucide-react';
import InfogedLogo from '@/components/InfogedLogo';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
  availableUsers?: any[];
  securityNotice?: string | null;
}

export default function LoginScreen({ onLoginSuccess, availableUsers = [], securityNotice = null }: LoginScreenProps) {
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background decorativo corporativo com gradiente elegante */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0A2E20] via-[#001826] to-slate-950 opacity-90 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Card de Login */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden backdrop-blur-sm">
          {/* Topo Corporativo INFOGED */}
          <div className="bg-gradient-to-b from-[#0F2D24] via-[#0A231C] to-[#061813] px-6 py-9 text-center text-white relative border-b border-emerald-900/30">
            <div className="flex justify-center mb-3">
              <InfogedLogo white={true} height={42} alt="INFOGED Soluções Tecnológicas" />
            </div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
              Portal Corporativo de Aplicativos
            </h1>
            <p className="text-[11px] text-slate-300 mt-1.5 max-w-xs mx-auto">
              Acesso unificado aos sistemas operacionais e de gestão da INFOGED
            </p>

            <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[10px] text-emerald-300 font-medium">
              <Layers className="w-3 h-3 text-emerald-400" />
              <span>Epson CSA &bull; Módulos Integrados</span>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
            {securityNotice && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs p-3.5 rounded-xl flex items-start gap-2.5 shadow-sm">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-medium">
                  <span className="font-bold block text-amber-950 mb-0.5">Aviso de Segurança</span>
                  {securityNotice}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                E-mail / Usuário
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@infoged.com.br"
                  autoComplete="email"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition font-medium text-slate-800"
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
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition text-slate-800"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full mt-2 py-3 bg-gradient-to-r from-[#0F2D24] to-[#164E3D] hover:from-[#0B221B] hover:to-[#113C2F] text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar na Plataforma</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                </>
              )}
            </button>

            {/* Acesso Rápido para Colaboradores Cadastrados */}
            {availableUsers.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                  Acesso rápido para usuários da equipe:
                </span>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {availableUsers.slice(0, 5).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickLogin(u)}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-200 transition font-medium"
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
            <span>Autenticação Criptografada &bull; Acesso Multi-Aparelhos</span>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          INFOGED Soluções Tecnológicas &bull; Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
