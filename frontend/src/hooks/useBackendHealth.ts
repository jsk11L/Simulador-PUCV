import { useCallback, useEffect, useRef, useState } from 'react';

// ==========================================
// useBackendHealth — detecta si el backend dejó de responder
// ==========================================
// Hace ping periódico a /api/info. Tras FAIL_THRESHOLD fallos consecutivos
// marca `down = true` para que la UI muestre una alerta (típico en el
// binario portable: el proceso se cierra por inactividad o el usuario lo
// mata, y la pestaña queda huérfana sin backend que la sirva).
//
// Recupera solo: un ping exitoso vuelve a poner `down = false`.

const POLL_MS = 10_000;
const TIMEOUT_MS = 6_000;
const FAIL_THRESHOLD = 2; // 2 fallos seguidos antes de alarmar (evita falsos positivos)

export default function useBackendHealth(
  apiUrl: (path: string) => string,
  enabled: boolean,
): { down: boolean; recheck: () => void } {
  const [down, setDown] = useState(false);
  const fails = useRef(0);

  const check = useCallback(async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(apiUrl('/api/info'), { signal: ctrl.signal, cache: 'no-store' });
      if (!r.ok) throw new Error('bad status');
      fails.current = 0;
      setDown(false);
    } catch {
      fails.current += 1;
      if (fails.current >= FAIL_THRESHOLD) setDown(true);
    } finally {
      clearTimeout(timer);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    const tick = () => {
      if (stop) return;
      // No molestar mientras la pestaña está oculta: el navegador puede
      // pausar timers y generaría un falso "caído" al volver.
      if (document.visibilityState === 'hidden') return;
      check();
    };
    const id = window.setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stop = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, check]);

  return { down, recheck: check };
}
