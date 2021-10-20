import geojson from "geojson"


export interface ServiceAdapter {
  getCollections(): Promise<Map<string, CollectionDescriptorJson>>
  getItemsInCollection(collectionId: string, params?: CollectionParams): Promise<CollectionPage>
}

export type CollectionDescriptorJson = {
  id: string
  title?: string
  description?: string
  links: LinkJson[]
  extent?: ExtentJson
  itemType?: string
  crs?: string[]
}

export type LinkJson = {
  href: string,
  rel?: string,
  /**
   * MIME type of the link content
   */
  type?: string,
  hreflang?: string,
  title?: string,
  length?: number
}

export type ExtentJson = {
  spatial?: SpatialExtentJson,
  temporal?: TemporalExtentJson
}

export type SpatialExtentJson = {
  bbox: BoundingBoxCoords[],
  crs: CrsUri
}

export type TemporalExtentJson = {
  interval: [ TemporalIntervalCoordinate, TemporalIntervalCoordinate ],
  trs: TrsUri
}

/**
 * A tuples of either 4 or 6 numbers represents bounding box coordinates.
 * The elements of the tuple are
 * `[ x-min, y-min, z-min, x-max, y-max, z-max ]` for 3-dimensional
 * coordinates, or for 2-dimensional coordinates, omit the z- elements of the
 * tuple.
 */
export type BoundingBoxCoords =
  [ number, number, number, number ] |
  [ number, number, number | null, number, number, number | null ]

export class BoundingBox {

  /**
   * Parse the given string as bounding box coordinates.  Valid strings should
   * be comma-separated numeric elements, e.g., `'-106.1, 34, -105.8, 35'`.
   * @param x the string to parse
   */
  static parse(x: string): BoundingBoxCoords {
    const coords = JSON.parse(`[${x}]`) as number[]
    if (coords.length !== 4 && coords.length !== 6) {
      throw new Error(`invalid bbox string: ${x}`)
    }
    const xMin = coords[0], yMin = coords[1]
    let xMax = coords[2], yMax = coords[3], zMin = null, zMax = null
    const hasZ = coords.length === 6
    if (hasZ) {
      zMin = coords[2]
      xMax = coords[3]
      yMax = coords[4]
      zMax = coords[5]
    }
    return [ xMin, yMin, zMin, xMax, yMax, zMax ]
  }
}

/**
 * A tuple of 2-coordinates represents a temporal interval whose start is the
 * first coordinate and end is the second coordinate.  Null values for
 * start/end mean the interval is open-ended.  When the elements of the tuple
 * are strings, they should be in ISO-8601 date format.
 */
export type TemporalIntervalCoordinate = Date | null

export type TrsUri = string
export const TrsGregorian: TrsUri & 'http://www.opengis.net/def/uom/ISO-8601/0/Gregorian' = 'http://www.opengis.net/def/uom/ISO-8601/0/Gregorian'

export type CrsUri = string
export const CrsWgs84: CrsUri & 'http://www.opengis.net/def/crs/OGC/1.3/CRS84' = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84'

export type CollectionPage = {
  /**
   * Collection ID
   */
  collectionId: string
  params?: CollectionParams
  page?: number
  pageCount?: number
  totalItemCount?: number
  items: FeatureCollection
}

export interface FeatureCollection extends geojson.FeatureCollection {
  links?: LinkJson[]
}

export type EpochTime = number

export interface CollectionParams {
  bbox?: BoundingBox | null
  newerThan?: EpochTime
  limit?: number | null
  page?: number | null
}
