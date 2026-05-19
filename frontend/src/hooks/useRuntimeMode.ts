import { useEffect, useState } from 'react';

interface RuntimeInfo {
  standalone: boolean;
}

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * useRuntimeMode consulta /api/info al cargar la app para descubrir si el
 * backend está corriendo en modo servidor (auth normal con login) o modo
 * standalone (binario portable single-user, sin login).
 *
 * Devuelve `null` mientras la petición está en curso, `RuntimeInfo` después.
 * En caso de error (típicamente el backend no responde), asume modo
 * servidor para no degradar la experiencia del modo normal.
 *
 * Heartbeat: en modo standalone hace ping a /api/info cada 30 segundos
 * mientras la pestaña esté visible. El backend usa eso para detectar
 * pestañas cerradas — si pasan más de 3 minutos sin ping, se autoapaga.
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

  useEffect(() => {
    if (!info?.standalone) return;
    const ping = () => {
      if (document.visibilityState === 'hidden') return;
      fetch(apiUrl('/api/info')).catch(() => {});
    };
    const id = window.setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [info?.standalone, apiUrl]);

  return info;
}
