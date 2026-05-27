import type { Species, NeuterStatus, ColonyNeed } from '../api/types.js';
import { SPECIES_LABEL, NEUTER_LABEL, NEED_LABEL } from '../api/types.js';

export interface MapFiltersValue {
  showColonies: boolean;
  showMissing: boolean;
  showPartners: boolean;
  species: Species | null;
  neuterStatus: NeuterStatus | null;
  needs: ColonyNeed[];
  onlyFreePartners: boolean;
}

export const DEFAULT_FILTERS: MapFiltersValue = {
  showColonies: true,
  showMissing: true,
  showPartners: true,
  species: null,
  neuterStatus: null,
  needs: [],
  onlyFreePartners: false,
};

interface Props {
  value: MapFiltersValue;
  onChange: (v: MapFiltersValue) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function MapFilters({ value, onChange, isOpen = false, onClose }: Props): JSX.Element {
  const set = <K extends keyof MapFiltersValue>(k: K, v: MapFiltersValue[K]): void =>
    onChange({ ...value, [k]: v });

  const toggleNeed = (n: ColonyNeed): void =>
    set('needs', value.needs.includes(n) ? value.needs.filter((x) => x !== n) : [...value.needs, n]);

  return (
    <aside className={`pa-filters${isOpen ? ' is-open' : ''}`}>
      {onClose ? (
        <button className="pa-filters-close" onClick={onClose} aria-label="Fechar filtros">×</button>
      ) : null}
      <h3>Camadas</h3>
      <div className="pa-checks" style={{ marginBottom: 10 }}>
        <label><input type="checkbox" checked={value.showColonies} onChange={(e) => set('showColonies', e.target.checked)} /><span>🐾 Colônias</span></label>
        <label><input type="checkbox" checked={value.showMissing}  onChange={(e) => set('showMissing',  e.target.checked)} /><span>🔔 Desaparecidos</span></label>
        <label><input type="checkbox" checked={value.showPartners} onChange={(e) => set('showPartners', e.target.checked)} /><span>🤝 Parceiros</span></label>
      </div>

      <h3>Espécie</h3>
      <select className="pa-select" value={value.species ?? ''}
        onChange={(e) => set('species', (e.target.value || null) as Species | null)}>
        <option value="">Todas</option>
        {(['cat', 'dog', 'other'] as Species[]).map((s) =>
          <option key={s} value={s}>{SPECIES_LABEL[s]}</option>)}
      </select>

      <h3 style={{ marginTop: 10 }}>Castração (colônias)</h3>
      <select className="pa-select" value={value.neuterStatus ?? ''}
        onChange={(e) => set('neuterStatus', (e.target.value || null) as NeuterStatus | null)}>
        <option value="">Qualquer</option>
        {(['none', 'partial', 'in_progress', 'complete'] as NeuterStatus[]).map((s) =>
          <option key={s} value={s}>{NEUTER_LABEL[s]}</option>)}
      </select>

      <h3 style={{ marginTop: 10 }}>Necessidades</h3>
      <div className="pa-checks">
        {(Object.keys(NEED_LABEL) as ColonyNeed[]).map((n) => (
          <label key={n}>
            <input type="checkbox" checked={value.needs.includes(n)} onChange={() => toggleNeed(n)} />
            <span>{NEED_LABEL[n]}</span>
          </label>
        ))}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13 }}>
        <input type="checkbox" checked={value.onlyFreePartners}
          onChange={(e) => set('onlyFreePartners', e.target.checked)} />
        <span>Só parceiros gratuitos</span>
      </label>
    </aside>
  );
}
