import { useState } from 'react';

interface UseAuthParams {
  apiUrl: (path: string) => string;
  onLoginSuccess: (isAdmin: boolean) => void;
  onLogout: () => void;
}

export default function useAuth({ apiUrl, onLoginSuccess, onLogout }: UseAuthParams) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const endpoint = authMode === 'login' ? apiUrl('/api/login') : apiUrl('/api/register');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      if (authMode === 'register') {
        setAuthMode('login');
        alert('Registro completado. Tu cuenta requiere aprobación del administrador.');
      } else {
        localStorage.setItem('simula_token', data.token);
        setIsAuthenticated(true);
        const nextIsAdmin = data.is_admin === true;
        setIsAdmin(nextIsAdmin);
        onLoginSuccess(nextIsAdmin);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de autenticación';
      alert(message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('simula_token');
    setIsAuthenticated(false);
    setIsAdmin(false);
    onLogout();
  };

  return {
    isAuthenticated,
    isAdmin,
    authMode,
    email,
    password,
    setAuthMode,
    setEmail,
    setPassword,
    handleAuth,
    handleLogout,
  };
}
