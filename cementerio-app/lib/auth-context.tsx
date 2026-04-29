import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch, setToken } from './laravel-api';

interface AuthState {
  user: any | null;
  loading: boolean;
  signIn: (usernameOrEmail: string, password: string, opts?: { persist?: boolean }) => Promise<{ error: Error | null }>;
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

  const signIn = async (usernameOrEmail: string, password: string, opts?: { persist?: boolean }) => {
    // Compat: algunos backends validan "username", otros "email".
    // Intentamos primero username y si falla repetimos con email.
    const first = await apiFetch<{ token: string; user: any }>('/api/login', {
      method: 'POST',
      body: { username: usernameOrEmail, password },
    });
    if (first.ok) {
      await setToken(first.data.token, { persist: opts?.persist });
      setUser(first.data.user);
      return { error: null };
    }

    const msg = typeof first.error === 'string' ? first.error : String(first.error ?? '');
    const shouldTryEmail = /email/i.test(msg) || /correo/i.test(msg);
    if (!shouldTryEmail) {
      return { error: new Error(msg || 'No se pudo iniciar sesión') };
    }

    const second = await apiFetch<{ token: string; user: any }>('/api/login', {
      method: 'POST',
      body: { email: usernameOrEmail, password },
    });
    if (!second.ok) {
      const msg2 = typeof second.error === 'string' ? second.error : String(second.error ?? '');
      return { error: new Error(msg2 || msg || 'No se pudo iniciar sesión') };
    }
    await setToken(second.data.token, { persist: opts?.persist });
    setUser(second.data.user);
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
