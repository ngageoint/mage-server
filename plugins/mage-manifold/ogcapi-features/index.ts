import geojson from "geojson"


namespace OgcApiFeatures {

  export interface ServiceAdapter {

    id: string
    title: string
    description: string

    getCollections(): Promise<Map<string, CollectionDescriptor>>
    getItemsInCollection(collectionId: string, params: CollectionParams): Promise<CollectionPage>
  }

  export class CollectionDescriptor {

    static fromJson(json: any): CollectionDescriptor {
      const linksJson = json.links as any[]
      const links = linksJson.map(Link.fromJson)
      const out = new CollectionDescriptor(json.id as string, links)
      json.title ? out.title = json.title : 0
      json.description ? out.description = json.description : 0
      json.extent ? out.extent = Extent.fromJson(json.extent) : 0
      json.itemType ? out.itemType = json.itemType : 0
      const crsJson = json.crs as string[]
      json.crs ? out.crs = crsJson.map(Crs.fromJson) : 0
      return out
    }

    id: string
    title?: string
    description?: string
    links: Link[] = []
    extent?: Extent
    itemType?: string = 'feature'
    crs?: Crs[] = [ Crs.Wgs84 ]

    constructor(id: string, links: Link[]) {
      this.id = id
      this.links = links
    }
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

  export class Link {

    static fromJson(json: any): Link {
      const out = new Link(json.href as string)
      out.rel = json.rel
      out.type = json.type
      out.hreflang = json.hreflang
      out.title = json.title
      out.length = json.length
      return out
    }

    href: string
    rel?: string
    /**
     * MIME type of the link content
     */
    type?: string
    hreflang?: string
    title?: string
    length?: number

    constructor(href: string) {
      this.href = href
    }
  }

  export type LinkJson = Link

  export class Extent {

    static fromJson(json: any): Extent {
      const out = new Extent()
      json.spatial ? out.spatial = SpatialExtent.fromJson(json.spatial) : 0
      json.temporal ? out.temporal = TemporalExtent.fromJson(json.temporal) : 0
      return out
    }

    spatial?: SpatialExtent
    temporal?: TemporalExtent
  }

  export type ExtentJson = {
    spatial?: SpatialExtentJson,
    temporal?: TemporalExtentJson
  }

  export class SpatialExtent {

    static fromJson(json: any): SpatialExtent {
      const out = new SpatialExtent()
      const bboxesJson = json.bbox as number[][]
      out.bbox = new BoundingBox(...bboxesJson[0])
      out.crs = new Crs(json.crs as string)
      return out
    }
    /**
     * OAF actually allows for multiple bounding boxes in a spatial extent, but
     * the Core spec explicitly supports only one, and that sounds sufficient
     * for now.
     */
    bbox: BoundingBox = new BoundingBox(-180, -90, 180, 90)
    crs: Crs = Crs.Wgs84

    toJSON() {
      return {
        // array for OAF schema compliance
        bbox: [ this.bbox ],
        crs: this.crs
      }
    }
  }

  export type SpatialExtentJson = {
    bbox: number[][],
    crs: string
  }

  export class TemporalExtent {

    static fromJson(json: any): TemporalExtent {
      const out = new TemporalExtent()
      const intervalsJson = json.interval as number[][]
      out.interval = new TemporalInterval(intervalsJson[0][0], intervalsJson[0][1])
      out.trs = new Trs(json.trs as string)
      return out
    }

    /**
     * OAF actually allows for multiple intervals in a temporal extent, but the
     * Core spec explicitly supports only one, and that sounds sufficient for
     * now.
     */
    interval: TemporalInterval = new TemporalInterval()
    trs: Trs = Trs.Gregorian

    toJSON() {
      return {
        interval: [ this.interval ],
        trs: this.trs
      }
    }
  }

  export type TemporalExtentJson = {
    interval: number[][],
    trs: string
  }

  /**
   * Null values for start/end mean the interval is open-ended.
   */
  export class TemporalInterval {

    start: number | null
    end: number | null

    constructor(start?: number | null, end?: number | null)
    constructor(json: any = {}, endOpt?: number) {
      let start: number | null = null, end: number | null = null
      if (Array.isArray(json)) {
        [ start, end ] = json
      }
      else if (typeof json === 'number' || typeof end === 'number') {
        start = json as number || null
        end = end || null
      }
      else if (typeof json === 'object') {
        start = json.start || null
        end = json.end || null
      }
      this.start = start
      this.end = end
    }

    toJSON() {
      return [ this.start, this.end ]
    }
  }
    /**
   * Coordinate Reference System
   */
  export class Crs {

    static readonly Wgs84 = new Crs('http://www.opengis.net/def/crs/OGC/1.3/CRS84')

    static fromJson(json: any): Crs {
      return new Crs(json as string)
    }

    readonly uri: string

    constructor(uri: string) {
      this.uri = uri
    }

    toJSON() {
      return this.uri
    }
  }

  /**
   * Temporal Reference System
   */
  export class Trs {

    static readonly Gregorian: Trs = new Trs('http://www.opengis.net/def/uom/ISO-8601/0/Gregorian')

    static fromJson(json: any): Trs {
      return new Trs(json as string)
    }

    readonly uri: string

    constructor(uri: string) {
      this.uri = uri
    }

    toJSON() {
      return this.uri
    }
  }

  export class BoundingBox {

    static parse(x: string): BoundingBox {
      const coords = JSON.parse(`[${x}]`) as number[]
      if (coords.length !== 4 && coords.length !== 6) {
        throw new Error(`invalid bbox string: ${x}`)
      }
      let xMin = coords[0], yMin = coords[1], xMax = coords[2], yMax = coords[3], zMin = null, zMax = null
      const hasZ = coords.length === 6
      if (hasZ) {
        zMin = coords[2]
        xMax = coords[3]
        yMax = coords[4]
        zMax = coords[5]
      }
      return new BoundingBox(xMin, yMin, zMin, xMax, yMax, zMax)
    }

    xMin: number
    yMin: number
    zMin?: number | null
    xMax: number
    yMax: number
    zMax?: number | null

    constructor(xMin: number, yMin: number, xMax: number, yMax: number)
    constructor(xMin: number, yMin?: number, zMin?: number | null, xMax?: number, yMax?: number, zMax?: number | null)
    constructor(...coords: number[])
    constructor(...coords: number[]) {
      if (coords.length != 4 && coords.length != 6) {
        throw new Error(`invalid bounding box coordinates: ${coords}`)
      }
      let [ xMin, yMin, zMin, xMax, yMax, zMax ] = coords
      if (coords.length === 4) {
        yMax = xMax
        xMax = zMin
      }
      this.xMin = xMin
      this.yMin = yMin
      this.zMin = zMin || null
      this.xMax = xMax
      this.yMax = yMax
      this.zMax = zMax || null
    }

    toJSON() {
      if (this.zMin) {
        return [ this.xMin, this.yMin, this.zMin, this.xMax, this.yMax, this.zMax ]
      }
      return [ this.xMin, this.yMin, this.xMax, this.yMax ]
    }
  }

  export class CollectionPage {
    /**
     * Collection ID
     */
    collectionId: string
    params?: CollectionParams
    page?: number
    pageCount?: number
    totalItemCount?: number
    items: FeatureCollection

    constructor(collectionId: string, items: FeatureCollection) {
      this.collectionId = collectionId
      this.items = items
    }
  }

  export interface FeatureCollection extends geojson.FeatureCollection {
    links?: Link[]
  }

  export interface CollectionParams {
    bbox?: BoundingBox | null
    limit?: number | null
    page?: number | null
  }
}

export default OgcApiFeatures