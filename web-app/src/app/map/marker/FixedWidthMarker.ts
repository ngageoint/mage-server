import { setOptions, LatLngExpression, Marker, MarkerOptions, Content, Layer, Popup, PopupOptions, icon, Icon, DivIcon, IconOptions } from "leaflet";

export interface FixedWidthMarkerOptions extends MarkerOptions {
  iconUrl: string,
  tooltip?: boolean,
  iconWidth: number
}

export class FixedWidthMarker extends Marker {
  iconHeight: number
  fixedWidthIcon: any

  constructor(latLng: LatLngExpression, options?: FixedWidthMarkerOptions) {
    super(latLng, options)
    setOptions(this, { opacity: 0 })

    const img = new Image()
    img.src = options.iconUrl

    img.onload = (event: any) => {
      this.setIcon(
        icon({
          iconUrl: options.iconUrl,
          iconSize: [event.srcElement.width, event.srcElement.height],
          iconAnchor: [event.srcElement.width / 2, event.srcElement.height]
        })
      )
    }
  }

  setIcon(icon: DivIcon | Icon<IconOptions>): this {
   super.setIcon(icon)
   const element = this.getElement()
   element.style.opacity = "1"
   return this
  }
}

export function fixedWidthMarker(latlng: LatLngExpression, options?: FixedWidthMarkerOptions): FixedWidthMarker {
  return new FixedWidthMarker(latlng, options)
}