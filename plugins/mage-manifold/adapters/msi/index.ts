import { Feature } from "geojson"

/**
 * MSI is NGA's Maritime Safety Information API.
 */
namespace NgaMsi {

  class MsiAdapter {

  }

  type AsamResponse = {
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
  type Asam = {
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
