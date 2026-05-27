/**
 * Cliente HTTP fininho — usa o proxy do Vite (/api).
 * Trocar `BASE` por env var quando for para produção.
 */
const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail: unknown = null;
    try { detail = await res.json(); } catch { /* ignore */ }
    const message =
      (detail as { error?: string } | null)?.error ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get:    <T>(p: string)            => request<T>(p),
  post:   <T>(p: string, body: unknown) =>
    request<T>(p, { method: 'POST', body: JSON.stringify(body) }),
  patch:  <T>(p: string, body: unknown) =>
    request<T>(p, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(p: string) =>
    request<T>(p, { method: 'DELETE' }),
  upload: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/uploads-api`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`upload falhou (${res.status})`);
    return res.json();
  },
};
