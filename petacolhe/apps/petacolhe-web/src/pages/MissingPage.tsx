import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { SPECIES_LABEL, type MissingAlert, type Species } from '../api/types.js';

export function MissingPage(): JSX.Element {
  const [items, setItems] = useState<MissingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [species, setSpecies] = useState<Species | ''>('');

  const load = useCallback(async (): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const qs = species ? `?species=${species}` : '';
      const data = await api.get<MissingAlert[]>(`/missing${qs}`);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro');
    } finally {
      setLoading(false);
    }
  }, [species]);

  useEffect(() => { void load(); }, [load]);

  const markFound = async (id: string): Promise<void> => {
    if (!window.confirm('Marcar como encontrado?')) return;
    await api.patch(`/missing/${id}/found`, {});
    void load();
  };

  return (
    <div className="pa-grid-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>🔔 Pets desaparecidos</h1>
        <select className="pa-select" style={{ width: 180 }} value={species}
          onChange={(e) => setSpecies(e.target.value as Species | '')}>
          <option value="">Todas as espécies</option>
          <option value="dog">Cachorros</option>
          <option value="cat">Gatos</option>
          <option value="other">Outros</option>
        </select>
      </div>
      <p style={{ color: '#6b7c8c' }}>Para cadastrar um novo desaparecimento, clique no local exato no mapa.</p>

      {loading ? <p>Carregando…</p> : null}
      {error  ? <p style={{ color: '#c0392b' }}>{error}</p> : null}
      {!loading && items.length === 0 ? <p>Nenhum alerta ativo no momento. 🎉</p> : null}

      <div className="pa-grid">
        {items.map((m) => (
          <article className="pa-card" key={m.id}>
            <div className="img" style={m.imageUrl ? { backgroundImage: `url(${m.imageUrl})` } : undefined}>
              {m.imageUrl ? null : '🐕'}
            </div>
            <div className="body">
              <h3>{m.petName}</h3>
              <div style={{ marginBottom: 4 }}>
                {m.isFound ? <span className="pa-badge free">encontrado</span>
                           : <span className="pa-badge urgent">desaparecido</span>}
              </div>
              <p>
                {SPECIES_LABEL[m.species]} · {m.title}
              </p>
              <p style={{ fontSize: 12 }}>Visto: {new Date(m.lastSeenAt).toLocaleString('pt-BR')}</p>
              {m.description ? <p>{m.description}</p> : null}
              {m.contactPhone ? <p style={{ fontSize: 12 }}>📞 {m.contactPhone}</p> : null}
              {m.contactEmail ? <p style={{ fontSize: 12 }}>✉️ {m.contactEmail}</p> : null}
              {m.reward       ? <p style={{ fontSize: 12 }}>🎁 {m.reward}</p> : null}
              {!m.isFound ? (
                <div className="actions">
                  <button className="pa-btn" onClick={() => void markFound(m.id)}>Marcar encontrado</button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
