import { useRef, useState } from 'react';
import { api } from '../api/client.js';

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

export function MultiImageUpload({ value, onChange, max = 6 }: Props): JSX.Element {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (files: FileList): Promise<void> => {
    setBusy(true); setError(null);
    try {
      const slots = max - value.length;
      const toUpload = Array.from(files).slice(0, Math.max(0, slots));
      const uploaded = await Promise.all(toUpload.map((f) => api.upload(f)));
      onChange([...value, ...uploaded.map((u) => u.url)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'falhou');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  const remove = (url: string): void => onChange(value.filter((u) => u !== url));
  const reachedLimit = value.length >= max;

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        {value.map((url) => (
          <div key={url} style={{ position: 'relative' }}>
            <img src={url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
            <button
              type="button"
              onClick={() => remove(url)}
              style={{
                position: 'absolute', top: -6, right: -6,
                background: '#c0392b', color: '#fff', border: 'none',
                borderRadius: '50%', width: 20, height: 20, cursor: 'pointer',
                fontSize: 12, lineHeight: 1,
              }}
              title="Remover"
            >×</button>
          </div>
        ))}
      </div>
      <div
        className={`pa-upload ${value.length ? 'has-file' : ''}`}
        style={reachedLimit ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        onClick={() => !reachedLimit && ref.current?.click()}
      >
        {busy
          ? 'Enviando…'
          : reachedLimit
            ? `Limite de ${max} fotos atingido`
            : `📷 Adicionar fotos (${value.length}/${max})`}
      </div>
      <input
        type="file"
        accept="image/*"
        multiple
        ref={ref}
        style={{ display: 'none' }}
        onChange={(e) => e.target.files && void handle(e.target.files)}
      />
      {error ? <div style={{ color: '#c0392b', fontSize: 12, marginTop: 4 }}>{error}</div> : null}
    </div>
  );
}
