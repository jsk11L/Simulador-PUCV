import { useEffect, useState } from 'react';

interface RuntimeInfo {
  standalone: boolean;
}

/**
 * useRuntimeMode consulta /api/info al cargar la app para descubrir si el
 * backend está corriendo en modo servidor (auth normal con login) o modo
 * standalone (binario portable single-user, sin login).
 *
 * Devuelve `null` mientras la petición está en curso, `RuntimeInfo` después.
 * En caso de error (típicamente el backend no responde), asume modo
 * servidor para no degradar la experiencia del modo normal.
 */
export default function useRuntimeMode(apiUrl: (path: string) => string): RuntimeInfo | null {
  const [info, setInfo] = useState<RuntimeInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/api/info'))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data.standalone === 'boolean') {
          setInfo({ standalone: data.standalone });
        } else {
          setInfo({ standalone: false });
        }
      })
      .catch(() => {
        if (!cancelled) setInfo({ standalone: false });
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  return info;
}
