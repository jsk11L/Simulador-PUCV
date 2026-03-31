import type { FormEvent } from 'react';
import { Activity, Lock, Mail } from 'lucide-react';

interface AuthViewProps {
  authMode: 'login' | 'register';
  email: string;
  password: string;
  setAuthMode: (mode: 'login' | 'register') => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  handleAuth: (e: FormEvent) => Promise<void>;
}

export default function AuthView({
  authMode,
  email,
  password,
  setAuthMode,
  setEmail,
  setPassword,
  handleAuth,
}: AuthViewProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-8 text-center relative">
          <div className="w-16 h-16 bg-blue-500 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg">
            <Activity size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SimulaPUCV</h1>
          <p className="text-slate-400 text-sm mt-2">Plataforma SaaS Multiusuario</p>
        </div>
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-700 mb-6 text-center">
            {authMode === 'register' ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Correo Institucional</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="usuario@pucv.cl"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mt-6 shadow-md transition-colors">
              {authMode === 'register' ? 'Crear Cuenta' : 'Entrar a la Plataforma'}
            </button>
          </form>
          <div className="mt-6 text-center text-sm">
            {authMode === 'login' ? (
              <p className="text-slate-500">
                ¿No tienes cuenta?{' '}
                <button onClick={() => setAuthMode('register')} className="text-blue-600 font-bold hover:underline">Regístrate aquí</button>
              </p>
            ) : (
              <p className="text-slate-500">
                ¿Ya tienes cuenta?{' '}
                <button onClick={() => setAuthMode('login')} className="text-blue-600 font-bold hover:underline">Inicia Sesión</button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
