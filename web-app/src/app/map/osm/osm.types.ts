export interface OsmBounds { south: number; west: number; north: number; east: number }
export interface OsmArea { type: 'Polygon'; coordinates: number[][][] }

export interface OsmFeatureProperties {
  osm_id: number | string
  osm_type: string
  name?: string
  tags?: string
  source?: string
  attribution?: string
}

export interface OsmFeature {
  type: 'Feature'
  id: string
  geometry: any
  properties: OsmFeatureProperties
}

export interface OsmSearchResponse {
  searchId: string
  type: 'FeatureCollection'
  features: OsmFeature[]
  attribution: string
  expiresAt: string
  skipped: number
}

export const OSM_ALIASES = ['hospital', 'school', 'restaurant', 'cafe', 'pharmacy', 'fire_station', 'police', 'drinking_water', 'supermarket']
export type OsmExportFormat = 'csv' | 'kml' | 'gpkg'
export const OSM_MAX_DEGREES = 5
export const OSM_MAX_AREA_KM2 = 100000
export const OSM_MAX_SEARCH_LENGTH = 64

export const OSM_ALIAS_TAGS: Record<string, string> = {
  hospital: 'amenity=hospital', school: 'amenity=school', restaurant: 'amenity=restaurant',
  cafe: 'amenity=cafe', pharmacy: 'amenity=pharmacy', fire_station: 'amenity=fire_station',
  police: 'amenity=police', drinking_water: 'amenity=drinking_water', supermarket: 'shop=supermarket'
}
