export type LayerId = number

type LayerState = 'available' | 'unavailable' | 'processing'

export type Layer = ImageryLayer | FeatureLayer | GeoPackageLayer

interface ImageryLayer {
  type: 'Imagery'
  id: LayerId
  name: string
  state: LayerState
  url?: string
  base?: boolean
  format?: 'XYZ' | 'TMS' | 'WMS'
  wms?: { layers?: string, styles?: string, format?: string, transparent?: boolean, version?: string }
}

interface FeatureLayer {
  type: 'Feature'
  id: LayerId
  name: string
  state: LayerState
  url?: string
}

interface GeoPackageTable {
  name: string
  type: 'tile' | 'feature'
  minZoom?: number
  maxZoom?: number
  bbox?: number[]
}

interface GeoPackageLayer {
  type: 'GeoPackage'
  id: LayerId
  name: string
  state: LayerState
  tables?: GeoPackageTable[]
}

export function layerIconName(layer: { type?: Layer['type'] } | null | undefined): string {
  if (!layer) return 'map'
  if (layer.type === 'Imagery') return 'satellite_alt'
  if (layer.type === 'GeoPackage') return 'database'
  if (layer.type === 'Feature') return 'place'
  return 'map'
}
