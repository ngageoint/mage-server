import { Feature } from "geojson"
import  { ManifoldAdapter, SourceConnection } from '..'
import OgcApiFeatures from '../../ogcapi-features'
import { SourceDescriptor } from "../../models";

/**
 * MSI is NGA's Maritime Safety Information API.
 */
export namespace NgaMsi {

  export class MsiAdapter implements ManifoldAdapter {
    async connectTo(source: SourceDescriptor): Promise<SourceConnection> {
      return new MsiConnection(source)
    }
  }

  class MsiConnection implements SourceConnection {

    readonly source: SourceDescriptor
    get id(): string {
      return this.source.id!
    }
    get title(): string {
      return this.source.title
    }
    get description(): string {
      return this.source.description
    }
    readonly collections: Map<string, OgcApiFeatures.CollectionDescriptorJson>

    constructor(source: SourceDescriptor) {
      this.source = source
      this.collections = new Map<string, OgcApiFeatures.CollectionDescriptorJson>([
        [ 'asam', {
          id: 'asam',
          links: [],
          title: 'Anti-Shipping Activity Messages (ASAM)',
          description:
            'ASAM records include locations and accounts of hostile acts ' +
            'against ships and mariners.  This data can help vessels ' +
            'recognize and avoid potential hostile activity at sea.'
        }]
      ])
    }

    getCollections(): Promise<Map<string, OgcApiFeatures.CollectionDescriptorJson>> {
      return Promise.resolve(this.collections);
    }

    async getItemsInCollection(collectionId: string, params?: OgcApiFeatures.CollectionParams): Promise<OgcApiFeatures.CollectionPage> {
      if (collectionId !== 'asam') {
        throw new Error(`unknown collection: ${collectionId}`)
      }
      const page: OgcApiFeatures.CollectionPage = {
        collectionId,
        items: {
          type: 'FeatureCollection',
          features: [

          ]
        }
      }
      return page
    }
  }

  export type AsamResponse = {
    asam: Asam[]
  }

  /**
   * An ASAM is an Anti-Shipping Activity Message.
   * Example ASAM:
   * ```
   * {
   *     "reference": "2019-77",
   *     "date": "2019-12-07",
   *     "latitude": -13.238064424964307,
   *     "longitude": -76.75069075407549,
   *     "position": "13°14'17.03\"S \n76°45'02.49\"W",
   *     "navArea": "XVI",
   *     "subreg": "22",
   *     "hostility": "Robbery",
   *     "victim": null,
   *     "description": "3 robbers boarded an anchored bulk carrier anchored in Callao. Robbers tied up a crewman and entered the forecastle storeroom. The crewman managed to escape and raised the alarm. Upon hearing the alarm, the robbers fled."
   * }
   * ```
   */
  export type Asam = {
    /**
     * This appears to be the unique identifier for ASAM records.
     */
    reference: string,
    date: string,
    latitude: number,
    longitude: number,
    /**
     * DMS Lat/Lon string
     */
    position: string,
    navArea: string,
    subreg: string,
    hostility: string,
    victim: string | null,
    description: string
  }

  function geoJsonFromAsam(x: Asam): Feature {
    const feature: Feature = {
      type: 'Feature',
      properties: x,
      geometry: {
        type: 'Point',
        coordinates: [ x.longitude, x.latitude ]
      }
    };
    return feature;
  }
}

export default NgaMsi;
