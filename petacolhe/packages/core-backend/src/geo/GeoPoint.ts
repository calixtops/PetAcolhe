/**
 * Tipos compartilhados de pontos geoespaciais.
 *
 * Convenção: API recebe/devolve {lng, lat} (GeoJSON-like — X, Y).
 * O banco trabalha com GEOMETRY(Point, 4326).
 */
export interface LngLat {
  lng: number;
  lat: number;
}

export interface GeoPoint<TMeta extends object = Record<string, unknown>> {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  lng: number;
  lat: number;
  imageUrl: string | null;
  metadata: TMeta;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGeoPointInput<TMeta extends object = Record<string, unknown>> {
  kind: string;
  title: string;
  description?: string | null;
  location: LngLat;
  imageUrl?: string | null;
  metadata?: TMeta;
  createdBy?: string | null;
}

export interface NearbyQuery {
  kind: string;
  center: LngLat;
  radiusMeters: number;
  limit?: number;
}
