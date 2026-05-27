import { useRef, useState } from 'react';
import { api } from '../api/client.js';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
}

/** Redimensiona e comprime a imagem para no máximo ~1.5 MB antes de enviar. */
export async function compressImage(file: File, maxBytes = 1.5 * 1024 * 1024): Promise<File> {
  if (file.size <= maxBytes) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const maxDim = 1920;
      if (width > maxDim || height > maxDim) {
        if (width >= height) { height = Math.round(height * maxDim / width); width = maxDim; }
        else                 { width  = Math.round(width  * maxDim / height); height = maxDim; }
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('compressão falhou')); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.82,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

export function ImageUpload({ value, onChange }: Props): JSX.Element {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (file: File): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const compressed = await compressImage(file);
      const { url } = await api.upload(compressed);
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
        {busy ? 'Enviando…' : value ? 'Trocar imagem' : 'Clique para enviar uma foto (até 10MB)'}
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
