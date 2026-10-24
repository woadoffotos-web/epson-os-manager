'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
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

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Carregar sessão salva no navegador
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem('epson_auth_user');
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed && parsed.email) {
          setCurrentUser(parsed);
        }
      }
    } catch (e) {
      console.error('Erro ao recuperar sessão:', e);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth?action=users');
      const data = await res.json();
      if (data.users && data.users.length > 0) {
        setAvailableUsers(data.users);
      }
    } catch (e) {
      console.error('Erro ao buscar usuários:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('epson_auth_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('epson_auth_user');
    } catch (e) {
      console.error(e);
    }
  };

  // Enquanto verifica a sessão local
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

  // Se não estiver autenticado, exibe a tela de login
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} availableUsers={availableUsers} />;
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
      <div className="min-h-screen flex flex-col bg-slate-100">
        <HeaderNav
          currentUser={currentUser}
          onLogout={handleLogout}
          availableUsers={availableUsers}
        />
        <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </AppContext.Provider>
  );
}
