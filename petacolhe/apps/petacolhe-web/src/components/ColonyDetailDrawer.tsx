import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import {
  NEED_LABEL, NEUTER_LABEL, POST_TYPE_COLOR, POST_TYPE_LABEL, SPECIES_LABEL,
  type Colony, type ColonyNeed, type ColonyPost, type NeuterStatus, type PostType,
} from '../api/types.js';
import { MultiImageUpload } from './MultiImageUpload.js';

interface Props {
  colonyId: string;
  onClose: () => void;
  onChanged: () => void; // notifica mapa para reload (contagem etc.)
}

export function ColonyDetailDrawer({ colonyId, onClose, onChanged }: Props): JSX.Element {
  const [colony, setColony] = useState<Colony | null>(null);
  const [posts, setPosts]   = useState<ColonyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [editingStats, setEditingStats] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const [c, p] = await Promise.all([
        api.get<Colony>(`/colonies/${colonyId}`),
        api.get<ColonyPost[]>(`/colonies/${colonyId}/posts`),
      ]);
      setColony(c);
      setPosts(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro');
    } finally {
      setLoading(false);
    }
  }, [colonyId]);

  useEffect(() => { void load(); }, [load]);

  // ESC fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (lightbox) setLightbox(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, lightbox]);

  const refreshAll = (): void => {
    void load();
    onChanged();
  };

  return (
    <>
      <div className="pa-drawer-backdrop" onClick={onClose} />
      <aside className="pa-drawer" role="dialog" aria-label="Detalhes da colônia">
        <header className="pa-drawer-header">
          <h2>{colony ? `🐾 ${colony.title}` : 'Carregando…'}</h2>
          <button className="pa-drawer-close" onClick={onClose} aria-label="Fechar">×</button>
        </header>
        <div className="pa-drawer-body">
          {error ? <div style={{ color: '#c0392b' }}>Erro: {error}</div> : null}
          {loading && !colony ? <p>Carregando…</p> : null}

          {colony ? (
            <>
              <ColonyHeader colony={colony} onOpenPhoto={setLightbox} />

              {/* Stats + edit inline */}
              <div className="pa-stat-grid">
                <div className="pa-stat">
                  <div className="v">{colony.estimatedCount}</div>
                  <div className="l">animais</div>
                </div>
                <div className="pa-stat">
                  <div className="v" style={{ fontSize: 14, lineHeight: '24px' }}>
                    {SPECIES_LABEL[colony.species]}
                  </div>
                  <div className="l">espécie</div>
                </div>
                <div className="pa-stat">
                  <div className="v" style={{ fontSize: 12, lineHeight: '24px' }}>
                    {NEUTER_LABEL[colony.neuterStatus]}
                  </div>
                  <div className="l">castração</div>
                </div>
              </div>

              <button
                className="pa-btn ghost"
                style={{ width: '100%', fontSize: 13 }}
                onClick={() => setEditingStats((v) => !v)}
              >
                {editingStats ? 'Cancelar edição' : '✏️ Atualizar contagem e necessidades'}
              </button>

              {editingStats ? (
                <StatsEditor
                  colony={colony}
                  onSaved={() => { setEditingStats(false); refreshAll(); }}
                />
              ) : null}

              {/* Necessidades */}
              {colony.needs.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <strong style={{ fontSize: 12, color: '#6b7c8c', textTransform: 'uppercase' }}>
                    Precisamos de
                  </strong>
                  <div style={{ marginTop: 4 }}>
                    {colony.needs.map((n) => (
                      <span key={n} className="pa-badge urgent">{NEED_LABEL[n]}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Contatos */}
              {(colony.caretakerName || colony.contactPhone || colony.contactEmail || colony.feedingSchedule) ? (
                <div className="pa-section">
                  <h3>Contato e cuidados</h3>
                  {colony.caretakerName  ? <div>👤 {colony.caretakerName}</div> : null}
                  {colony.contactPhone   ? <div>📞 {colony.contactPhone}</div> : null}
                  {colony.contactEmail   ? <div>✉️ {colony.contactEmail}</div> : null}
                  {colony.feedingSchedule ? <div>🍽 {colony.feedingSchedule}</div> : null}
                </div>
              ) : null}

              {/* Fórum */}
              <div className="pa-section">
                <h3>Fórum da colônia · {posts.length} mensagens</h3>
                <PostComposer colonyId={colonyId} onPosted={refreshAll} />
                {posts.length === 0
                  ? <p style={{ color: '#6b7c8c', fontSize: 13 }}>
                      Ninguém postou ainda. Compartilhe uma atualização, foto ou peça ajuda 🐾
                    </p>
                  : posts.map((p) =>
                      <PostCard key={p.id} post={p} onOpenPhoto={setLightbox} />)}
              </div>
            </>
          ) : null}
        </div>
      </aside>

      {lightbox ? (
        <div className="pa-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" />
        </div>
      ) : null}
    </>
  );
}

// ============= header com foto principal =============
function ColonyHeader({
  colony, onOpenPhoto,
}: { colony: Colony; onOpenPhoto: (url: string) => void }): JSX.Element {
  return (
    <div>
      {colony.imageUrl ? (
        <img
          src={colony.imageUrl} alt=""
          onClick={() => onOpenPhoto(colony.imageUrl!)}
          style={{
            width: '100%', maxHeight: 220, objectFit: 'cover',
            borderRadius: 8, cursor: 'zoom-in', marginBottom: 8,
          }}
        />
      ) : null}
      {colony.description
        ? <p style={{ fontSize: 14, margin: '4px 0' }}>{colony.description}</p>
        : null}
      <small style={{ color: '#6b7c8c' }}>
        📍 {colony.lat.toFixed(5)}, {colony.lng.toFixed(5)} · cadastrada {new Date(colony.createdAt).toLocaleDateString('pt-BR')}
      </small>
    </div>
  );
}

// ============= editor inline de stats =============
function StatsEditor({
  colony, onSaved,
}: { colony: Colony; onSaved: () => void }): JSX.Element {
  const [count, setCount] = useState(colony.estimatedCount);
  const [neuter, setNeuter] = useState<NeuterStatus>(colony.neuterStatus);
  const [needs, setNeeds] = useState<ColonyNeed[]>(colony.needs);
  const [changedBy, setChangedBy] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleNeed = (n: ColonyNeed): void =>
    setNeeds((s) => s.includes(n) ? s.filter((x) => x !== n) : [...s, n]);

  const save = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api.patch(`/colonies/${colony.id}/stats`, {
        estimatedCount: count,
        neuterStatus: neuter,
        needs,
        changedBy: changedBy || undefined,
        note: note || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} style={{ background: '#f6f8f7', padding: 10, borderRadius: 8, marginTop: 8 }}>
      <div className="pa-row">
        <div className="pa-field">
          <label className="pa-label">Qtd. animais</label>
          <input className="pa-input" type="number" min={0} value={count}
            onChange={(e) => setCount(Number(e.target.value))} />
        </div>
        <div className="pa-field">
          <label className="pa-label">Castração</label>
          <select className="pa-select" value={neuter}
            onChange={(e) => setNeuter(e.target.value as NeuterStatus)}>
            {(['none','partial','in_progress','complete'] as NeuterStatus[]).map((s) =>
              <option key={s} value={s}>{NEUTER_LABEL[s]}</option>)}
          </select>
        </div>
      </div>
      <div className="pa-field">
        <label className="pa-label">Necessidades</label>
        <div className="pa-checks">
          {(Object.keys(NEED_LABEL) as ColonyNeed[]).map((n) => (
            <label key={n}>
              <input type="checkbox" checked={needs.includes(n)} onChange={() => toggleNeed(n)} />
              <span>{NEED_LABEL[n]}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="pa-field">
        <label className="pa-label">Quem está atualizando? (opcional)</label>
        <input className="pa-input" value={changedBy} placeholder="Seu nome"
          onChange={(e) => setChangedBy(e.target.value)} />
      </div>
      <div className="pa-field">
        <label className="pa-label">Observação (opcional)</label>
        <input className="pa-input" value={note} placeholder="Ex.: 2 gatinhos novos nasceram"
          onChange={(e) => setNote(e.target.value)} />
      </div>
      {error ? <div style={{ color: '#c0392b', fontSize: 13 }}>{error}</div> : null}
      <button type="submit" className="pa-btn" disabled={busy} style={{ width: '100%' }}>
        {busy ? 'Salvando…' : 'Salvar atualização'}
      </button>
    </form>
  );
}

// ============= composer de post =============
function PostComposer({
  colonyId, onPosted,
}: { colonyId: string; onPosted: () => void }): JSX.Element {
  const [type, setType] = useState<PostType>('update');
  const [body, setBody] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorContact, setAuthorContact] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!body.trim() && photos.length === 0) {
      setError('Escreva algo ou anexe uma foto.');
      return;
    }
    setBusy(true); setError(null);
    try {
      await api.post(`/colonies/${colonyId}/posts`, {
        body: body.trim() || '(sem texto)',
        postType: type,
        authorName: authorName || undefined,
        authorContact: authorContact || undefined,
        photos,
      });
      setBody(''); setPhotos([]); setAuthorContact('');
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="pa-composer">
      <div className="pa-type-grid">
        {(Object.keys(POST_TYPE_LABEL) as PostType[]).map((t) => (
          <button
            key={t} type="button"
            className={type === t ? 'active' : ''}
            onClick={() => setType(t)}
          >
            {POST_TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <textarea
        className="pa-textarea"
        placeholder={
          type === 'need'           ? 'O que está faltando? Quantos? Quando precisa?'
          : type === 'question'     ? 'Faça uma pergunta para a comunidade…'
          : type === 'donation_offer' ? 'O que você pode doar? (ração, remédio, abrigo, tempo…)'
          : type === 'action_done'  ? 'Conte o que você fez hoje pela colônia.'
          : 'Compartilhe uma atualização, observação, recadinho…'
        }
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <MultiImageUpload value={photos} onChange={setPhotos} />
      <div className="pa-row" style={{ marginTop: 8 }}>
        <input className="pa-input" placeholder="Seu nome (opcional)"
          value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
        <input className="pa-input" placeholder="WhatsApp/e-mail (opcional)"
          value={authorContact} onChange={(e) => setAuthorContact(e.target.value)} />
      </div>
      {error ? <div style={{ color: '#c0392b', fontSize: 13, marginTop: 4 }}>{error}</div> : null}
      <button type="submit" className="pa-btn" disabled={busy}
        style={{ width: '100%', marginTop: 8 }}>
        {busy ? 'Publicando…' : 'Publicar no fórum'}
      </button>
    </form>
  );
}

// ============= card de post =============
function PostCard({
  post, onOpenPhoto,
}: { post: ColonyPost; onOpenPhoto: (url: string) => void }): JSX.Element {
  return (
    <article className="pa-post" style={{ borderLeftColor: POST_TYPE_COLOR[post.postType] }}>
      <div className="meta">
        <span><strong style={{ color: POST_TYPE_COLOR[post.postType] }}>
          {POST_TYPE_LABEL[post.postType]}
        </strong> · {post.authorName ?? 'Anônimo'}</span>
        <span>{new Date(post.createdAt).toLocaleString('pt-BR')}</span>
      </div>
      <div className="body">{post.body}</div>
      {post.photos.length > 0 ? (
        <div className="photos">
          {post.photos.map((url) => (
            <img key={url} src={url} alt="" onClick={() => onOpenPhoto(url)} />
          ))}
        </div>
      ) : null}
      {post.authorContact ? (
        <div style={{ fontSize: 11, color: '#6b7c8c', marginTop: 6 }}>
          📨 {post.authorContact}
        </div>
      ) : null}
    </article>
  );
}
