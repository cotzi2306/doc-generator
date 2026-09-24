import { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  credits: number;
  isAdmin: boolean; 
  login: (token: string) => void;
  logout: () => void;
  fetchProfile: () => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [credits, setCredits] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCredits(0);
    setIsAdmin(false);
  };

  const fetchProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8000/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
        setIsAdmin(data.is_admin); // <--- Guardamos si es admin
      } else {
        logout();
      }
    } catch {
      logout();
    }
  };

  useEffect(() => { fetchProfile(); }, [token]);

  return (
    <AuthContext.Provider value={{ token, credits, isAdmin, login, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};