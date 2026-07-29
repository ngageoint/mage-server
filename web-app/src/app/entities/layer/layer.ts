export type Layer = {
  type?: 'Imagery' | 'Feature' | 'GeoPackage' | string;
};

export function layerIconName(layer: Layer | null | undefined): string {
  if (!layer) return 'map';
  if (layer.type === 'Imagery') return 'satellite_alt';
  if (layer.type === 'GeoPackage') return 'database';
  if (layer.type === 'Feature') return 'place';
  return 'map';
}
