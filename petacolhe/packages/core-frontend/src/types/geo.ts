export interface LngLat {
  lng: number;
  lat: number;
}

export interface GeoPointDTO<TMeta extends object = Record<string, unknown>> {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  lng: number;
  lat: number;
  imageUrl: string | null;
  metadata: TMeta;
  createdAt: string;
}
