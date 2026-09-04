export type Style = {
  fill: string
  fillOpacity: number
  stroke: string
  strokeOpacity: number
  strokeWidth: number
  iconUrl?: string
}

export enum WebSearchType {
  NONE = "NONE",
  NOMINATIM = "NOMINATIM"
}

export enum MobileSearchType {
  NONE = "NONE",
  NATIVE = "NATIVE",
  NOMINATIM = "NOMINATIM"
}

export interface MapSettings {
  webSearchType: WebSearchType
  webNominatimUrl: string | null
  mobileSearchType: MobileSearchType
  mobileNominatimUrl: string | null
}