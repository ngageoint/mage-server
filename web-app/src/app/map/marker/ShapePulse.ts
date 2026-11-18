import { LatLng, Map, Polygon, Polyline, PolylineOptions, polygon, polyline } from "leaflet";

type Shape = Polyline | Polygon

const halos = new WeakMap<Shape, Shape>()

export function pulseShape(shape: Shape, map: Map): void {
  halos.get(shape)?.remove()

  const options: PolylineOptions = {
    className: 'shape-pulse',
    color: '#1e88e5',
    fill: false,
    interactive: false,
    pane: shape.options.pane
  }
  const halo = shape instanceof Polygon
    ? polygon(shape.getLatLngs(), options)
    : polyline(shape.getLatLngs() as LatLng[] | LatLng[][], options)

  halos.set(shape, halo)
  halo.addTo(map)
  setTimeout(() => halo.remove(), 4000)
}
