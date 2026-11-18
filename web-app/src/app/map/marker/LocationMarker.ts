import { Circle, circle, LatLngExpression, CircleMarker, CircleMarkerOptions, LatLng, circleMarker, FeatureGroup, Layer, Marker, marker, divIcon } from "leaflet";
import { fixedWidthMarker } from "./FixedWidthMarker";

export interface LocationMarkerOptions extends CircleMarkerOptions {
  accuracy?: number
  iconUrl?: string
  color?: string
}

export class LocationMarker extends FeatureGroup {
  private locationMarker: CircleMarker
  private accuracyCircle: Circle
  private pane?: string
  private pulseRing?: Marker

  constructor(latLng: LatLngExpression, options?: LocationMarkerOptions) {
    const layers = []

    if (options?.iconUrl) {
      layers.push(fixedWidthMarker(latLng, {
        pane: options.pane,
        iconUrl: options.iconUrl,
        iconWidth: 42
      }))
    }

    const locationMarker = circleMarker(latLng, {
      color: options?.color,
      fillColor: options?.color,
      fillOpacity: 0.7,
      weight: 2,
      opacity: 0.9,
      radius: 5,
      pane: options?.pane
    })
    layers.push(locationMarker)

    super(layers, {})

    this.pane = options?.pane
    this.locationMarker = locationMarker
    this.accuracyCircle = circle(latLng, {
      radius: 0,
      interactive: false,
      color: options?.color,
      fillColor: options?.color,
      fillOpacity: 0.15,
      weight: 2,
      opacity: 0.5,
      pane: options?.pane
    })

    this.on('popupopen', () => {
      if (options?.accuracy) {
        this.accuracyCircle.setRadius(options.accuracy)
      }

      this.addLayer(this.accuracyCircle)
    })

    this.on('popupclose', () => {
      this.removeLayer(this.accuracyCircle)
    })
  }

  pulse(): void {
    if (this.pulseRing) this.removeLayer(this.pulseRing)

    const ring = marker(this.getLatLng(), {
      icon: divIcon({ className: 'marker-pulse', html: '<div class="marker-pulse__ring"></div>', iconSize: [0, 0] }),
      interactive: false,
      keyboard: false,
      pane: this.pane
    })
    this.pulseRing = ring
    this.addLayer(ring)
    setTimeout(() => this.removeLayer(ring), 4000)
  }

  getLatLng(): LatLng {
    return this.locationMarker.getLatLng()
  }

  setLatLng(latLng: LatLng): this {
    this.accuracyCircle.setLatLng(latLng);
    this.getLayers().forEach((layer: Layer) => {
      if (layer instanceof Circle) {
        layer.setLatLng(latLng)
      } else if (layer instanceof CircleMarker) {
        layer.setLatLng(latLng)
      } else if (layer instanceof Marker) {
        layer.setLatLng(latLng)
      }
    })

    return this
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

export function locationMarker(latlng: LatLngExpression, options?: LocationMarkerOptions): LocationMarker {
  return new LocationMarker(latlng, options)
}