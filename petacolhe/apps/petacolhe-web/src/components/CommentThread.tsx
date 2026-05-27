import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export type CommentTargetKind = 'adoption' | 'missing' | 'colony' | 'colony_post';

export interface Comment {
  id: string;
  targetKind: CommentTargetKind;
  targetId: string;
  authorName: string | null;
  authorContact: string | null;
  body: string;
  createdAt: string;
}

interface Props {
  targetKind: CommentTargetKind;
  targetId: string;
  /** Total exibido no botão antes de abrir (vem do feed). */
  initialCount?: number;
  /** Modo compacto: aberto inline em cards do feed. */
  compact?: boolean;
  /** Callback quando muda o número total — para o feed atualizar o contador. */
  onCountChange?: (count: number) => void;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)     return 'agora';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

/** Chave única no localStorage para lembrar o nome do "autor" entre comentários. */
const NAME_KEY = 'petacolhe:author:name';

export function CommentThread({
  targetKind,
  targetId,
  initialCount = 0,
  compact = false,
  onCountChange,
}: Props): JSX.Element {
  const [open, setOpen] = useState(!compact);
  const [items, setItems] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [posting, setPosting] = useState(false);
  const [count, setCount] = useState(initialCount);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const data = await api.get<Comment[]>(
        `/comments?targetKind=${targetKind}&targetId=${targetId}`,
      );
      setItems(data);
      setCount(data.length);
      onCountChange?.(data.length);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro');
    } finally {
      setLoading(false);
    }
  }, [targetKind, targetId, onCountChange]);

  useEffect(() => {
    if (open && !loaded) void load();
  }, [open, loaded, load]);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const text = body.trim();
    if (!text || posting) return;
    setPosting(true); setError(null);
    try {
      const created = await api.post<Comment>('/comments', {
        targetKind,
        targetId,
        body: text,
        authorName: name.trim() || undefined,
      });
      if (name.trim()) localStorage.setItem(NAME_KEY, name.trim());
      setItems((prev) => [...prev, created]);
      setCount((c) => {
        const n = c + 1;
        onCountChange?.(n);
        return n;
      });
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'falhou');
    } finally {
      setPosting(false);
    }
  };

  const removeComment = async (id: string): Promise<void> => {
    if (!window.confirm('Excluir este comentário?')) return;
    try {
      await api.delete(`/comments/${id}`);
      setItems((prev) => prev.filter((c) => c.id !== id));
      setCount((c) => {
        const n = Math.max(0, c - 1);
        onCountChange?.(n);
        return n;
      });
    } catch {
      alert('Erro ao excluir.');
    }
  };

  if (compact && !open) {
    return (
      <button
        type="button"
        className="pa-comments-toggle"
        onClick={() => setOpen(true)}
      >
        💬 {count > 0 ? `${count} ${count === 1 ? 'comentário' : 'comentários'}` : 'Comentar'}
      </button>
    );
  }

  return (
    <section className={`pa-comments ${compact ? 'compact' : ''}`}>
      {compact ? (
        <button
          type="button"
          className="pa-comments-collapse"
          onClick={() => setOpen(false)}
          title="Fechar comentários"
        >
          💬 {count} {count === 1 ? 'comentário' : 'comentários'} <span>▲</span>
        </button>
      ) : (
        <h4 className="pa-comments-title">
          💬 {count} {count === 1 ? 'comentário' : 'comentários'}
        </h4>
      )}

      {loading && !loaded ? <div className="pa-comments-loading">carregando…</div> : null}

      <ul className="pa-comments-list">
        {items.map((c) => (
          <li key={c.id} className="pa-comment">
            <div className="pa-comment-avatar">
              {(c.authorName?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="pa-comment-body">
              <div className="pa-comment-head">
                <strong>{c.authorName ?? 'Anônimo'}</strong>
                <span className="pa-comment-time">{timeAgo(c.createdAt)}</span>
                <button
                  type="button"
                  className="pa-comment-del"
                  onClick={() => void removeComment(c.id)}
                  title="Excluir"
                >×</button>
              </div>
              <p>{c.body}</p>
            </div>
          </li>
        ))}
        {loaded && items.length === 0 ? (
          <li className="pa-comments-empty">Seja o primeiro a comentar.</li>
        ) : null}
      </ul>

      <form onSubmit={(e) => void submit(e)} className="pa-comment-form">
        <input
          type="text"
          placeholder="Seu nome (opcional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="pa-comment-name"
        />
        <div className="pa-comment-input-row">
          <textarea
            placeholder="Escreva um comentário…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={2}
          />
          <button
            type="submit"
            disabled={!body.trim() || posting}
            className="pa-comment-send"
          >
            {posting ? '…' : 'Enviar'}
          </button>
        </div>
        {error ? <div className="pa-comment-error">{error}</div> : null}
      </form>
    </section>
  );
}
