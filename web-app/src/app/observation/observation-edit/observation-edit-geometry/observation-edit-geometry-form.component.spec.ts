import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationEditGeometryFormComponent, EditableCoordinate } from './observation-edit-geometry-form.component';
import { MapService } from '../../../map/map.service';
import { GeometryService } from '../../../geometry/geometry.service';
import { GeocoderService } from '../../../geocoder/geocoder';
import { GeometryPipe } from '../../../geometry/geometry.pipe';
import 'leaflet-editable'

describe('EditableCoordinate', () => {
  describe('setCoordinate', () => {
    it('keeps the full precision of latitude and longitude', () => {
      const coordinate = new EditableCoordinate([-104.990312345, 39.739216789]);

      expect(coordinate.coordinate).toEqual([-104.990312345, 39.739216789]);
    });
  });

  describe('equals', () => {
    it('matches coordinates that are the same to five decimal places', () => {
      const coordinate = new EditableCoordinate([-104.990312345, 39.739216789]);

      expect(coordinate.equals(new EditableCoordinate([-104.99031, 39.73922]))).toBeTrue();
      expect(coordinate.equals(new EditableCoordinate([-104.99032, 39.73922]))).toBeFalse();
    });
  });
});

describe('ObservationEditGeometryFormComponent', () => {
  let component: ObservationEditGeometryFormComponent;
  let fixture: ComponentFixture<ObservationEditGeometryFormComponent>;

  let mapService: jasmine.SpyObj<MapService>;
  let geometryService: jasmine.SpyObj<GeometryService>;

  let featureEdit: {
    update: jasmine.Spy;
    save: jasmine.Spy;
    cancel: jasmine.Spy;
    selectVertex: jasmine.Spy;
    showSearchResult: jasmine.Spy;
  };
  let geocoderService: jasmine.SpyObj<GeocoderService>;
  let geometryPipe: jasmine.SpyObj<GeometryPipe>;

  beforeEach(() => {
    mapService = jasmine.createSpyObj<MapService>('MapService', [
      'createFeature',
      'removeFeatureFromLayer'
    ]);

    geometryService = jasmine.createSpyObj<GeometryService>(
      'GeometryService',
      ['featureHasIntersections']
    );

    // Reads "lat, lng" only, enough to exercise the form
    geocoderService = jasmine.createSpyObj<GeocoderService>('GeocoderService', ['coordinateFromText'], { placenameSearchEnabled: true });
    geocoderService.coordinateFromText.and.callFake((input: string) => {
      const match = input.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      return match ? { position: [Number(match[2]), Number(match[1])], coordinateSystem: 'wgs84' } : null;
    });

    geometryPipe = jasmine.createSpyObj<GeometryPipe>('GeometryPipe', ['transform']);
    geometryPipe.transform.and.callFake((point: any) => `${point.coordinates[1]}, ${point.coordinates[0]}`);

    featureEdit = {
      update: jasmine.createSpy('update'),
      save: jasmine.createSpy('save'),
      cancel: jasmine.createSpy('cancel'),
      selectVertex: jasmine.createSpy('selectVertex'),
      showSearchResult: jasmine.createSpy('showSearchResult')
    };

    mapService.createFeature.and.returnValue(featureEdit as any);

    TestBed.configureTestingModule({
      providers: [
        { provide: MapService, useValue: mapService },
        { provide: GeometryService, useValue: geometryService },
        { provide: GeocoderService, useValue: geocoderService }
      ]
    }).overrideComponent(ObservationEditGeometryFormComponent, {
      set: {
        template: '',
        imports: [],
        providers: [{ provide: GeometryPipe, useValue: geometryPipe }]
      }
    });

    fixture = TestBed.createComponent(ObservationEditGeometryFormComponent);
    component = fixture.componentInstance;

    geometryService.featureHasIntersections.and.returnValue(false);
  });

  function initializeFeatureEdit(): void {
    featureEdit = {
      update: jasmine.createSpy('update'),
      save: jasmine.createSpy('save'),
      cancel: jasmine.createSpy('cancel'),
      selectVertex: jasmine.createSpy('selectVertex'),
      showSearchResult: jasmine.createSpy('showSearchResult')
    };

    mapService.createFeature.and.returnValue(featureEdit as any);

    component.featureEdit = featureEdit;
  }

  function startEdit(feature: any): void {
    fixture.componentRef.setInput('feature', feature);
    fixture.detectChanges();
  }

  function setFeature(
    type: 'Point' | 'LineString' | 'Polygon',
    coordinates: any
  ): void {
    startEdit({
      id: 'feature-1',
      geometry: {
        type,
        coordinates
      }
    });
  }

  describe('ngOnChanges', () => {
    it('does not rebuild the map editor when only the title changes', () => {
      setFeature('Point', [-104.99, 39.74]);
      mapService.createFeature.calls.reset();

      fixture.componentRef.setInput('title', 'Site');
      fixture.detectChanges();

      expect(mapService.createFeature).not.toHaveBeenCalled();
    });

    it('loads a Point feature', () => {
      setFeature('Point', [-104.99, 39.74]);

      expect(component.selectedShapeType).toBe('Point');
      expect(component.coordinates.length).toBe(1);
      expect(component.coordinates[0].coordinate).toEqual([-104.99, 39.74]);
    });

    it('loads a LineString feature', () => {
      setFeature('LineString', [
        [-104.99, 39.74],
        [-104.98, 39.75]
      ]);

      expect(component.coordinates.length).toBe(2);
      expect(component.coordinates[0].coordinate).toEqual([-104.99, 39.74]);
      expect(component.coordinates[1].coordinate).toEqual([-104.98, 39.75]);
    });

    it('loads a Polygon without exposing the closing coordinate', () => {
      setFeature('Polygon', [
        [
          [-104.99, 39.74],
          [-104.98, 39.75],
          [-104.97, 39.74],
          [-104.99, 39.74]
        ]
      ]);

      expect(component.coordinates.length).toBe(3);

      expect(component.coordinates.map(c => c.coordinate)).toEqual([
        [-104.99, 39.74],
        [-104.98, 39.75],
        [-104.97, 39.74]
      ]);
    });

    it('keeps the precision of points that were not edited', () => {
      setFeature('Polygon', [
        [
          [-104.99031234, 39.73921678],
          [-104.98012345, 39.75098765],
          [-104.97054321, 39.74012345],
          [-104.99031234, 39.73921678]
        ]
      ]);

      const row = component.coordinates[1];
      component.onRowChange(row, '39.76, -104.98');
      component.applyRow(row);

      expect(component.currentFeature.geometry.coordinates).toEqual([
        [
          [-104.99031234, 39.73921678],
          [-104.98, 39.76],
          [-104.97054321, 39.74012345],
          [-104.99031234, 39.73921678]
        ]
      ]);
    });

    it('does not create coordinates when the Point has no coordinates', () => {
      setFeature('Point', undefined);

      expect(component.coordinates).toEqual([]);
    });
  });

  describe('getFeatureCoordinates', () => {
    it('reads Point coordinates', () => {
      component.currentFeature ={
        geometry: {
          type: 'Point',
          coordinates: [-104.99, 39.74]
        }
      };

      expect(component.getFeatureCoordinates()).toEqual([
        [-104.99, 39.74]
      ]);
    });

    it('converts LineString coordinates', () => {
      component.currentFeature ={
        geometry: {
          type: 'LineString',
          coordinates: [
            [-104.99, 39.74],
            [-104.98, 39.75]
          ]
        }
      };

      expect(component.getFeatureCoordinates()).toEqual([
        [-104.99, 39.74],
        [-104.98, 39.75]
      ]);
    });

    it('removes the closing coordinate from a Polygon', () => {
      component.currentFeature ={
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-104.99, 39.74],
            [-104.98, 39.75],
            [-104.97, 39.74],
            [-104.99, 39.74]
          ]]
        }
      };

      expect(component.getFeatureCoordinates()).toEqual([
        [-104.99, 39.74],
        [-104.98, 39.75],
        [-104.97, 39.74]
      ]);
    });

    it('returns an empty array for an unsupported geometry type', () => {
      component.currentFeature ={
        geometry: {
          type: 'MultiPoint',
          coordinates: []
        }
      };

      expect(component.getFeatureCoordinates()).toEqual([]);
    });
  });

  describe('shapeTypeChanged', () => {
    it('changes to Point and keeps the first coordinate', () => {
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75])
      ];

      component.currentFeature ={
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      };

      component.shapeTypeChanged('Point');

      expect(component.selectedShapeType).toBe('Point');
      expect(component.coordinates.length).toBe(1);
      expect(component.coordinates[0].coordinate).toEqual([-104.99, 39.74]);
    });

    it('starts an empty line when changing from Point', () => {
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74])
      ];

      component.currentFeature ={
        geometry: {
          type: 'Point',
          coordinates: []
        }
      };

      component.selectedShapeType = 'Point';
      component.shapeTypeChanged('LineString');

      expect(component.selectedShapeType).toBe('LineString');
      expect(component.coordinates).toEqual([]);
    });

    it('restarts an empty shape as a Point on the map when changing to Point', () => {
      initializeFeatureEdit();
      component.coordinates = [];
      component.currentFeature ={
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      };

      component.shapeTypeChanged('Point');

      expect(featureEdit.update).toHaveBeenCalledWith(jasmine.objectContaining({
        geometry: { type: 'Point', coordinates: [] }
      }));
    });

    it('keeps existing coordinates when changing from LineString to Polygon', () => {
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75])
      ];

      component.currentFeature ={
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      };

      component.selectedShapeType = 'LineString';
      component.shapeTypeChanged('Polygon');

      expect(component.selectedShapeType).toBe('Polygon');
      expect(component.coordinates.length).toBe(2);
    });
  });

  describe('helpText', () => {
    it('explains how to add points for each shape type', () => {
      component.selectedShapeType = 'Point';
      expect(component.helpText()).toContain('drag the marker');

      component.selectedShapeType = 'LineString';
      expect(component.helpText()).toContain('clicking the last point to finish');

      component.selectedShapeType = 'Polygon';
      expect(component.helpText()).toContain('first or last point to finish');
    });

    it('mentions place search for a point only when it is available', () => {
      component.selectedShapeType = 'Point';
      expect(component.helpText()).toBe('Search for a place or coordinates, or drag the marker on the map.');

      (Object.getOwnPropertyDescriptor(geocoderService, 'placenameSearchEnabled')!.get as jasmine.Spy).and.returnValue(false);
      expect(component.helpText()).toBe('Search for coordinates, or drag the marker on the map.');
    });
  });

  describe('pointsNeeded', () => {
    it('returns how many more vertices a Polygon needs', () => {
      component.selectedShapeType = 'Polygon';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74])
      ];

      expect(component.pointsNeeded()).toBe(2);
    });

    it('returns zero once the minimum is met', () => {
      component.selectedShapeType = 'LineString';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75]),
        new EditableCoordinate([-104.97, 39.76])
      ];

      expect(component.pointsNeeded()).toBe(0);
    });
  });

  describe('statusText', () => {
    it('says how many more points are needed', () => {
      component.selectedShapeType = 'Polygon';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74])
      ];

      expect(component.statusText()).toBe('Add 2 more points to finish this polygon');
    });

    it('says when polygon edges cross', () => {
      geometryService.featureHasIntersections.and.returnValue(true);
      component.selectedShapeType = 'Polygon';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75]),
        new EditableCoordinate([-104.98, 39.74]),
        new EditableCoordinate([-104.99, 39.75])
      ];
      component.currentFeature ={ geometry: { type: 'Polygon', coordinates: [] } };
      component.updateFeatureCoordinates();

      expect(component.statusText()).toBe('Edges cross. Move or remove a point to finish.');
    });

    it('checks for crossing edges once per geometry change', () => {
      geometryService.featureHasIntersections.and.returnValue(true);
      component.selectedShapeType = 'Polygon';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75]),
        new EditableCoordinate([-104.98, 39.74]),
        new EditableCoordinate([-104.99, 39.75])
      ];
      component.currentFeature ={ geometry: { type: 'Polygon', coordinates: [] } };
      component.updateFeatureCoordinates();

      component.statusText();
      component.canSave();
      component.hasCrossingEdges();

      expect(geometryService.featureHasIntersections).toHaveBeenCalledTimes(1);
    });

    it('is empty once the minimum is met', () => {
      component.selectedShapeType = 'LineString';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75])
      ];

      expect(component.statusText()).toBe('');
    });
  });

  describe('setPoint', () => {
    beforeEach(() => {
      initializeFeatureEdit();
      component.currentFeature ={
        geometry: {
          type: 'Point',
          coordinates: []
        }
      };
      component.selectedShapeType = 'Point';
    });

    it('replaces the coordinate with the place name and position', () => {
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74])
      ];

      component.setPoint({ name: 'Denver, CO', position: [-104.98, 39.75] } as any);

      expect(component.coordinates.length).toBe(1);
      expect(component.coordinates[0].name).toBe('Denver, CO');
      expect(component.coordinates[0].coordinate).toEqual([-104.98, 39.75]);
      expect(component.selectedIndex).toBe(0);
      expect(component.currentFeature.geometry.coordinates).toEqual([-104.98, 39.75]);
      expect(featureEdit.update).toHaveBeenCalledWith(component.currentFeature);
    });

    it('keeps typed MGRS as the name', () => {
      component.setPoint({ name: '13SEE0171300010', position: [-104.9798, 39.75012] } as any);

      expect(component.coordinates[0].name).toBe('13SEE0171300010');
    });

    it('does not keep a name for typed decimal coordinates', () => {
      component.setPoint({ name: '39.75, -104.98', position: [-104.98, 39.75] } as any);

      expect(component.coordinates[0].name).toBeUndefined();
    });
  });

  describe('removeVertex', () => {
    beforeEach(() => {
      initializeFeatureEdit();
      component.currentFeature ={
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      };
      component.selectedShapeType = 'LineString';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75]),
        new EditableCoordinate([-104.97, 39.76])
      ];
    });

    it('removes the vertex and updates the feature', () => {
      component.removeVertex(1);

      expect(component.currentFeature.geometry.coordinates).toEqual([
        [-104.99, 39.74],
        [-104.97, 39.76]
      ]);
      expect(featureEdit.update).toHaveBeenCalled();
    });

    it('shifts the selection when an earlier vertex is removed', () => {
      component.selectedIndex = 2;

      component.removeVertex(0);

      expect(component.selectedIndex).toBe(1);
    });

    it('clears the selection when the selected vertex is removed', () => {
      component.selectedIndex = 1;

      component.removeVertex(1);

      expect(component.selectedIndex).toBeUndefined();
    });
  });

  describe('selectVertex', () => {
    it('selects the vertex and highlights it on the map', () => {
      initializeFeatureEdit();

      component.selectVertex(2);

      expect(component.selectedIndex).toBe(2);
      expect(featureEdit.selectVertex).toHaveBeenCalledWith(2);
    });
  });

  describe('onVertexDeleted', () => {
    it('keeps the same point selected when an earlier vertex is deleted on the map', () => {
      component.currentFeature ={ geometry: { type: 'LineString', coordinates: [] } };
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75]),
        new EditableCoordinate([-104.97, 39.76]),
        new EditableCoordinate([-104.96, 39.77])
      ];
      component.selectedIndex = 2;

      component.onVertexDeleted(0);
      component.geometryChanged({
        type: 'LineString',
        coordinates: [[-104.98, 39.75], [-104.97, 39.76], [-104.96, 39.77]]
      });

      expect(component.selectedIndex).toBe(1);
      expect(component.coordinates[1].coordinate).toEqual([-104.97, 39.76]);
    });

    it('clears the selection when the selected vertex is deleted on the map', () => {
      component.selectedIndex = 2;

      component.onVertexDeleted(2);

      expect(component.selectedIndex).toBeUndefined();
    });
  });

  describe('onVertexClick', () => {
    it('selects the vertex', () => {
      component.onVertexClick(1);

      expect(component.selectedIndex).toBe(1);
    });
  });

  describe('updateFeatureCoordinates', () => {

    beforeEach(() => {
      initializeFeatureEdit();
      spyOn(component.save, 'emit');
      startEdit({
        id: 'feature-1',
        geometry: {
          type: 'Point',
          coordinates: []
        }
      });
    });

    it('updates a Point', () => {
      component.selectedShapeType = 'Point';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74])
      ];

      component.updateFeatureCoordinates();

      expect(component.currentFeature.geometry.coordinates).toEqual([
        -104.99,
        39.74
      ]);
      expect(featureEdit.update).toHaveBeenCalledWith(component.currentFeature);
    });

    it('updates a LineString', () => {
      component.selectedShapeType = 'LineString';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75])
      ];

      component.updateFeatureCoordinates();

      expect(component.currentFeature.geometry.coordinates).toEqual([
        [-104.99, 39.74],
        [-104.98, 39.75]
      ]);
      expect(featureEdit.update).toHaveBeenCalledWith(component.currentFeature);
    });

    it('closes a Polygon ring', () => {
      component.selectedShapeType = 'Polygon';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75]),
        new EditableCoordinate([-104.97, 39.74])
      ];

      component.updateFeatureCoordinates();

      expect(component.currentFeature.geometry.coordinates).toEqual([
        [
          [-104.99, 39.74],
          [-104.98, 39.75],
          [-104.97, 39.74],
          [-104.99, 39.74]
        ]
      ]);
    });

    it('updates the feature even when polygon edges cross', () => {
      geometryService.featureHasIntersections.and.returnValue(true);

      component.selectedShapeType = 'Polygon';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75]),
        new EditableCoordinate([-104.98, 39.74]),
        new EditableCoordinate([-104.99, 39.75])
      ];

      component.updateFeatureCoordinates();

      expect(featureEdit.update).toHaveBeenCalledWith(component.currentFeature);
      expect(component.currentFeature.geometry.coordinates[0].length).toBe(5);
    });
  });

  describe('onSearchResult', () => {
    beforeEach(() => {
      initializeFeatureEdit();
    });

    it('sets the location of a Point', () => {
      component.selectedShapeType = 'Point';
      component.currentFeature ={ geometry: { type: 'Point', coordinates: [] } };

      component.onSearchResult({ name: 'Denver, CO', position: [-104.98, 39.75] } as any);

      expect(component.coordinates.length).toBe(1);
      expect(component.currentFeature.geometry.coordinates).toEqual([-104.98, 39.75]);
    });

    it('only moves the map for a line', () => {
      component.selectedShapeType = 'LineString';
      component.currentFeature ={ geometry: { type: 'LineString', coordinates: [] } };
      const result = { name: 'Denver, CO', position: [-104.98, 39.75] } as any;

      component.onSearchResult(result);

      expect(component.coordinates.length).toBe(0);
      expect(featureEdit.showSearchResult).toHaveBeenCalledWith(result);
      expect(featureEdit.update).not.toHaveBeenCalled();
    });
  });

  describe('row editing', () => {
    beforeEach(() => {
      initializeFeatureEdit();
      component.selectedShapeType = 'LineString';
      component.currentFeature ={ geometry: { type: 'LineString', coordinates: [] } };
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74], 'Denver, CO'),
        new EditableCoordinate([-104.98, 39.75])
      ];
      component.coordinates.forEach(coordinate => component.resetRow(coordinate));
    });

    it('labels rows with their number and place name', () => {
      expect(component.rowLabel(component.coordinates[0], 0)).toBe('1. Denver, CO');
      expect(component.rowLabel(component.coordinates[1], 1)).toBe('Point 2');
    });

    it('labels a single point without a number', () => {
      component.selectedShapeType = 'Point';

      expect(component.rowLabel(component.coordinates[0], 0)).toBe('Denver, CO');
      expect(component.rowLabel(component.coordinates[1], 1)).toBe('Coordinates');
    });

    it('fills each row with its coordinates', () => {
      expect(component.coordinates[0].text).toBe('39.74, -104.99');
      expect(component.coordinates[1].text).toBe('39.75, -104.98');
    });

    it('formats coordinates with the display preference', () => {
      geometryPipe.transform.and.returnValue('13SEE0000000000');

      expect(component.displayCoordinate(component.coordinates[1])).toBe('13SEE0000000000');
      expect(geometryPipe.transform).toHaveBeenCalledWith({ type: 'Point', coordinates: [-104.98, 39.75] }, 5);
    });

    it('shows the detected format and position while typing', () => {
      const coordinate = component.coordinates[0];
      geocoderService.coordinateFromText.and.returnValue({ position: [-104.98, 39.75], coordinateSystem: 'mgrs' });

      component.onRowChange(coordinate, '13SEE0171300010');

      expect(component.rowHint(coordinate)).toBe('MGRS → 39.75000, -104.98000');
    });

    it('shows no hint for unchanged coordinates', () => {
      const coordinate = component.coordinates[0];

      component.onRowChange(coordinate, '39.74, -104.99');

      expect(component.rowHint(coordinate)).toBe('');
    });

    it('applies typed coordinates and drops the place name', () => {
      const coordinate = component.coordinates[0];
      component.onRowChange(coordinate, '40.1, -105.2');

      component.applyRow(coordinate);

      expect(coordinate.coordinate).toEqual([-105.2, 40.1]);
      expect(coordinate.name).toBeUndefined();
      expect(coordinate.text).toBe('40.1, -105.2');
      expect(featureEdit.update).toHaveBeenCalled();
    });

    it('does not update the map when the text did not change', () => {
      component.applyRow(component.coordinates[0]);

      expect(featureEdit.update).not.toHaveBeenCalled();
    });

    it('keeps the text and shows an error for unreadable input', () => {
      const coordinate = component.coordinates[0];
      component.onRowChange(coordinate, 'denver');

      component.applyRow(coordinate);

      expect(coordinate.text).toBe('denver');
      expect(coordinate.error).toBeDefined();
      expect(component.rowHint(coordinate)).toBe(coordinate.error!);
      expect(featureEdit.update).not.toHaveBeenCalled();
    });

    it('clears the error when the input changes', () => {
      const coordinate = component.coordinates[0];
      component.onRowChange(coordinate, 'denver');
      component.applyRow(coordinate);

      component.onRowChange(coordinate, '40.1, -105.2');

      expect(coordinate.error).toBeUndefined();
    });

    it('resets the row without changing the point', () => {
      const coordinate = component.coordinates[0];
      component.onRowChange(coordinate, '40.1, -105.2');

      component.resetRow(coordinate);

      expect(coordinate.text).toBe('39.74, -104.99');
      expect(coordinate.coordinate).toEqual([-104.99, 39.74]);
    });
  });

  describe('paste', () => {
    beforeEach(() => {
      initializeFeatureEdit();
      component.selectedShapeType = 'LineString';
      component.currentFeature ={ geometry: { type: 'LineString', coordinates: [] } };
      component.coordinates = [new EditableCoordinate([1, 1])];
      component.openPaste();
    });

    it('reads one point per line and skips blank lines', () => {
      component.onPasteChange('39.74, -104.99\n\n39.75, -104.98\r\n');

      expect(component.pasted.coordinates.length).toBe(2);
      expect(component.pasteSummary()).toBe('Line · 2 points');
      expect(component.canApplyPaste()).toBeTrue();
      expect(component.hasPasteError()).toBeFalse();
    });

    it('reports lines it cannot read', () => {
      component.onPasteChange('39.74, -104.99\nnot a point\n39.75, -104.98\nnope');

      expect(component.pasted.invalidLines).toEqual([2, 4]);
      expect(component.pasteSummary()).toBe("Can't read lines 2, 4");
      expect(component.canApplyPaste()).toBeFalse();
      expect(component.hasPasteError()).toBeTrue();
    });

    it('turns a single location into a point', () => {
      component.onPasteChange('39.74, -104.99');

      expect(component.pasteSummary()).toBe('Point · 1 point');

      component.applyPaste();

      expect(component.selectedShapeType).toBe('Point');
      expect(component.coordinates.length).toBe(1);
      expect(component.currentFeature.geometry.coordinates).toEqual([-104.99, 39.74]);
    });

    it('turns a point into a line when pasting several locations', () => {
      component.selectedShapeType = 'Point';
      component.currentFeature ={ geometry: { type: 'Point', coordinates: [1, 1] } };

      component.onPasteChange('39.74, -104.99\n39.75, -104.98');
      component.applyPaste();

      expect(component.selectedShapeType).toBe('LineString');
      expect(component.currentFeature.geometry.coordinates).toEqual([[-104.99, 39.74], [-104.98, 39.75]]);
    });

    it('turns a polygon into a line when the list is not closed', () => {
      component.selectedShapeType = 'Polygon';
      component.currentFeature ={ geometry: { type: 'Polygon', coordinates: [] } };

      component.onPasteChange('0, 0\n0, 1\n1, 1');
      component.applyPaste();

      expect(component.selectedShapeType).toBe('LineString');
    });
    it('explains pasting while the paste box is open', () => {
      expect(component.helpText()).toContain('This replaces the current location');

      component.closePaste();

      expect(component.helpText()).toContain('Click the map to draw the line');
    });

    it('switches to the shape of pasted GeoJSON', () => {
      component.onPasteChange('{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}');

      expect(component.pasteSummary()).toBe('GeoJSON polygon · 3 points');

      component.applyPaste();

      expect(component.selectedShapeType).toBe('Polygon');
      expect(component.currentFeature.geometry.type).toBe('Polygon');
      expect(component.currentFeature.geometry.coordinates).toEqual([[[0, 0], [1, 0], [1, 1], [0, 0]]]);
    });

    it('replaces an earlier paste when the new text cannot be read', () => {
      component.onPasteChange('39.74, -104.99\n39.75, -104.98');
      component.onPasteChange('<Point><coordinates>-104.9,39.7');

      expect(component.pasted.coordinates).toEqual([]);
      expect(component.pasteSummary()).toBe("Can't read line 1");
      expect(component.canApplyPaste()).toBeFalse();
    });

    it('shows why a pasted geometry cannot be used', () => {
      component.onPasteChange('MULTIPOINT ((0 0), (1 1))');

      expect(component.pasteSummary()).toBe('MultiPoint is not supported, use a point, line or polygon');
      expect(component.canApplyPaste()).toBeFalse();
      expect(component.hasPasteError()).toBeTrue();
    });

    it('reads points separated by semicolons and reports the line', () => {
      component.onPasteChange('39.74, -104.99; 39.75, -104.98\n1, 1; nope');

      expect(component.pasted.coordinates.length).toBe(3);
      expect(component.pasted.invalidLines).toEqual([2]);
    });

    it('skips a header row', () => {
      component.onPasteChange('lat, lon\n39.74, -104.99\n39.75, -104.98');

      expect(component.pasted.coordinates.length).toBe(2);
      expect(component.canApplyPaste()).toBeTrue();
    });

    it('turns a closed list into a polygon without the repeated point', () => {
      component.onPasteChange('1, 1\n1, 2\n2, 2\n1, 1');

      expect(component.pasted.coordinates.length).toBe(3);
      expect(component.pasteSummary()).toBe('Polygon · 3 points');

      component.applyPaste();

      expect(component.selectedShapeType).toBe('Polygon');
    });

    it('replaces all points', () => {
      component.onPasteChange('39.74, -104.99\n39.75, -104.98');

      component.applyPaste();

      expect(component.pasteOpen).toBeFalse();
      expect(component.currentFeature.geometry.coordinates).toEqual([[-104.99, 39.74], [-104.98, 39.75]]);
      expect(featureEdit.update).toHaveBeenCalled();
    });
  });

  describe('canSave', () => {
    it('allows a Point with one complete coordinate', () => {
      component.selectedShapeType = 'Point';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74])
      ];

      expect(component.canSave()).toBeTrue();
    });

    it('does not allow a Point without a coordinate', () => {
      component.selectedShapeType = 'Point';
      component.coordinates = [new EditableCoordinate()];

      expect(component.canSave()).toBeFalse();
    });

    it('allows a LineString with two complete coordinates', () => {
      component.selectedShapeType = 'LineString';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75])
      ];

      expect(component.canSave()).toBeTrue();
    });

    it('does not allow a LineString with fewer than two coordinates', () => {
      component.selectedShapeType = 'LineString';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74])
      ];

      expect(component.canSave()).toBeFalse();
    });

    it('allows a Polygon with three complete coordinates', () => {
      component.selectedShapeType = 'Polygon';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75]),
        new EditableCoordinate([-104.97, 39.74])
      ];

      expect(component.canSave()).toBeTrue();
    });

    it('does not allow a Polygon with fewer than three coordinates', () => {
      component.selectedShapeType = 'Polygon';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75])
      ];

      expect(component.canSave()).toBeFalse();
    });

    it('does not allow a Polygon whose edges cross', () => {
      geometryService.featureHasIntersections.and.returnValue(true);
      component.selectedShapeType = 'Polygon';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75]),
        new EditableCoordinate([-104.98, 39.74]),
        new EditableCoordinate([-104.99, 39.75])
      ];
      component.currentFeature ={ geometry: { type: 'Polygon', coordinates: [] } };
      component.updateFeatureCoordinates();

      expect(component.canSave()).toBeFalse();
    });

    it('does not allow a geometry containing an incomplete coordinate', () => {
      component.selectedShapeType = 'Polygon';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate(),
        new EditableCoordinate([-104.97, 39.74])
      ];

      expect(component.canSave()).toBeFalse();
    });
  });

  describe('onSave', () => {
    beforeEach(() => {
      initializeFeatureEdit();
      spyOn(component.save, 'emit');
      startEdit({
        id: 'feature-1',
        geometry: {
          type: 'Point',
          coordinates: [-104.99, 39.74]
        }
      });
    });

    it('saves the feature when it is valid', () => {
      component.onSave();

      expect(featureEdit.save).toHaveBeenCalled();
      // expect(component.save.emit).toHaveBeenCalledWith({
      //   feature: component.feature
      // });
    });

    it('does not save a polygon whose edges cross', () => {
      geometryService.featureHasIntersections.and.returnValue(true);
      component.currentFeature ={ id: 'feature-1', geometry: { type: 'Polygon', coordinates: [] } };
      component.selectedShapeType = 'Polygon';
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75]),
        new EditableCoordinate([-104.98, 39.74]),
        new EditableCoordinate([-104.99, 39.75])
      ];
      component.updateFeatureCoordinates();

      component.onSave();

      expect(featureEdit.save).not.toHaveBeenCalled();
      expect(component.save.emit).not.toHaveBeenCalled();
    });
  });

  describe('onCancel', () => {
    beforeEach(() => {
      initializeFeatureEdit();
      spyOn(component.cancel, 'emit');
      component.currentFeature ={
        id: 'feature-1',
        geometry: {
          type: 'Point',
          coordinates: []
        }
      };
    });

    it('cancels the feature edit and emits cancel', () => {
      component.onCancel();

      expect(featureEdit.cancel).toHaveBeenCalled();
      expect(component.cancel.emit).toHaveBeenCalled();
    });
  });

  describe('geometryChanged', () => {
    it('updates the feature geometry and editable coordinates', () => {
      component.currentFeature ={
        geometry: {
          type: 'Point',
          coordinates: []
        }
      };

      component.geometryChanged({
        type: 'Point',
        coordinates: [-104.99, 39.74]
      });

      expect(component.currentFeature.geometry).toEqual({
        type: 'Point',
        coordinates: [-104.99, 39.74]
      });

      expect(component.coordinates[0].coordinate).toEqual([-104.99, 39.74]);
    });

    it('drops vertices removed on the map', () => {
      component.currentFeature ={ geometry: { type: 'LineString', coordinates: [] } };
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74]),
        new EditableCoordinate([-104.98, 39.75]),
        new EditableCoordinate([-104.97, 39.76])
      ];
      component.selectedIndex = 2;

      component.geometryChanged({
        type: 'LineString',
        coordinates: [[-104.99, 39.74], [-104.98, 39.75]]
      });

      expect(component.coordinates.length).toBe(2);
      expect(component.selectedIndex).toBeUndefined();
    });

    it('keeps place names for vertices that did not move', () => {
      component.currentFeature ={ geometry: { type: 'LineString', coordinates: [] } };
      component.coordinates = [
        new EditableCoordinate([-104.99, 39.74], 'Denver, CO'),
        new EditableCoordinate([-104.98, 39.75], 'Aurora, CO')
      ];

      component.geometryChanged({
        type: 'LineString',
        coordinates: [[-104.99, 39.74], [-104.5, 39.5]]
      });

      expect(component.coordinates.map(c => c.name)).toEqual(['Denver, CO', undefined]);
    });

    it('keeps the coordinate and place name through a map round trip', () => {
      component.currentFeature ={ geometry: { type: 'LineString', coordinates: [] } };
      component.coordinates = [
        new EditableCoordinate([-104.98471, 39.00008], 'Denver, CO')
      ];

      component.geometryChanged({
        type: 'LineString',
        coordinates: [[-104.98471, 39.00008]]
      });

      expect(component.coordinates[0].coordinate).toEqual([-104.98471, 39.00008]);
      expect(component.coordinates[0].name).toBe('Denver, CO');
    });
  });
});