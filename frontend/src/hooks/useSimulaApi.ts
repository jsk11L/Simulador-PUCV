import type { AdminUsuario, MallaGuardadaApi, ResultadoPasado } from '../types';

interface UseSimulaApiParams {
  apiUrl: (path: string) => string;
}

export default function useSimulaApi({ apiUrl }: UseSimulaApiParams) {
  const authHeaders = () => {
    const token = localStorage.getItem('simula_token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchMallasGuardadas = async (): Promise<MallaGuardadaApi[]> => {
    const res = await fetch(apiUrl('/api/mallas'), { headers: authHeaders() });
    const data = await res.json();
    return Array.isArray(data) ? (data as MallaGuardadaApi[]) : [];
  };

  const fetchResultadosPasados = async (): Promise<ResultadoPasado[]> => {
    const res = await fetch(apiUrl('/api/resultados'), { headers: authHeaders() });
    const data = await res.json();
    return Array.isArray(data) ? (data as ResultadoPasado[]) : [];
  };

  const fetchAdminUsuarios = async (): Promise<AdminUsuario[]> => {
    const res = await fetch(apiUrl('/api/admin/usuarios'), { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as AdminUsuario[]) : [];
  };

  const toggleAdminApproval = async (userId: string, nextApproved: boolean): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch(apiUrl(`/api/admin/usuarios/${userId}`), {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_approved: nextApproved }),
    });

    if (res.ok) return { ok: true };

    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data as { error?: string }).error || 'Error al actualizar usuario' };
  };

  return {
    fetchMallasGuardadas,
    fetchResultadosPasados,
    fetchAdminUsuarios,
    toggleAdminApproval,
  };
}
