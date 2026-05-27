import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { SPECIES_LABEL, type Adoption, type Species } from '../api/types.js';
import { ImageUpload } from '../components/ImageUpload.js';

export function AdoptionsPage(): JSX.Element {
  const [items, setItems] = useState<Adoption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [interestFor, setInterestFor] = useState<Adoption | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const data = await api.get<Adoption[]>('/adoptions');
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="pa-grid-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>🏠 Pets para adoção</h1>
        <button className="pa-btn" onClick={() => setShowForm(true)}>+ Cadastrar pet</button>
      </div>

      {loading ? <p>Carregando…</p> : null}
      {error  ? <p style={{ color: '#c0392b' }}>{error}</p> : null}
      {!loading && items.length === 0 ? (
        <p style={{ color: '#6b7c8c' }}>Ainda não há pets cadastrados. Que tal cadastrar o primeiro?</p>
      ) : null}

      <div className="pa-grid">
        {items.map((a) => (
          <article className="pa-card" key={a.id}>
            <div
              className="img"
              style={a.imageUrl ? { backgroundImage: `url(${a.imageUrl})` } : undefined}
            >
              {a.imageUrl ? null : '🐶'}
            </div>
            <div className="body">
              <h3>{a.name}</h3>
              <div style={{ marginBottom: 4 }}>
                {a.isUrgent  ? <span className="pa-badge urgent">URGENTE</span> : null}
                {a.isAdopted ? <span className="pa-badge free">adotado</span> : null}
                {a.isNeutered ? <span className="pa-badge">castrado</span> : null}
              </div>
              <p>
                {SPECIES_LABEL[a.species]}
                {a.ageMonths != null ? ` · ${a.ageMonths} meses` : ''}
                {a.city ? ` · ${a.city}` : ''}
              </p>
              {a.description ? <p>{a.description}</p> : null}
              <div className="actions">
                {!a.isAdopted ? (
                  <button className="pa-btn" onClick={() => setInterestFor(a)}>Tenho interesse</button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {showForm     ? <NewAdoptionModal onClose={() => setShowForm(false)} onCreated={load} /> : null}
      {interestFor ? <InterestModal adoption={interestFor} onClose={() => setInterestFor(null)} /> : null}
    </div>
  );
}

// ============= modal: cadastrar pet =============
function NewAdoptionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }): JSX.Element {
  const [form, setForm] = useState({
    name: '', species: 'dog' as Species, ageMonths: '', description: '',
    isNeutered: false, isUrgent: false, city: '',
    contactEmail: '', contactPhone: '', imageUrl: null as string | null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.contactEmail && !form.contactPhone) {
      setError('Informe e-mail ou telefone de contato.');
      return;
    }
    setBusy(true); setError(null);
    try {
      await api.post('/adoptions', {
        name: form.name,
        species: form.species,
        ageMonths: form.ageMonths ? Number(form.ageMonths) : undefined,
        description: form.description || undefined,
        isNeutered: form.isNeutered,
        isUrgent: form.isUrgent,
        city: form.city || undefined,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
        imageUrl: form.imageUrl ?? undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pa-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="pa-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Cadastrar pet para adoção</h2>
        <div className="pa-field">
          <label className="pa-label">Nome do pet *</label>
          <input className="pa-input" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="pa-row">
          <div className="pa-field">
            <label className="pa-label">Espécie</label>
            <select className="pa-select" value={form.species}
              onChange={(e) => setForm({ ...form, species: e.target.value as Species })}>
              <option value="dog">Cachorro</option>
              <option value="cat">Gato</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div className="pa-field">
            <label className="pa-label">Idade (meses)</label>
            <input className="pa-input" type="number" min={0} value={form.ageMonths}
              onChange={(e) => setForm({ ...form, ageMonths: e.target.value })} />
          </div>
        </div>
        <div className="pa-field">
          <label className="pa-label">Descrição (temperamento, saúde, história)</label>
          <textarea className="pa-textarea" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="pa-field">
          <label className="pa-label">Cidade</label>
          <input className="pa-input" value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="pa-row">
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={form.isNeutered}
              onChange={(e) => setForm({ ...form, isNeutered: e.target.checked })} /> Castrado
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={form.isUrgent}
              onChange={(e) => setForm({ ...form, isUrgent: e.target.checked })} /> Adoção urgente
          </label>
        </div>
        <div className="pa-row">
          <div className="pa-field">
            <label className="pa-label">E-mail</label>
            <input className="pa-input" type="email" value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </div>
          <div className="pa-field">
            <label className="pa-label">WhatsApp</label>
            <input className="pa-input" value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          </div>
        </div>
        <div className="pa-field">
          <label className="pa-label">Foto do pet</label>
          <ImageUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
        </div>
        {error ? <div style={{ color: '#c0392b', fontSize: 13 }}>{error}</div> : null}
        <div className="pa-modal-actions">
          <button type="button" className="pa-btn ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className="pa-btn" disabled={busy}>{busy ? 'Salvando…' : 'Cadastrar'}</button>
        </div>
      </form>
    </div>
  );
}

// ============= modal: tenho interesse =============
function InterestModal({ adoption, onClose }: { adoption: Adoption; onClose: () => void }): JSX.Element {
  const [form, setForm] = useState({ name: '', contactEmail: '', contactPhone: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tutor, setTutor] = useState<{ tutorEmail: string | null; tutorPhone: string | null } | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.contactEmail && !form.contactPhone) {
      setError('Informe e-mail ou telefone para contato.');
      return;
    }
    setBusy(true); setError(null);
    try {
      const res = await api.post<{ interestId: string; tutorEmail: string | null; tutorPhone: string | null }>(
        `/adoptions/${adoption.id}/interest`,
        {
          name: form.name,
          contactEmail: form.contactEmail || undefined,
          contactPhone: form.contactPhone || undefined,
          message: form.message || undefined,
        },
      );
      setTutor({ tutorEmail: res.tutorEmail, tutorPhone: res.tutorPhone });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pa-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pa-modal" onMouseDown={(e) => e.stopPropagation()}>
        {tutor ? (
          <>
            <h2>✨ Obrigado!</h2>
            <p>Seu interesse em adotar <strong>{adoption.name}</strong> foi registrado.</p>
            <p>O tutor responsável receberá seu contato. Aqui estão os contatos dele(a):</p>
            <ul>
              {tutor.tutorEmail ? <li>✉️ {tutor.tutorEmail}</li> : null}
              {tutor.tutorPhone ? <li>📞 {tutor.tutorPhone}</li> : null}
              {!tutor.tutorEmail && !tutor.tutorPhone
                ? <li style={{ color: '#6b7c8c' }}>Sem contato cadastrado — aguarde retorno.</li>
                : null}
            </ul>
            <div className="pa-modal-actions">
              <button className="pa-btn" onClick={onClose}>Fechar</button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <h2>Tenho interesse em adotar {adoption.name}</h2>
            <div className="pa-field">
              <label className="pa-label">Seu nome *</label>
              <input className="pa-input" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="pa-row">
              <div className="pa-field">
                <label className="pa-label">E-mail</label>
                <input className="pa-input" type="email" value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              </div>
              <div className="pa-field">
                <label className="pa-label">WhatsApp</label>
                <input className="pa-input" value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
              </div>
            </div>
            <div className="pa-field">
              <label className="pa-label">Mensagem (opcional)</label>
              <textarea className="pa-textarea" value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Conte um pouco sobre você, sua casa, outros pets..." />
            </div>
            {error ? <div style={{ color: '#c0392b', fontSize: 13 }}>{error}</div> : null}
            <div className="pa-modal-actions">
              <button type="button" className="pa-btn ghost" onClick={onClose} disabled={busy}>Cancelar</button>
              <button type="submit" className="pa-btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar interesse'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
