import { useCallback, useEffect, useState } from 'react';
export function useAsyncData<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState(initial); const [loading, setLoading] = useState(true); const [error, setError] = useState<Error | null>(null);
  const reload = useCallback(async () => { setLoading(true); setError(null); try { setData(await loader()); } catch (value) { setError(value as Error); } finally { setLoading(false); } }, [loader]);
  useEffect(() => { let active = true; void loader().then(value => { if (active) setData(value); }).catch(value => { if (active) setError(value as Error); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [loader]);
  return { data, setData, loading, error, reload };
}
