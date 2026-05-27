import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { CommentThread, type CommentTargetKind } from '../components/CommentThread.js';

export type FeedKind = 'colony' | 'colony_post' | 'adoption' | 'missing';

export interface FeedItem {
  id: string;
  kind: FeedKind;
  refId: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  photos: string[];
  species: string | null;
  postType: string | null;
  authorName: string | null;
  location: { lng: number; lat: number } | null;
  createdAt: string;
  commentCount: number;
}

interface FeedResponse {
  items: FeedItem[];
  nextCursor: string | null;
}

const KIND_META: Record<FeedKind, { icon: string; label: string; color: string }> = {
  colony:      { icon: '🐈', label: 'Nova colônia',            color: '#d62b8e' },
  colony_post: { icon: '📣', label: 'Atualização de colônia',  color: '#3498db' },
  adoption:    { icon: '🏠', label: 'Disponível p/ adoção',   color: '#27ae60' },
  missing:     { icon: '🔔', label: 'Desaparecido',            color: '#9b59b6' },
};

const POST_TYPE_LABEL: Record<string, string> = {
  update:         'Atualização',
  need:           'Pedido / Necessidade',
  photo:          'Foto',
  question:       'Pergunta',
  donation_offer: 'Doação',
  action_done:    'Ação realizada',
};

const SPECIES_LABEL: Record<string, string> = {
  cat:   'Gato',
  dog:   'Cachorro',
  other: 'Outro',
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'agora';
  if (diff < 3600)  return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

const ALL_KINDS: FeedKind[] = ['colony', 'colony_post', 'adoption', 'missing'];

export function FeedPage(): JSX.Element {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedKind | 'all'>('all');
  const sentinelRef = useRef<HTMLDivElement>(null);

  const buildQuery = (before: string | null, f: FeedKind | 'all'): string => {
    const p = new URLSearchParams();
    p.set('limit', '15');
    if (before) p.set('before', before);
    if (f !== 'all') p.set('kinds', f);
    return `/feed?${p.toString()}`;
  };

  const load = useCallback(
    async (reset = false): Promise<void> => {
      if (loading) return;
      if (!reset && !hasMore) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<FeedResponse>(buildQuery(reset ? null : cursor, filter));
        setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
        setCursor(res.nextCursor);
        setHasMore(res.items.length === 15 && res.nextCursor !== null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'erro ao carregar feed');
      } finally {
        setLoading(false);
      }
    },
    [cursor, filter, hasMore, loading],
  );

  // Reset ao trocar filtro
  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) void load();
      },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, load]);

  return (
    <div className="pa-feed">
      <div className="pa-feed-filters">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`pa-feed-chip ${filter === 'all' ? 'active' : ''}`}
        >
          Tudo
        </button>
        {ALL_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`pa-feed-chip ${filter === k ? 'active' : ''}`}
          >
            <span>{KIND_META[k].icon}</span> {KIND_META[k].label}
          </button>
        ))}
      </div>

      {error ? <div className="pa-feed-error">{error}</div> : null}

      <div className="pa-feed-list">
        {items.map((it) => (
          <FeedCard key={`${it.kind}:${it.id}`} item={it} />
        ))}

        {items.length === 0 && !loading && !error ? (
          <div className="pa-feed-empty">
            <div className="pa-feed-empty-emoji">🐾</div>
            <p>Sem novidades por aqui ainda.</p>
            <p className="pa-muted">Cadastre uma colônia, adoção ou alerta para começar.</p>
          </div>
        ) : null}

        <div ref={sentinelRef} />

        {loading ? <div className="pa-feed-loading">carregando…</div> : null}
        {!hasMore && items.length > 0 ? (
          <div className="pa-feed-end">— fim do feed —</div>
        ) : null}
      </div>
    </div>
  );
}

function FeedCard({ item }: { item: FeedItem }): JSX.Element {
  const meta = KIND_META[item.kind];
  const photos = item.photos.length > 0 ? item.photos : item.imageUrl ? [item.imageUrl] : [];
  const [commentCount, setCommentCount] = useState(item.commentCount);

  const target =
    item.kind === 'adoption'
      ? '/adocoes'
      : item.kind === 'missing'
        ? '/desaparecidos'
        : '/';

  return (
    <article className="pa-feed-card">
      <header className="pa-feed-card-head">
        <div className="pa-feed-avatar" style={{ background: meta.color }}>
          <span>{meta.icon}</span>
        </div>
        <div className="pa-feed-head-text">
          <div className="pa-feed-kind" style={{ color: meta.color }}>
            {meta.label}
            {item.postType && POST_TYPE_LABEL[item.postType] ? (
              <span className="pa-feed-pill">{POST_TYPE_LABEL[item.postType]}</span>
            ) : null}
            {item.species && SPECIES_LABEL[item.species] ? (
              <span className="pa-feed-pill">{SPECIES_LABEL[item.species]}</span>
            ) : null}
          </div>
          <div className="pa-feed-title">{item.title}</div>
          <div className="pa-feed-time">
            {item.authorName ? <>por <strong>{item.authorName}</strong> · </> : null}
            {timeAgo(item.createdAt)}
          </div>
        </div>
      </header>

      {item.body ? <p className="pa-feed-body">{item.body}</p> : null}

      {photos.length > 0 ? (
        <div className={`pa-feed-photos count-${Math.min(photos.length, 4)}`}>
          {photos.slice(0, 4).map((url, i) => (
            <img key={url + i} src={url} alt="" loading="lazy" />
          ))}
          {photos.length > 4 ? <div className="pa-feed-more">+{photos.length - 4}</div> : null}
        </div>
      ) : null}

      <footer className="pa-feed-card-foot">
        <CommentThread
          targetKind={item.kind as CommentTargetKind}
          targetId={item.refId}
          initialCount={commentCount}
          compact
          onCountChange={setCommentCount}
        />
        <Link to={target} className="pa-feed-action">
          {item.kind === 'adoption'
            ? 'Ver adoção'
            : item.kind === 'missing'
              ? 'Ver alerta'
              : 'Ver no mapa'}
        </Link>
      </footer>
    </article>
  );
}
