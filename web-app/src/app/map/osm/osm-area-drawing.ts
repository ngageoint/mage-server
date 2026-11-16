import { LatLng, LeafletMouseEvent, Map, Polygon, latLng, polygon, polyline, Polyline } from 'leaflet'
import { OsmArea, OsmBounds } from './osm.types'

export type AreaShape = 'rectangle' | 'circle' | 'polygon'
const style = { color: '#006c91', weight: 3, dashArray: '7 5', fillOpacity: 0.08, interactive: false, pane: 'osmSearchArea' }

/** Owns only temporary search boundaries, never an observation or event layer. */
export class OsmAreaDrawing {
  area?: OsmArea
  label = 'Visible map'
  mode: AreaShape | null = null
  points: LatLng[] = []
  private boundary?: Polygon
  private sketch?: Polyline | Polygon
  private previousDoubleClick = false
  private previousCursor = ''
  private click = (e: LeafletMouseEvent) => {
    if (!this.mode || e.latlng.lng < -180 || e.latlng.lng > 180 || Math.abs(e.latlng.lat) > 85) return
    if (this.mode === 'polygon' && this.points.length >= 64) return
    // Ignore a duplicated double-click vertex.
    if (this.points[this.points.length - 1]?.equals(e.latlng)) return
    if (this.mode !== 'polygon' && this.points.length === 2) this.points[1] = e.latlng
    else this.points.push(e.latlng)
    this.paint(this.points); this.changed()
  }
  private doubleClick = (e: LeafletMouseEvent) => {
    // Browsers send click, click, dblclick. Reuse the final point without
    // adding it twice, and also support Leaflet's synthetic dblclick events.
    this.click(e)
    this.finish()
  }
  private move = (e: LeafletMouseEvent) => {
    if (this.points.length) this.paint(this.mode === 'polygon' ? [...this.points, e.latlng] : [this.points[0], e.latlng])
  }
  constructor(private map: Map, private changed: () => void) {}

  get hint(): string {
    if (this.mode === 'rectangle') return this.points.length ? 'Double-click the opposite corner to finish.' : 'Click the first rectangle corner on the map.'
    if (this.mode === 'circle') return this.points.length ? 'Double-click the edge of the circle to finish.' : 'Click the circle centre on the map.'
    if (this.mode === 'polygon') return `Click polygon corners on the map (${this.points.length}/64). Double-click the last corner to finish.`
    return this.area ? `${this.label} selected. Panning or zooming will not change it.` : 'Search the current visible map, or draw an area.'
  }
  start(mode: AreaShape): void {
    this.stop()
    if (!this.map.getPane('osmSearchArea')) this.map.createPane('osmSearchArea').style.zIndex = '64900'
    this.mode = mode
    this.points = []
    this.previousDoubleClick = this.map.doubleClickZoom.enabled()
    this.previousCursor = this.map.getContainer().style.cursor
    this.map.doubleClickZoom.disable()
    this.map.getContainer().style.cursor = 'crosshair'
    this.map.on('click', this.click).on('mousemove', this.move).on('dblclick', this.doubleClick)
    this.changed()
  }
  undo(): void { this.points.pop(); this.paint(this.points); this.changed() }
  cancel(): void { this.stop(); this.changed() }
  useViewport(): void {
    this.stop(); this.boundary?.remove(); this.boundary = undefined
    this.area = undefined; this.label = 'Visible map'; this.changed()
  }
  finish(): void {
    if (!this.mode || this.points.length < (this.mode === 'polygon' ? 3 : 2)) return
    const ring = this.shapePoints(this.points)
    const shape = polygon(ring)
    const bounds = shape.getBounds()
    if (bounds.getNorth() === bounds.getSouth() || bounds.getEast() === bounds.getWest()) return
    this.boundary?.remove()
    this.boundary = polygon(ring, style).addTo(this.map)
    this.area = (shape.toGeoJSON().geometry as OsmArea)
    this.label = this.mode === 'rectangle' ? 'Rectangle' : this.mode === 'circle' ? 'Circle (48-sided boundary)' : 'Polygon'
    this.stop(); this.changed()
  }
  bounds(): OsmBounds | undefined {
    if (!this.boundary) return undefined
    const b = this.boundary.getBounds()
    return { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }
  }
  destroy(): void { this.stop(); this.boundary?.remove(); this.boundary = undefined }

  private stop(): void {
    if (this.mode) {
      this.map.off('click', this.click).off('mousemove', this.move).off('dblclick', this.doubleClick)
      if (this.previousDoubleClick) this.map.doubleClickZoom.enable()
      this.map.getContainer().style.cursor = this.previousCursor
    }
    this.mode = null; this.points = []
    this.sketch?.remove(); this.sketch = undefined
  }
  private paint(points: LatLng[]): void {
    this.sketch?.remove()
    this.sketch = (this.mode === 'polygon' || points.length < 2 ? polyline(points, style) : polygon(this.shapePoints(points), style)).addTo(this.map)
  }
  private shapePoints(points: LatLng[]): LatLng[] {
    if (this.mode === 'rectangle' && points.length >= 2) {
      const [a, b] = points
      return [a, latLng(a.lat, b.lng), b, latLng(b.lat, a.lng)]
    }
    if (this.mode === 'circle' && points.length >= 2) {
      const centre = points[0], radians = Math.PI / 180, distance = centre.distanceTo(points[1]) / 6371000
      const lat = centre.lat * radians, lng = centre.lng * radians
      return Array.from({ length: 48 }, (_, i) => {
        const bearing = i * Math.PI / 24
        const y = Math.asin(Math.sin(lat) * Math.cos(distance) + Math.cos(lat) * Math.sin(distance) * Math.cos(bearing))
        const x = lng + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(lat), Math.cos(distance) - Math.sin(lat) * Math.sin(y))
        return latLng(y / radians, x / radians)
      })
    }
    return points
  }
}
