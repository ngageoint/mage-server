import 'leaflet.markercluster'
import { TileLayer, GeoJSON as GeoJSONLayer, MarkerClusterGroup, Polyline, Polygon } from 'leaflet'
import { LayerId } from '../entities/layer/entities.layer'
import { LocationMarker } from './marker/LocationMarker'
import { ObservationMarker } from './marker/ObservationMarker'
import { GeoPackageRasterLayer } from './geopackage/GeoPackageLayer'
import { GARSLayer } from './layers/gars/GARSLayer'
import { MGRSLayer } from './layers/mgrs/MGRSLayer'

export type MapFeature = GeoJSON.Feature & { id: string | number, style?: { iconUrl?: string } }
export type MapFeatureLayer = LocationMarker | ObservationMarker | Polyline | Polygon

export type RasterLayer = {
  type: 'Imagery'
  id: LayerId
  name: string
  url: string
  base?: boolean
  selectedByDefault?: boolean
} & (
  | { format: 'XYZ' | 'TMS' }
  | { format: 'WMS', wms: { layers: string, version: string, format: string, transparent: boolean, styles?: string } }
)

export interface VectorLayer {
  type: 'vector'
  id: string
  name: string
  group: string
  selectedByDefault?: boolean
  hidden?: boolean
  cluster?: boolean
  iconUrl?: string
  iconWidth?: number
  temporal?: { property: string, colorBuckets: any[] }
  renderHooks: {
    popup?: ((layer: MapFeatureLayer, feature: MapFeature) => void) | { html: (feature: MapFeature) => string }
    onLayer?: (layer: MapFeatureLayer, feature: MapFeature) => void
  }
}

export interface GeoPackageLayer {
  type: 'GeoPackage'
  /**
   * unique per table, e.g. `${layerId}-${name}`
   */   
  id: string
  /**
   * the source GeoPackage layer's id - GeoPackageLayers' click-to-query-features handling looks features up by this, not by `id`
   */
  layerId: LayerId
  name: string
  renderAs: 'tile' | 'feature'
  url: string
  minZoom?: number
  maxZoom?: number
  bbox?: number[]
  selectedByDefault?: boolean
}

export interface GridOverlay {
  type: 'grid'
  id: 'gars' | 'mgrs'
  name: string
  selectedByDefault?: boolean
}

export type MapLayer = RasterLayer | GeoPackageLayer | VectorLayer | GridOverlay
export type MapLayerId = MapLayer['id']

export type RenderedMapLayer = (
  | (RasterLayer & { layer: TileLayer | TileLayer.WMS })
  | (GeoPackageLayer & { layer: GeoPackageRasterLayer })
  | (VectorLayer & { layer: GeoJSONLayer | MarkerClusterGroup, featureIdToLayer: Record<string, MapFeatureLayer> })
  | (GridOverlay & { layer: GARSLayer | MGRSLayer })
) & {
  layer: { options: { pane: string } }
  selected?: boolean
  zIndex?: number
}

export type RenderedRasterLayer = Extract<RenderedMapLayer, { type: 'Imagery' }>
