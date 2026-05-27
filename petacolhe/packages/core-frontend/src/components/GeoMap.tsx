import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, type ReactNode } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { GeoPointDTO, LngLat } from '../types/geo.js';

// Corrige ícones quebrados padrão do Leaflet quando empacotado por Vite/Webpack.
// Sem isso aparecem 404s para marker-icon.png.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface GeoMapTheme {
  /** URL tile XYZ — default: OpenStreetMap. */
  tileUrl?: string;
  tileAttribution?: string;
  /** Cor de destaque do app (usada em ícones custom). */
  accentColor?: string;
}

export interface GeoMapProps<TMeta extends object = Record<string, unknown>> {
  points: ReadonlyArray<GeoPointDTO<TMeta>>;
  center: LngLat;
  zoom?: number;
  theme?: GeoMapTheme;
  /** Permite o app definir um ícone por ponto (status, categoria, etc). */
  iconFor?: (point: GeoPointDTO<TMeta>) => L.DivIcon | L.Icon | undefined;
  /** Conteúdo customizado do popup (recebe o ponto). */
  renderPopup?: (point: GeoPointDTO<TMeta>) => ReactNode;
  /** Clique no mapa (lng/lat) — útil para cadastrar novo ponto. */
  onMapClick?: (location: LngLat) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente de mapa reutilizável entre ZelaCid e PetAcolhe.
 * Toda a lógica de tiles, marcadores e popups vive aqui; cada app
 * só precisa fornecer pontos + tema + ícones.
 */
export function GeoMap<TMeta extends object = Record<string, unknown>>({
  points,
  center,
  zoom = 13,
  theme,
  iconFor,
  renderPopup,
  onMapClick,
  className,
  style,
}: GeoMapProps<TMeta>): JSX.Element {
  const tileUrl = theme?.tileUrl ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution =
    theme?.tileAttribution ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className={className}
      style={{ width: '100%', height: '100%', minHeight: 480, ...style }}
    >
      <TileLayer url={tileUrl} attribution={attribution} />
      <FlyToCenter center={center} />
      {onMapClick ? <ClickCapture onMapClick={onMapClick} /> : null}
      {points.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          {...(iconFor?.(p) ? { icon: iconFor(p)! } : {})}
        >
          <Popup>{renderPopup ? renderPopup(p) : <DefaultPopup point={p} />}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function ClickCapture({ onMapClick }: { onMapClick: (loc: LngLat) => void }): null {
  useMapEvents({
    click(e) {
      onMapClick({ lng: e.latlng.lng, lat: e.latlng.lat });
    },
  });
  return null;
}

function FlyToCenter({ center }: { center: LngLat }): null {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);
  return null;
}

function DefaultPopup<TMeta extends object>({ point }: { point: GeoPointDTO<TMeta> }): JSX.Element {
  return (
    <div style={{ minWidth: 180 }}>
      <strong>{point.title}</strong>
      {point.description ? <p style={{ margin: '4px 0' }}>{point.description}</p> : null}
      <small>{new Date(point.createdAt).toLocaleString()}</small>
    </div>
  );
}

/** Helper p/ criar ícone colorido sem depender de assets. */
export function makeColoredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'geo-map-pin',
    html: `<div style="
      width:22px;height:22px;border-radius:50% 50% 50% 0;
      background:${color};border:2px solid #fff;
      transform:rotate(-45deg);box-shadow:0 2px 4px rgba(0,0,0,.35);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });
}
