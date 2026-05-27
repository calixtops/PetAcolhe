import { useRef, useState } from 'react';
import { api } from '../api/client.js';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function ImageUpload({ value, onChange }: Props): JSX.Element {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (file: File): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.upload(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'falhou');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div
        className={`pa-upload ${value ? 'has-file' : ''}`}
        onClick={() => ref.current?.click()}
      >
        {busy ? 'Enviando…' : value ? 'Trocar imagem' : 'Clique para enviar uma foto (até 5MB)'}
        {value ? <img src={value} alt="preview" /> : null}
      </div>
      <input
        type="file"
        accept="image/*"
        ref={ref}
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handle(f);
        }}
      />
      {value ? (
        <button
          type="button"
          className="pa-btn ghost"
          style={{ marginTop: 6, fontSize: 12, padding: '4px 8px' }}
          onClick={() => onChange(null)}
        >
          remover
        </button>
      ) : null}
      {error ? <div style={{ color: '#c0392b', fontSize: 12, marginTop: 4 }}>{error}</div> : null}
    </div>
  );
}
