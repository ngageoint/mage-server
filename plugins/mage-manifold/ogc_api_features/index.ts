import { FeatureCollection } from "geojson"


namespace OgcApiFeatures {

  export interface OgcApiFeaturesAdapter {

    id: string
    title: string
    description: string

    getCollections(): Promise<Map<string, CollectionDescriptor>>
    getItemsInCollection(collectionId, params: CollectionParams): Promise<CollectionPage>
  }

  export class CollectionDescriptor {

    id: string
    title: string
    description: string
    links: Link[]
    extent: Extent | null
    itemType: string
    crs: Crs[]
  }

  export class CollectionPage {

    /**
     * Collection ID
     */
    collectionId: string
    params: CollectionParams
    page: number
    pageCount: number
    totalItemCount: number
    items: FeatureCollection
  }

  export class Link {

    href: string
    rel: string
    /**
     * MIME type of the link content
     */
    type: string
  }

  export class Extent {

    spatial: SpatialExtent
    temporal: TemporalExtent
  }

  export class SpatialExtent {

    /**
     * OAF actually allows for multiple bounding boxes in a spatial extent, but
     * the Core spec explicitly supports only one, and that sounds sufficient
     * for now.
     */
    bbox: BoundingBox
    crs: Crs
  }

  export class TemporalExtent {

    /**
     * OAF actually allows for multiple intervals in a temporal extent, but the
     * Core spec explicitly supports only one, and that sounds sufficient for
     * now.
     */
    interval: TemporalInterval
    trs: Trs
  }

  export class TemporalInterval {

    start: number
    end: number
  }
    /**
   * Coordinate Reference System
   */
  export class Crs {

    static readonly Wgs84 = new Crs('http://www.opengis.net/def/crs/OGC/1.3/CRS84')

    readonly uri;

    constructor(uri) {
      this.uri = uri;
    }
  }

  /**
   * Temporal Reference System
   */
  export class Trs {

    static readonly Gregorian: Trs = new Trs('http://www.opengis.net/def/uom/ISO-8601/0/Gregorian')

    readonly uri;

    constructor(uri) {
      this.uri = uri;
    }
  }

  export class BoundingBox {

    static parse(x: string): BoundingBox {
      const coords = JSON.parse(`[${x}]`) as number[];
      if (coords.length !== 4 && coords.length !== 6) {
        throw new Error(`invalid bbox string: ${x}`);
      }
      let xMin = coords[0], yMin = coords[1], xMax = coords[2], yMax = coords[3], zMin = null, zMax = null;
      const hasZ = coords.length === 6;
      if (hasZ) {
        zMin = coords[2];
        xMax = coords[3];
        yMax = coords[4];
        zMax = coords[5];
      }
      return new BoundingBox(xMin, yMin, zMin, xMax, yMax, zMax);
    }

    xMin: number
    yMin: number
    zMin?: number | null
    xMax: number
    yMax: number
    zMax?: number | null

    constructor(xMin: number, yMin: number, zMin: number, xMax: number, yMax?: number, zMax?: number) {
      if (!yMax) {
        yMax = xMax;
        xMax = zMin;
      }
      this.xMin = xMin;
      this.yMin = yMin;
      this.zMin = zMin || null;
      this.xMax = xMax;
      this.yMax = yMax;
      this.zMax = zMax || null;
    }
  }

  interface CollectionParams {
    bbox?: BoundingBox | null
    limit?: number | null
    page?: number | null
  }
}

export default OgcApiFeatures;