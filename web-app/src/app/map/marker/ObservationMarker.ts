import { LatLngExpression, Circle, circle, Map } from "leaflet";
import { FixedWidthMarker, FixedWidthMarkerOptions } from "./FixedWidthMarker";

export interface ObservationMarkerOptions extends FixedWidthMarkerOptions {
  accuracy: number,
}

export class ObservationMarker extends FixedWidthMarker {
  options: ObservationMarkerOptions
  private accuracyCircle: Circle

  constructor(latLng: LatLngExpression, options?: ObservationMarkerOptions) {
    super(latLng, options)

    this.accuracyCircle = circle(latLng, 0, {
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
    return this
  }

  setAccuracy(accuracy: number): this {
    this.options.accuracy = accuracy
    return this
  }
  
}

export function observationMarker(latlng: LatLngExpression, options: ObservationMarkerOptions): ObservationMarker {
  return new ObservationMarker(latlng, options)
}