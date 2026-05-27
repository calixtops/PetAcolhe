import { useState, type ReactNode } from 'react';
import { api } from '../api/client.js';
import {
  NEED_LABEL, PARTNER_SERVICE_LABEL, PARTNER_TYPE_LABEL, SPECIES_LABEL,
  type ColonyNeed, type PartnerService, type PartnerType, type Species,
} from '../api/types.js';
import { ImageUpload } from './ImageUpload.js';

interface Props {
  location: { lng: number; lat: number };
  onClose: () => void;
  onCreated: () => void; // recarregar pontos
}

type Tab = 'colony' | 'missing' | 'partner';

export function NewPointModal({ location, onClose, onCreated }: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>('colony');

  return (
    <Overlay onClose={onClose}>
      <h2>Cadastrar ponto no mapa</h2>
      <div style={{ fontSize: 12, color: '#6b7c8c', marginBottom: 8 }}>
        📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
      </div>
      <div className="pa-modal-tabs">
        <TabBtn active={tab === 'colony'}  onClick={() => setTab('colony')}>🐾 Colônia</TabBtn>
        <TabBtn active={tab === 'missing'} onClick={() => setTab('missing')}>🔔 Desaparecido</TabBtn>
        <TabBtn active={tab === 'partner'} onClick={() => setTab('partner')}>🤝 Parceiro</TabBtn>
      </div>
      {tab === 'colony'  && <ColonyForm  location={location} onClose={onClose} onCreated={onCreated} />}
      {tab === 'missing' && <MissingForm location={location} onClose={onClose} onCreated={onCreated} />}
      {tab === 'partner' && <PartnerForm location={location} onClose={onClose} onCreated={onCreated} />}
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }): JSX.Element {
  return (
    <div className="pa-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pa-modal" onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function TabBtn({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }): JSX.Element {
  return <button className={active ? 'active' : ''} onClick={onClick}>{children}</button>;
}

// =================== COLONY ===================
function ColonyForm({ location, onClose, onCreated }: Props): JSX.Element {
  const [form, setForm] = useState({
    title: '', description: '', species: 'cat' as Species,
    estimatedCount: 1, neuterStatus: 'none' as 'none' | 'partial' | 'in_progress' | 'complete',
    caretakerName: '', contactPhone: '', contactEmail: '',
    feedingSchedule: '', needs: [] as ColonyNeed[], imageUrl: null as string | null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api.post('/colonies', {
        title: form.title,
        description: form.description || undefined,
        lng: location.lng, lat: location.lat,
        species: form.species,
        estimatedCount: Number(form.estimatedCount),
        neuterStatus: form.neuterStatus,
        caretakerName: form.caretakerName || undefined,
        contactPhone: form.contactPhone || undefined,
        contactEmail: form.contactEmail || undefined,
        feedingSchedule: form.feedingSchedule || undefined,
        needs: form.needs,
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

  const toggleNeed = (n: ColonyNeed): void => {
    setForm((f) => ({
      ...f,
      needs: f.needs.includes(n) ? f.needs.filter((x) => x !== n) : [...f.needs, n],
    }));
  };

  return (
    <form onSubmit={submit}>
      <Field label="Nome / referência da colônia *">
        <input className="pa-input" required minLength={3} value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Gatinhos da Praça Central" />
      </Field>
      <div className="pa-row">
        <Field label="Espécie">
          <select className="pa-select" value={form.species}
            onChange={(e) => setForm({ ...form, species: e.target.value as Species })}>
            {(['cat', 'dog', 'other'] as Species[]).map((s) =>
              <option key={s} value={s}>{SPECIES_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Quantidade estimada">
          <input className="pa-input" type="number" min={0} value={form.estimatedCount}
            onChange={(e) => setForm({ ...form, estimatedCount: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="Status de castração">
        <select className="pa-select" value={form.neuterStatus}
          onChange={(e) => setForm({ ...form, neuterStatus: e.target.value as typeof form.neuterStatus })}>
          <option value="none">Nenhum castrado</option>
          <option value="partial">Parcialmente castrados</option>
          <option value="in_progress">Castração em andamento</option>
          <option value="complete">Todos castrados</option>
        </select>
      </Field>
      <Field label="O que essa colônia precisa?">
        <div className="pa-checks">
          {(Object.keys(NEED_LABEL) as ColonyNeed[]).map((n) => (
            <label key={n}>
              <input type="checkbox" checked={form.needs.includes(n)} onChange={() => toggleNeed(n)} />
              <span>{NEED_LABEL[n]}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="Descrição / observações">
        <textarea className="pa-textarea" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Quantos filhotes, animais doentes, comportamento..." />
      </Field>
      <Field label="Rotina de alimentação">
        <input className="pa-input" value={form.feedingSchedule}
          onChange={(e) => setForm({ ...form, feedingSchedule: e.target.value })}
          placeholder="Ex.: alimentado 2x/dia por vizinha" />
      </Field>
      <div className="pa-row">
        <Field label="Cuidador (opcional)">
          <input className="pa-input" value={form.caretakerName}
            onChange={(e) => setForm({ ...form, caretakerName: e.target.value })} />
        </Field>
        <Field label="WhatsApp / telefone">
          <input className="pa-input" value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
        </Field>
      </div>
      <Field label="E-mail de contato">
        <input className="pa-input" type="email" value={form.contactEmail}
          onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
      </Field>
      <Field label="Foto (opcional)">
        <ImageUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
      </Field>
      {error ? <div style={{ color: '#c0392b', fontSize: 13 }}>{error}</div> : null}
      <Actions busy={busy} onClose={onClose} />
    </form>
  );
}

// =================== MISSING ===================
function MissingForm({ location, onClose, onCreated }: Props): JSX.Element {
  const [form, setForm] = useState({
    title: '', petName: '', species: 'dog' as Species,
    lastSeenAt: new Date().toISOString().slice(0, 16),
    description: '', contactPhone: '', contactEmail: '', reward: '',
    imageUrl: null as string | null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api.post('/missing', {
        title: form.title,
        description: form.description || undefined,
        lng: location.lng, lat: location.lat,
        species: form.species,
        petName: form.petName,
        lastSeenAt: new Date(form.lastSeenAt).toISOString(),
        contactPhone: form.contactPhone || undefined,
        contactEmail: form.contactEmail || undefined,
        reward: form.reward || undefined,
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
    <form onSubmit={submit}>
      <Field label="Título do alerta *">
        <input className="pa-input" required value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Ex.: Cachorro caramelo desapareceu na Aldeota" />
      </Field>
      <div className="pa-row">
        <Field label="Nome do pet *">
          <input className="pa-input" required value={form.petName}
            onChange={(e) => setForm({ ...form, petName: e.target.value })} />
        </Field>
        <Field label="Espécie">
          <select className="pa-select" value={form.species}
            onChange={(e) => setForm({ ...form, species: e.target.value as Species })}>
            {(['dog', 'cat', 'other'] as Species[]).map((s) =>
              <option key={s} value={s}>{SPECIES_LABEL[s]}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Visto pela última vez em *">
        <input className="pa-input" type="datetime-local" required value={form.lastSeenAt}
          onChange={(e) => setForm({ ...form, lastSeenAt: e.target.value })} />
      </Field>
      <Field label="Descrição (cor, porte, sinais)">
        <textarea className="pa-textarea" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>
      <div className="pa-row">
        <Field label="WhatsApp / telefone">
          <input className="pa-input" value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
        </Field>
        <Field label="E-mail">
          <input className="pa-input" type="email" value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
        </Field>
      </div>
      <Field label="Recompensa (opcional)">
        <input className="pa-input" value={form.reward}
          onChange={(e) => setForm({ ...form, reward: e.target.value })} />
      </Field>
      <Field label="Foto do pet">
        <ImageUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
      </Field>
      {error ? <div style={{ color: '#c0392b', fontSize: 13 }}>{error}</div> : null}
      <Actions busy={busy} onClose={onClose} />
    </form>
  );
}

// =================== PARTNER ===================
function PartnerForm({ location, onClose, onCreated }: Props): JSX.Element {
  const [form, setForm] = useState({
    title: '', description: '',
    partnerType: 'clinic' as PartnerType,
    services: [] as PartnerService[],
    contactPhone: '', contactEmail: '', website: '',
    freeServices: false, imageUrl: null as string | null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleService = (s: PartnerService): void => {
    setForm((f) => ({
      ...f,
      services: f.services.includes(s) ? f.services.filter((x) => x !== s) : [...f.services, s],
    }));
  };

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api.post('/partners', {
        title: form.title,
        description: form.description || undefined,
        lng: location.lng, lat: location.lat,
        partnerType: form.partnerType,
        services: form.services,
        contactPhone: form.contactPhone || undefined,
        contactEmail: form.contactEmail || undefined,
        website: form.website || undefined,
        freeServices: form.freeServices,
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
    <form onSubmit={submit}>
      <Field label="Nome do parceiro *">
        <input className="pa-input" required value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field label="Tipo">
        <select className="pa-select" value={form.partnerType}
          onChange={(e) => setForm({ ...form, partnerType: e.target.value as PartnerType })}>
          {(Object.keys(PARTNER_TYPE_LABEL) as PartnerType[]).map((t) =>
            <option key={t} value={t}>{PARTNER_TYPE_LABEL[t]}</option>)}
        </select>
      </Field>
      <Field label="Serviços oferecidos">
        <div className="pa-checks">
          {(Object.keys(PARTNER_SERVICE_LABEL) as PartnerService[]).map((s) => (
            <label key={s}>
              <input type="checkbox" checked={form.services.includes(s)} onChange={() => toggleService(s)} />
              <span>{PARTNER_SERVICE_LABEL[s]}</span>
            </label>
          ))}
        </div>
      </Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0' }}>
        <input type="checkbox" checked={form.freeServices}
          onChange={(e) => setForm({ ...form, freeServices: e.target.checked })} />
        <span>Oferece serviços gratuitos ou subsidiados</span>
      </label>
      <Field label="Descrição">
        <textarea className="pa-textarea" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>
      <div className="pa-row">
        <Field label="WhatsApp / telefone">
          <input className="pa-input" value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
        </Field>
        <Field label="E-mail">
          <input className="pa-input" type="email" value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
        </Field>
      </div>
      <Field label="Site / Instagram">
        <input className="pa-input" type="url" value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="https://..." />
      </Field>
      <Field label="Logo / foto">
        <ImageUpload value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
      </Field>
      {error ? <div style={{ color: '#c0392b', fontSize: 13 }}>{error}</div> : null}
      <Actions busy={busy} onClose={onClose} />
    </form>
  );
}

// ============ helpers ============
function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="pa-field">
      <label className="pa-label">{label}</label>
      {children}
    </div>
  );
}

function Actions({ busy, onClose }: { busy: boolean; onClose: () => void }): JSX.Element {
  return (
    <div className="pa-modal-actions">
      <button type="button" className="pa-btn ghost" onClick={onClose} disabled={busy}>Cancelar</button>
      <button type="submit" className="pa-btn" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
    </div>
  );
}
