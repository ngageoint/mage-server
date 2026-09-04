export type LayerId = number

export type Layer = {
  id: LayerId
  name: string
  type: 'Imagery' | 'Feature' | 'GeoPackage'
  state: 'available' | 'unavailable' | 'processing'
  url?: string
}

export function layerIconName(layer: { type?: Layer['type'] } | null | undefined): string {
  if (!layer) return 'map'
  if (layer.type === 'Imagery') return 'satellite_alt'
  if (layer.type === 'GeoPackage') return 'database'
  if (layer.type === 'Feature') return 'place'
  return 'map'
}
