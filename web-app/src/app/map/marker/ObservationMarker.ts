import { LatLngExpression, Circle, circle, Map, Marker, marker, divIcon } from "leaflet";
import { FixedWidthMarker, FixedWidthMarkerOptions } from "./FixedWidthMarker";

export interface ObservationMarkerOptions extends FixedWidthMarkerOptions {
  accuracy: number,
}

export class ObservationMarker extends FixedWidthMarker {
  options: ObservationMarkerOptions
  private accuracyCircle: Circle
  private pulseRing?: Marker

  constructor(latLng: LatLngExpression, options?: ObservationMarkerOptions) {
    super(latLng, options)

    this.accuracyCircle = circle(latLng, {
      radius: 0,
      interactive: false,
      color: '#1565C0',
      fillColor: '#1E88E5',
      fillOpacity: 0.15,
      weight: 2,
      opacity: 0.5,
      pane: options.pane
    })

    this.on('popupopen', () => {
      if (options.accuracy) {
        this.accuracyCircle.setRadius(options.accuracy)
        this._map.addLayer(this.accuracyCircle);
      }
    });

    this.on('popupclose', () => {
      this._map.removeLayer(this.accuracyCircle)
    });
  }

  onRemove(map: Map): this {
    super.onRemove(map)
    map.removeLayer(this.accuracyCircle)
    this.pulseRing?.remove()
    return this
  }

  pulse(): void {
    if (!this._map) return
    this.pulseRing?.remove()

    const ring = marker(this.getLatLng(), {
      icon: divIcon({ className: 'marker-pulse', html: '<div class="marker-pulse__ring"></div>', iconSize: [0, 0] }),
      interactive: false,
      keyboard: false,
      pane: this.options.pane
    })
    this.pulseRing = ring
    ring.addTo(this._map)
    setTimeout(() => ring.remove(), 4000)
  }

  setAccuracy(accuracy: number): this {
    this.options.accuracy = accuracy
    return this
  }

}

export function observationMarker(latlng: LatLngExpression, options: ObservationMarkerOptions): ObservationMarker {
  return new ObservationMarker(latlng, options)
}