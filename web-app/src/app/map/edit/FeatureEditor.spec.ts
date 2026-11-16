import { latLng, map, Map } from 'leaflet';
import 'leaflet-editable';
import { FeatureEditor } from './FeatureEditor';

describe('FeatureEditor', () => {
  let element: HTMLElement;
  let leafletMap: Map;
  let geometryChanged: jasmine.Spy;

  function clickMap(lat: number, lng: number) {
    const originalEvent = { which: 1, clientX: 0, clientY: 0 };
    leafletMap.fire('mousedown', { latlng: latLng(lat, lng), originalEvent });
    leafletMap.fire('mouseup', { latlng: latLng(lat, lng), originalEvent });
  }

  function lastGeometry(): any {
    return geometryChanged.calls.mostRecent().args[0];
  }

  beforeEach(() => {
    element = document.createElement('div');
    element.style.width = '400px';
    element.style.height = '400px';
    document.body.appendChild(element);

    leafletMap = map(element, { editable: true } as any).setView([0, 0], 5);
    geometryChanged = jasmine.createSpy('geometryChanged');
  });

  afterEach(() => {
    leafletMap.remove();
    element.remove();
  });

  it('should draw a new line by clicking the map', () => {
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [] },
      style: {}
    };

    new FeatureEditor(leafletMap, feature, { geometryChanged });
    expect((leafletMap as any).editTools.drawing()).toBeTrue();

    clickMap(20, 10);
    clickMap(25, 15);
    clickMap(30, 30);

    expect(lastGeometry().coordinates).toEqual([[10, 20], [15, 25], [30, 30]]);
  });

  it('should finish a new line when its last point is clicked', () => {
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [] },
      style: {}
    };

    const editor = new FeatureEditor(leafletMap, feature, { geometryChanged });
    clickMap(20, 10);
    clickMap(25, 15);

    const layer = (editor as any).layer;
    const last = layer.editor.editLayer.getLayers().find(l => l.getIndex?.() === 1);
    last.fire('click', { originalEvent: {} });

    expect((leafletMap as any).editTools.drawing()).toBeFalsy();
    expect(lastGeometry().coordinates).toEqual([[10, 20], [15, 25]]);
  });

  it('should show and select the points of a partial line', () => {
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[10, 20]] },
      style: {}
    };

    const editor = new FeatureEditor(leafletMap, feature, { geometryChanged });
    const layer = (editor as any).layer;
    const vertex = layer.editor.editLayer.getLayers().find(l => l.getIndex?.() === 0);

    expect(leafletMap.hasLayer(layer)).toBeTrue();
    expect(vertex.getElement()).toBeTruthy();

    editor.selectVertex(0);
    expect(vertex.getElement().classList).toContain('selected-marker');

    clickMap(25, 15);
    expect(lastGeometry().coordinates).toEqual([[10, 20], [15, 25]]);
  });

  it('should not let callers change the shape bounds', () => {
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[10, 20], [15, 25]] },
      style: {}
    };

    const editor = new FeatureEditor(leafletMap, feature, { geometryChanged });
    editor.getBounds().extend(latLng(50, 0));

    const bounds = editor.getBounds();
    expect(bounds.getSouthWest()).toEqual(latLng(20, 10));
    expect(bounds.getNorthEast()).toEqual(latLng(25, 15));
  });

  it('should open an existing line for editing without adding points on map clicks', () => {
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[10, 20], [15, 25]] },
      style: {}
    };

    new FeatureEditor(leafletMap, feature, { geometryChanged });
    expect((leafletMap as any).editTools.drawing()).toBeFalsy();

    clickMap(30, 30);

    expect(lastGeometry().coordinates).toEqual([[10, 20], [15, 25]]);
  });

  it('should insert a vertex when a middle marker is dragged', () => {
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[10, 20], [15, 25], [20, 20]] },
      style: {}
    };

    new FeatureEditor(leafletMap, feature, { geometryChanged });

    const icon = element.querySelector('.leaflet-middle-icon') as HTMLElement;
    const bounds = icon.getBoundingClientRect();
    const position = { bubbles: true, button: 0, clientX: bounds.left + 2, clientY: bounds.top + 2 };
    icon.dispatchEvent(new MouseEvent('mousedown', position));
    document.dispatchEvent(new MouseEvent('mouseup', position));

    const coordinates = lastGeometry().coordinates;
    expect(coordinates.length).toEqual(4);
    expect(coordinates[0]).toEqual([10, 20]);
    expect(coordinates[3]).toEqual([20, 20]);
  });

  it('should report a right-click deleted vertex before the geometry changes', () => {
    const calls: string[] = [];
    const vertexDeleted = jasmine.createSpy('vertexDeleted').and.callFake(() => calls.push('deleted'));
    geometryChanged.and.callFake(() => calls.push('geometry'));
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[10, 20], [15, 25], [20, 20], [25, 25]] },
      style: {}
    };

    const editor = new FeatureEditor(leafletMap, feature, { geometryChanged, vertexDeleted });
    calls.length = 0;

    const layer = (editor as any).layer;
    const first = layer.editor.editLayer.getLayers().find(l => l.getIndex?.() === 0);
    first.fire('contextmenu', { originalEvent: {} });

    expect(vertexDeleted).toHaveBeenCalledWith({ index: 0 });
    expect(calls).toEqual(['deleted', 'geometry']);
    expect(lastGeometry().coordinates).toEqual([[15, 25], [20, 20], [25, 25]]);
  });

  it('should select a vertex without notifying the vertex click listener', () => {
    const vertexClick = jasmine.createSpy('vertexClick');
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[10, 20], [15, 25]] },
      style: {}
    };

    const editor = new FeatureEditor(leafletMap, feature, { geometryChanged, vertexClick });
    editor.selectVertex(1);

    const layer = (editor as any).layer;
    expect(layer.selectedVertex.getIndex()).toEqual(1);
    expect(layer.selectedVertex.getElement().classList).toContain('selected-marker');
    expect(vertexClick).not.toHaveBeenCalled();
  });

  it('should keep drawing a line that has one point', () => {
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[10, 20]] },
      style: {}
    };

    new FeatureEditor(leafletMap, feature, { geometryChanged });
    expect((leafletMap as any).editTools.drawing()).toBeTrue();
    expect(leafletMap.getCenter().lat).toBeCloseTo(20, 5);
    expect(leafletMap.getCenter().lng).toBeCloseTo(10, 5);

    clickMap(25, 15);

    expect(lastGeometry().coordinates).toEqual([[10, 20], [15, 25]]);
  });

  it('should keep drawing a polygon that has fewer than three points', () => {
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[[10, 20], [15, 25], [10, 20]]] },
      style: {}
    };

    new FeatureEditor(leafletMap, feature, { geometryChanged });
    expect((leafletMap as any).editTools.drawing()).toBeTrue();

    clickMap(20, 15);

    expect(lastGeometry().coordinates).toEqual([[[10, 20], [15, 25], [15, 20], [10, 20]]]);
  });

  it('should report the bounds of the shape being edited', () => {
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[10, 20], [15, 25]] },
      style: {}
    };

    const bounds = new FeatureEditor(leafletMap, feature, { geometryChanged }).getBounds();

    expect(bounds?.getSouthWest().lat).toBeCloseTo(20, 5);
    expect(bounds?.getNorthEast().lng).toBeCloseTo(15, 5);
  });

  it('should have no bounds before any point is drawn', () => {
    const feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [] },
      style: {}
    };

    expect(new FeatureEditor(leafletMap, feature, { geometryChanged }).getBounds()).toBeUndefined();
  });
});
