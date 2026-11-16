import { latLng, map, Map } from 'leaflet'
import { OsmAreaDrawing } from './osm-area-drawing'

describe('OSM search-area drawing on the real Leaflet map', () => {
  let element: HTMLDivElement, leaflet: Map, drawing: OsmAreaDrawing
  const click = (lat: number, lng: number) => leaflet.fire('click', { latlng: latLng(lat, lng) })
  const doubleClick = (lat: number, lng: number) => {
    click(lat, lng); click(lat, lng)
    leaflet.fire('dblclick', { latlng: latLng(lat, lng),
      containerPoint: leaflet.latLngToContainerPoint(latLng(lat, lng)),
      originalEvent: new MouseEvent('dblclick') })
  }
  beforeEach(() => {
    element = document.createElement('div')
    element.style.cssText = 'width:1000px;height:700px'
    document.body.appendChild(element)
    leaflet = map(element).setView([38.6, -90.4], 10)
    drawing = new OsmAreaDrawing(leaflet, () => {})
  })
  afterEach(() => { drawing.destroy(); leaflet.remove(); element.remove() })

  it('finishes a two-corner rectangle, retaining its bounds after panning', () => {
    drawing.start('rectangle')
    expect(leaflet.doubleClickZoom.enabled()).toBeFalse()
    click(38.6, -90.5)
    leaflet.fire('mousemove', { latlng: latLng(38.7, -90.3) })
    expect(drawing.area).toBeUndefined()
    click(38.7, -90.3)
    expect(drawing.area).toBeUndefined()
    doubleClick(38.7, -90.3)
    expect(drawing.mode).toBeNull()
    expect(drawing.area.coordinates[0]).toEqual([
      [-90.5, 38.6], [-90.3, 38.6], [-90.3, 38.7], [-90.5, 38.7], [-90.5, 38.6]
    ])
    leaflet.setView([40, -100], 4)
    expect(drawing.bounds()).toEqual({ south: 38.6, west: -90.5, north: 38.7, east: -90.3 })
    expect(leaflet.doubleClickZoom.enabled()).toBeTrue()
    expect(leaflet.getPane('osmSearchArea').style.zIndex).toBe('64900')
  })
  it('supports undo, double-click polygon finish, cancelled replacement and viewport reset', () => {
    drawing.start('polygon')
    click(38.6, -90.5); click(38.7, -90.5)
    doubleClick(38.7, -90.5)
    expect(drawing.area).toBeUndefined()
    click(38.7, -90.3); drawing.undo()
    expect(drawing.points.length).toBe(2)
    doubleClick(38.8, -90.4)
    expect(drawing.area.coordinates[0].length).toBe(4)
    const previous = drawing.area
    drawing.start('rectangle'); click(38.6, -90.4); drawing.cancel()
    expect(drawing.area).toBe(previous)
    expect(leaflet.getContainer().style.cursor).not.toBe('crosshair')
    drawing.useViewport()
    expect(drawing.area).toBeUndefined()
    expect(drawing.bounds()).toBeUndefined()
  })
  it('turns a centre/radius circle into a closed 48-sided polygon', () => {
    drawing.start('circle'); click(38.6, -90.4); click(38.61, -90.4)
    expect(drawing.area).toBeUndefined()
    doubleClick(38.61, -90.4)
    expect(drawing.area.coordinates[0].length).toBe(49)
    expect(drawing.bounds().north).toBeCloseTo(38.61, 5)
    expect(drawing.bounds().south).toBeCloseTo(38.59, 5)
  })
  it('cleans up drawing events and boundaries without enabling previously disabled map behavior', () => {
    leaflet.doubleClickZoom.disable()
    drawing.start('polygon'); click(38.6, -90.5)
    drawing.destroy()
    click(38.8, -90.4)
    expect(drawing.points.length).toBe(0)
    expect(leaflet.doubleClickZoom.enabled()).toBeFalse()
    expect(leaflet.hasEventListeners('mousemove')).toBeFalse()
  })
  it('finalizes a 64-corner polygon without adding the double-click vertex twice', () => {
    drawing.start('polygon')
    for (let i = 0; i < 64; i++) {
      const angle = i * 2 * Math.PI / 64
      click(38.6 + Math.sin(angle) * .1, -90.4 + Math.cos(angle) * .1)
    }
    const last = drawing.points[63]
    doubleClick(last.lat, last.lng)
    expect(drawing.mode).toBeNull()
    expect(drawing.area.coordinates[0].length).toBe(65)
  })
  it('removes its double-click listener on cancellation', () => {
    drawing.start('polygon'); click(38.6, -90.5)
    drawing.cancel()
    doubleClick(38.8, -90.4)
    expect(drawing.area).toBeUndefined()
    expect(drawing.points.length).toBe(0)
  })
})
