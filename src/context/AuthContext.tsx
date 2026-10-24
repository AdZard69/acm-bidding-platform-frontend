import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginAsTeam: (teamName: string, password: string) => Promise<void>;
  loginAsAdmin: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeam: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(api.getToken());
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const currentToken = api.getToken();
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      if (data.success) {
        setUser({
          role: data.role,
          sub: data.sub,
          adminId: data.adminId,
          username: data.username,
          teamId: data.teamId,
          teamName: data.teamName
        });
      } else {
        api.setToken(null);
        setUser(null);
      }
    } catch {
      // Invalid or expired token
      api.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginAsTeam = async (teamName: string, password: string) => {
    const res = await api.teamLogin(teamName, password);
    setTokenState(res.token);
    setUser({
      role: 'team',
      teamId: res.teamId,
      teamName: res.teamName
    });
  };

  const loginAsAdmin = async (username: string, password: string) => {
    const res = await api.adminLogin(username, password);
    setTokenState(res.token);
    setUser({
      role: 'admin',
      adminId: res.adminId,
      username: res.username
    });
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore errors on logout
    } finally {
      api.setToken(null);
      setTokenState(null);
      setUser(null);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('Not authenticated');
    if (user.role === 'admin') {
      await api.changeAdminPassword(currentPassword, newPassword);
    } else {
      await api.changeTeamPassword(currentPassword, newPassword);
    }
  };

  const value = {
    user,
    token,
    loading,
    loginAsTeam,
    loginAsAdmin,
    logout,
    changePassword,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isTeam: user?.role === 'team'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
