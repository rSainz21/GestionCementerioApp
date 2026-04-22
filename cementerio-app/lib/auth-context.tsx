import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch, setToken } from './laravel-api';

interface AuthState {
  user: any | null;
  loading: boolean;
  signIn: (usernameOrEmail: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<any>('/api/me')
      .then((r) => {
        if (r.ok) setUser(r.data);
        else setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (usernameOrEmail: string, password: string) => {
    const r = await apiFetch<{ token: string; user: any }>('/api/login', {
      method: 'POST',
      body: { username: usernameOrEmail, password },
    });
    if (!r.ok) {
      return { error: new Error(typeof r.error === 'string' ? r.error : 'No se pudo iniciar sesión') };
    }
    await setToken(r.data.token);
    setUser(r.data.user);
    return { error: null };
  };

  const signOut = async () => {
    await apiFetch('/api/logout', { method: 'POST' }).catch(() => null);
    await setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
