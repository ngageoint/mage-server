import * as L from 'leaflet';

declare module 'leaflet' {

  export interface FixedWidthMarkerOptions extends L.MarkerOptions {
    iconUrl?: string;
  }

  /**
   * Creates a Fixed Width Marker.
   */
  export function fixedWidthMarker(latlng: L.LatLngExpression, options?: FixedWidthMarkerOptions): L.Marker;

  export class FixedWidthMarker extends Marker {
    constructor(latlng: LatLngExpression, options?: FixedWidthMarkerOptions);
  }
}
