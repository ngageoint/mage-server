import { Layer, setOptions, featureGroup, Circle, circle, LatLngExpression, CircleMarker, CircleMarkerOptions, Marker, Map, LatLng, circleMarker, FeatureGroup, Content, Popup, PopupOptions, Point, PointExpression } from "leaflet";
import { fixedWidthMarker } from "./FixedWidthMarker";

export class LocationMarker extends Layer {
  private group: FeatureGroup
  private accuracyCircle: Circle
  private iconMarker: Marker
  private locationMarker: CircleMarker

  constructor(latLng: LatLngExpression, options?: CircleMarkerOptions & { accuracy: number, iconUrl : string } ) {
    super(options)

    setOptions(this, options)

    this.group = featureGroup()

    this.accuracyCircle = circle(latLng, 0, {
      interactive: false,
      color: options?.color,
      fillColor: options?.color,
      fillOpacity: 0.15,
      weight: 2,
      opacity: 0.5,
      pane: options?.pane
    })

    this.locationMarker = circleMarker(latLng, {
      // interactive: options.iconUrl ? false : true,
      color: options?.color,
      fillColor: options?.color,
      fillOpacity: 0.7,
      weight: 2,
      opacity: 0.9,
      radius: 5,
      pane: options?.pane
    })
    this.locationMarker.addEventParent(this)
    this.group.addLayer(this.locationMarker)

    if (options?.iconUrl) {
      this.iconMarker = fixedWidthMarker(latLng, {
        pane: options.pane,
        iconUrl: options.iconUrl,
        iconWidth: 42
      })

      this.iconMarker.addEventParent(this)
      this.group.addLayer(this.iconMarker)
    }

    this.on('popupopen', () => {
      if (options?.accuracy) {
        this.accuracyCircle.setRadius(options.accuracy)
      }

      this.group.addLayer(this.accuracyCircle)
    })

    this.on('popupclose', () => {
      this.group.removeLayer(this.accuracyCircle)
    })
  }

  bindPopup(content: ((layer: Layer) => Content) | Content | Popup, options?: PopupOptions): this {
    console.log('bind the location marker ')

    options = options || {}
    if (this.iconMarker) {
      options.offset = [0, 0]

      let yAnchor: number
      const radius = this.locationMarker.getRadius()
      const iconAnchor: PointExpression = this.iconMarker.getIcon().options.iconAnchor
      if (iconAnchor instanceof Point) {
        yAnchor = iconAnchor.y 
      } else {
        yAnchor = iconAnchor[1]
      }
      options.offset = [0, -(yAnchor - radius)]

    }
    super.bindPopup(content, options)

    return this
  }

  onAdd(map: Map): this {
    this._map = map;
    map.addLayer(this.group)
    return this
  }

  onRemove(map: Map): this {
    map.removeLayer(this.group)
    return this
  }
  
  getLatLng(): LatLng {
    return this.locationMarker.getLatLng()
  }

  setAccuracy(accuracy: number): this {
    this.accuracyCircle.setRadius(accuracy)
    return this
  }

  getAccuracy(): number {
    return this.accuracyCircle.getRadius()
  }

  setColor(color: string): this {
    if (this.accuracyCircle.options.color === color) return this

    const style = { color: color, fillColor: color }
    this.accuracyCircle.setStyle(style)
    this.locationMarker.setStyle(style)
    return this
  }
}

export function locationMarker(latlng: LatLngExpression, options?: CircleMarkerOptions & { accuracy: number, iconUrl: string } ): LocationMarker {
  return new LocationMarker(latlng, options)
}