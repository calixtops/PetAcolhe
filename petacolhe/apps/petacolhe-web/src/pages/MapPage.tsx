import { useCallback, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { GeoMap } from '@core/frontend';
import type { GeoPointDTO } from '@core/frontend';
import { api } from '../api/client.js';
import {
  NEUTER_LABEL, NEED_LABEL, PARTNER_COLOR, PARTNER_SERVICE_LABEL,
  PARTNER_TYPE_LABEL, SPECIES_LABEL,
  type Colony, type MissingAlert, type Partner,
} from '../api/types.js';
import { ColonyDetailDrawer } from '../components/ColonyDetailDrawer.js';
import { DEFAULT_FILTERS, MapFilters, type MapFiltersValue } from '../components/MapFilters.js';
import { NewPointModal } from '../components/NewPointModal.js';

const CENTER = { lng: -38.5267, lat: -3.7327 };

type AnyMeta = { kind: 'colony' | 'missing' | 'partner'; raw: Colony | MissingAlert | Partner };

export function MapPage(): JSX.Element {
  const [colonies, setColonies] = useState<Colony[]>([]);
  const [missing, setMissing]   = useState<MissingAlert[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filters, setFilters]   = useState<MapFiltersValue>(DEFAULT_FILTERS);
  const [clickLoc, setClickLoc] = useState<{ lng: number; lat: number } | null>(null);
  const [openColonyId, setOpenColonyId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState(CENTER);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  const locateMe = useCallback((): void => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada neste dispositivo');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setMapCenter({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      (err) => setError(`Não foi possível obter localização: ${err.message}`),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.species)      params.set('species', filters.species);
      if (filters.neuterStatus) params.set('neuterStatus', filters.neuterStatus);
      if (filters.needs.length) params.set('needs', filters.needs.join(','));
      const colonyQuery = params.toString() ? `?${params.toString()}` : '';

      const missingParams = filters.species ? `?species=${filters.species}` : '';

      const partnerParams = new URLSearchParams();
      if (filters.onlyFreePartners) partnerParams.set('onlyFree', 'true');
      const partnerQuery = partnerParams.toString() ? `?${partnerParams.toString()}` : '';

      const [c, m, p] = await Promise.all([
        api.get<Colony[]>(`/colonies${colonyQuery}`),
        api.get<MissingAlert[]>(`/missing${missingParams}`),
        api.get<Partner[]>(`/partners${partnerQuery}`),
      ]);
      setColonies(c); setMissing(m); setPartners(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void reload(); }, [reload]);

  const points = useMemo<GeoPointDTO<AnyMeta>[]>(() => {
    const out: GeoPointDTO<AnyMeta>[] = [];
    if (filters.showColonies) {
      colonies.forEach((c) => out.push({
        id: `col-${c.id}`, kind: 'petacolhe:colony', title: c.title,
        description: c.description, lng: c.lng, lat: c.lat, imageUrl: c.imageUrl,
        metadata: { kind: 'colony', raw: c }, createdAt: c.createdAt,
      }));
    }
    if (filters.showMissing) {
      missing.forEach((m) => out.push({
        id: `mis-${m.id}`, kind: 'petacolhe:missing', title: m.title,
        description: m.description, lng: m.lng, lat: m.lat, imageUrl: m.imageUrl,
        metadata: { kind: 'missing', raw: m }, createdAt: m.createdAt,
      }));
    }
    if (filters.showPartners) {
      partners.forEach((p) => out.push({
        id: `par-${p.id}`, kind: 'petacolhe:partner', title: p.title,
        description: p.description, lng: p.lng, lat: p.lat, imageUrl: p.imageUrl,
        metadata: { kind: 'partner', raw: p }, createdAt: p.createdAt,
      }));
    }
    return out;
  }, [colonies, missing, partners, filters]);

  return (
    <>
      {loading ? <div className="pa-banner">Carregando…</div> : null}
      {error  ? <div className="pa-banner error" onClick={() => setError(null)}>Erro: {error}</div> : null}
      <div className="pa-hint">👆 Toque no mapa para cadastrar um ponto</div>

      <MapFilters
        value={filters} onChange={setFilters}
        isOpen={filtersOpen} onClose={() => setFiltersOpen(false)}
      />
      {filtersOpen ? (
        <div className="pa-drawer-backdrop" onClick={() => setFiltersOpen(false)} style={{ zIndex: 1550 }} />
      ) : null}
      <button className="pa-fab filters" aria-label="Filtros" onClick={() => setFiltersOpen(true)}>⚙️</button>
      <button className="pa-fab locate" aria-label="Minha localização" onClick={locateMe}>📍</button>

      <GeoMap<AnyMeta>
        points={points}
        center={mapCenter}
        zoom={13}
        theme={{ accentColor: '#27ae60' }}
        onMapClick={(loc) => setClickLoc(loc)}
        iconFor={(p) => iconForMeta(p.metadata)}
        renderPopup={(p) =>
          <PopupContent meta={p.metadata} onChanged={reload} onOpenColony={setOpenColonyId} />}
      />

      {clickLoc ? (
        <NewPointModal
          location={clickLoc}
          onClose={() => setClickLoc(null)}
          onCreated={reload}
        />
      ) : null}

      {openColonyId ? (
        <ColonyDetailDrawer
          colonyId={openColonyId}
          onClose={() => setOpenColonyId(null)}
          onChanged={reload}
        />
      ) : null}
    </>
  );
}

/** Pin custom (PNG da marca) usado para colônias. */
const COLONY_PIN_ICON = L.icon({
  iconUrl: '/pin.png',
  iconRetinaUrl: '/pin.png',
  iconSize: [44, 56],
  iconAnchor: [22, 54],
  popupAnchor: [0, -50],
  className: 'pa-pin-colony',
});

/** divIcon emoji para outras categorias — destaque visual maior. */
function makeEmojiIcon(emoji: string, bg: string, ring = '#fff', size = 40): L.DivIcon {
  return L.divIcon({
    className: 'pa-emoji-pin',
    html: `
      <div class="pa-emoji-pin-inner" style="background:${bg};border-color:${ring};">
        <span>${emoji}</span>
      </div>
      <div class="pa-emoji-pin-tip" style="border-top-color:${bg};"></div>
    `,
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -size],
  });
}

function iconForMeta(meta: AnyMeta): L.Icon | L.DivIcon {
  if (meta.kind === 'colony') return COLONY_PIN_ICON;
  if (meta.kind === 'missing') {
    const m = meta.raw as MissingAlert;
    return m.isFound
      ? makeEmojiIcon('✓', '#7f8c8d')
      : makeEmojiIcon('🔔', '#9b59b6');
  }
  const p = meta.raw as Partner;
  return makeEmojiIcon('🏥', PARTNER_COLOR[p.partnerType]);
}

function PopupContent({
  meta, onChanged, onOpenColony,
}: { meta: AnyMeta; onChanged: () => void; onOpenColony: (id: string) => void }): JSX.Element {
  if (meta.kind === 'colony')
    return <ColonyPopup c={meta.raw as Colony} onOpen={() => onOpenColony((meta.raw as Colony).id)} />;
  if (meta.kind === 'missing')
    return <MissingPopup m={meta.raw as MissingAlert} onChanged={onChanged} />;
  return <PartnerPopup p={meta.raw as Partner} />;
}

function ColonyPopup({ c, onOpen }: { c: Colony; onOpen: () => void }): JSX.Element {
  return (
    <div style={{ minWidth: 220 }}>
      <strong>🐾 {c.title}</strong>
      <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
        {SPECIES_LABEL[c.species]} · ~{c.estimatedCount} animais · {NEUTER_LABEL[c.neuterStatus]}
      </div>
      {c.needs.length ? (
        <div style={{ margin: '6px 0' }}>
          {c.needs.slice(0, 4).map((n) => <span key={n} className="pa-badge">{NEED_LABEL[n]}</span>)}
          {c.needs.length > 4 ? <span className="pa-badge">+{c.needs.length - 4}</span> : null}
        </div>
      ) : null}
      {c.imageUrl
        ? <img src={c.imageUrl} alt="" style={{ marginTop: 6, maxWidth: '100%', borderRadius: 4 }} />
        : null}
      <button className="pa-btn" style={{ width: '100%', marginTop: 8 }} onClick={onOpen}>
        📝 Abrir colônia e fórum
      </button>
    </div>
  );
}

function MissingPopup({ m, onChanged }: { m: MissingAlert; onChanged: () => void }): JSX.Element {
  const markFound = async (): Promise<void> => {
    if (!window.confirm(`Marcar ${m.petName} como encontrado(a)?`)) return;
    await api.patch(`/missing/${m.id}/found`, {});
    onChanged();
  };
  return (
    <div style={{ minWidth: 220 }}>
      <strong>🔔 {m.title}</strong>
      {m.isFound ? <span className="pa-badge free" style={{ marginLeft: 6 }}>encontrado</span> : null}
      <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
        {SPECIES_LABEL[m.species]} · {m.petName}
      </div>
      <div style={{ fontSize: 12 }}>Visto: {new Date(m.lastSeenAt).toLocaleString('pt-BR')}</div>
      {m.description ? <p style={{ margin: '6px 0', fontSize: 13 }}>{m.description}</p> : null}
      {m.contactPhone ? <div style={{ fontSize: 12 }}>📞 {m.contactPhone}</div> : null}
      {m.contactEmail ? <div style={{ fontSize: 12 }}>✉️ {m.contactEmail}</div> : null}
      {m.reward       ? <div style={{ fontSize: 12 }}>🎁 Recompensa: {m.reward}</div> : null}
      {m.imageUrl ? <img src={m.imageUrl} alt="" style={{ marginTop: 6, maxWidth: '100%', borderRadius: 4 }} /> : null}
      {!m.isFound ? (
        <button className="pa-btn" style={{ marginTop: 8 }} onClick={() => void markFound()}>
          Marcar como encontrado
        </button>
      ) : null}
    </div>
  );
}

function PartnerPopup({ p }: { p: Partner }): JSX.Element {
  return (
    <div style={{ minWidth: 220 }}>
      <strong>🤝 {p.title}</strong>
      <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
        {PARTNER_TYPE_LABEL[p.partnerType]}
        {p.freeServices ? <span className="pa-badge free" style={{ marginLeft: 6 }}>gratuito</span> : null}
      </div>
      {p.services.length ? (
        <div style={{ margin: '6px 0' }}>
          {p.services.map((s) => <span key={s} className="pa-badge">{PARTNER_SERVICE_LABEL[s]}</span>)}
        </div>
      ) : null}
      {p.description  ? <p style={{ margin: '6px 0', fontSize: 13 }}>{p.description}</p> : null}
      {p.contactPhone ? <div style={{ fontSize: 12 }}>📞 {p.contactPhone}</div> : null}
      {p.contactEmail ? <div style={{ fontSize: 12 }}>✉️ {p.contactEmail}</div> : null}
      {p.website      ? <div style={{ fontSize: 12 }}>🔗 <a href={p.website} target="_blank" rel="noreferrer">{p.website}</a></div> : null}
      {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ marginTop: 6, maxWidth: '100%', borderRadius: 4 }} /> : null}
    </div>
  );
}
