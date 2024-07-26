import { LatLngExpression, Marker, MarkerOptions, icon } from "leaflet";

export interface FixedWidthMarkerOptions extends MarkerOptions {
  iconUrl?: string,
  tooltip?: boolean,
  iconWidth?: number
}

export class FixedWidthMarker extends Marker {
  iconWidth: number = 35
  fixedWidthIcon: any

  constructor(latLng: LatLngExpression, options?: FixedWidthMarkerOptions) {
    super(latLng, options)

    if (options.iconUrl) {
      const img = new Image()
      img.src = options.iconUrl

      this.setOpacity(0)
      img.onload = (event: any) => {
        this.setOpacity(1)
        const scale = this.iconWidth / event.srcElement.width
        this.setIcon(
          icon({
            className: 'leaflet-fixed-width-marker',
            iconUrl: options.iconUrl,
            iconSize: [this.iconWidth, event.srcElement.height * scale],
            iconAnchor: [this.iconWidth / 2, event.srcElement.height * scale],
            popupAnchor: [0, -(event.srcElement.height * scale)]
          })
        )
      }
    }
  }
}

export function fixedWidthMarker(latlng: LatLngExpression, options?: FixedWidthMarkerOptions): FixedWidthMarker {
  return new FixedWidthMarker(latlng, options)
}