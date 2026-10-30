'use client';

import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import HeaderNav from '@/components/HeaderNav';
import LoginScreen from '@/components/LoginScreen';
import { Loader2 } from 'lucide-react';

interface AppContextType {
  currentUser: any;
  setCurrentUser: (user: any) => void;
  availableUsers: any[];
  refreshUsers: () => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  availableUsers: [],
  refreshUsers: () => {},
  logout: () => {},
});

export const useApp = () => useContext(AppContext);

// 5 minutos em milissegundos para encerramento de sessão por inatividade
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  const lastActivityRef = useRef<number>(Date.now());

  // Encerramento de sessão por inatividade (5 minutos)
  const triggerInactivityLogout = useCallback(async () => {
    try {
      sessionStorage.removeItem('epson_tab_session');
      sessionStorage.removeItem('epson_last_activity');
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch (e) {
      console.error('Erro ao efetuar logout por inatividade:', e);
    }
    setCurrentUser(null);
    setSecurityNotice(
      'Sua sessão foi encerrada após 5 minutos de inatividade por motivos de segurança. Por favor, faça login novamente para continuar.'
    );
  }, []);

  // 1. Carregar e validar sessão ao abrir a página
  // PROTOCOLO: Se fechar a página e voltar depois, a sessão da aba (sessionStorage) não existirá,
  // exigindo novo login imediato.
  useEffect(() => {
    const checkSession = async () => {
      try {
        const isTabSessionActive = sessionStorage.getItem('epson_tab_session') === 'active';

        // Se a aba foi recém-aberta (ou fechada anteriormente e reaberta), não reutilizar login antigo
        if (!isTabSessionActive) {
          try {
            await fetch('/api/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'logout' }),
            });
          } catch (e) {
            // Ignora erro de rede silenciosamente
          }
          setCurrentUser(null);
          setIsAuthLoading(false);
          return;
        }

        // Se a aba continuou ativa (ex: reload/F5 ou navegação), verificar se já ultrapassou os 5 min de inatividade
        const storedLastActivity = sessionStorage.getItem('epson_last_activity');
        if (storedLastActivity) {
          const elapsed = Date.now() - parseInt(storedLastActivity, 10);
          if (elapsed >= INACTIVITY_TIMEOUT_MS) {
            await triggerInactivityLogout();
            setIsAuthLoading(false);
            return;
          }
        }

        const res = await fetch('/api/auth?action=me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            const now = Date.now();
            lastActivityRef.current = now;
            sessionStorage.setItem('epson_last_activity', String(now));
            setIsAuthLoading(false);
            return;
          }
        }

        // Se não autenticado no backend, encerra
        sessionStorage.removeItem('epson_tab_session');
        sessionStorage.removeItem('epson_last_activity');
        setCurrentUser(null);
      } catch (e) {
        console.error('Erro ao recuperar sessão:', e);
        setCurrentUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkSession();
  }, [triggerInactivityLogout]);

  // 2. Monitoramento Contínuo de Inatividade de 5 minutos
  useEffect(() => {
    if (!currentUser) return;

    let lastRecordThrottle = 0;

    const handleUserActivity = () => {
      const now = Date.now();
      // Otimização: atualizar timestamp no máximo 1x por segundo
      if (now - lastRecordThrottle > 1000) {
        lastRecordThrottle = now;
        lastActivityRef.current = now;
        sessionStorage.setItem('epson_last_activity', String(now));
      }
    };

    const checkTimeout = () => {
      const now = Date.now();
      const storedLastActivity = sessionStorage.getItem('epson_last_activity');
      const lastTime = storedLastActivity ? parseInt(storedLastActivity, 10) : lastActivityRef.current;
      if (now - lastTime >= INACTIVITY_TIMEOUT_MS) {
        triggerInactivityLogout();
      }
    };

    // Eventos que indicam uso ativo do sistema
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Verificação periódica a cada 5 segundos
    const intervalId = setInterval(checkTimeout, 5000);

    // Verificação instantânea ao retornar à aba ou após suspensão do computador
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimeout();
      }
    };
    const handleFocus = () => {
      checkTimeout();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser, triggerInactivityLogout]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/auth?action=users');
      if (res.ok) {
        const data = await res.json();
        if (data.users && data.users.length > 0) {
          setAvailableUsers(data.users);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar usuários:', e);
    }
  }, []);

  useEffect(() => {
    if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'GERENTE')) {
      fetchUsers();
    } else {
      setAvailableUsers([]);
    }
  }, [currentUser, fetchUsers]);

  const handleLoginSuccess = (user: any) => {
    sessionStorage.setItem('epson_tab_session', 'active');
    const now = Date.now();
    sessionStorage.setItem('epson_last_activity', String(now));
    lastActivityRef.current = now;
    setSecurityNotice(null);
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('epson_tab_session');
    sessionStorage.removeItem('epson_last_activity');
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
    setSecurityNotice(null);
  };

  // Enquanto verifica a sessão
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#001B30] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-xs text-slate-300 font-semibold tracking-wider uppercase">
          Carregando ambiente seguro Epson...
        </p>
      </div>
    );
  }

  // Se não estiver autenticado, exibe a tela de login com eventuais avisos de segurança
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        availableUsers={availableUsers}
        securityNotice={securityNotice}
      />
    );
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        availableUsers,
        refreshUsers: fetchUsers,
        logout: handleLogout,
      }}
    >
      <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800 antialiased font-sans">
        <HeaderNav
          currentUser={currentUser}
          onLogout={handleLogout}
          availableUsers={availableUsers}
        />
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </AppContext.Provider>
  );
}
