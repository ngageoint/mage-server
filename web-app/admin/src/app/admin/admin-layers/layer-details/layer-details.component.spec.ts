import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  discardPeriodicTasks
} from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Observable } from 'rxjs';

import { LayerDetailsComponent } from './layer-details.component';
import { LayersService } from '../layers.service';
import { AdminEventsService } from '../../services/admin-events.service';
import { LocalStorageService } from 'src/app/http/local-storage.service';
import { AdminUserService } from '../../services/admin-user.service';

describe('LayerDetailsComponent', () => {
  let component: LayerDetailsComponent;
  let fixture: ComponentFixture<LayerDetailsComponent>;
  let router: Router;

  let mockLocalStorageService: any;
  let mockUserService: any;
  let mockLayersService: any;
  let mockEventsService: any;

  const makeActivatedRoute = (params: Record<string, any>) => ({
    snapshot: {
      paramMap: convertToParamMap(params)
    }
  });

  function buildMocks() {
    mockLocalStorageService = {
      getToken: () => 'test-token'
    };

    mockUserService = {
      getMyself: jasmine.createSpy('getMyself').and.returnValue(
        of({
          id: '123',
          role: {
            permissions: ['UPDATE_LAYER', 'DELETE_LAYER']
          }
        })
      )
    };

    mockLayersService = {
      getLayerById: jasmine.createSpy('getLayerById').and.returnValue(
        of({
          id: 1,
          name: 'Test Layer',
          type: 'Feature',
          state: 'available'
        })
      ),
      deleteLayer: jasmine.createSpy('deleteLayer').and.returnValue(of({})),
      updateLayer: jasmine.createSpy('updateLayer').and.returnValue(of({}))
    };

    mockEventsService = {
      getEvents: jasmine.createSpy('getEvents').and.returnValue(
        of({
          items: [],
          totalCount: 0
        })
      ),
      addLayerToEvent: jasmine
        .createSpy('addLayerToEvent')
        .and.returnValue(of({})),
      removeLayerFromEvent: jasmine
        .createSpy('removeLayerFromEvent')
        .and.returnValue(of({}))
    };
  }

  /**
   * IMPORTANT:
   * - Most tests do NOT want the polling timer behavior.
   * - So we stub checkLayerProcessingStatus by default.
   * - Only tests that verify polling call createWithRouteParams(..., true)
   */
  async function createWithRouteParams(
    params: Record<string, any>,
    allowRealProcessingCheck = false
  ) {
    buildMocks();

    await TestBed.configureTestingModule({
      declarations: [LayerDetailsComponent],
      imports: [
        HttpClientTestingModule,
        MatDialogModule,
        MatSnackBarModule,
        NoopAnimationsModule,
        RouterTestingModule
      ],
      providers: [
        { provide: ActivatedRoute, useValue: makeActivatedRoute(params) },
        { provide: LayersService, useValue: mockLayersService },
        { provide: AdminEventsService, useValue: mockEventsService },
        { provide: LocalStorageService, useValue: mockLocalStorageService },
        { provide: AdminUserService, useValue: mockUserService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LayerDetailsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    if (!allowRealProcessingCheck) {
      (component as any).checkLayerProcessingStatus = jasmine.createSpy(
        'checkLayerProcessingStatus'
      );
    }

    fixture.detectChanges();
  }

  beforeEach(async () => {
    await createWithRouteParams({ layerId: '1' }, false);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load layer on init', () => {
    expect(mockLayersService.getLayerById).toHaveBeenCalledWith('1');
    expect(component.layer).toBeDefined();
  });

  it('should set permissions based on user role', () => {
    expect(component.hasLayerEditPermission).toBe(true);
    expect(component.hasLayerDeletePermission).toBe(true);
  });

  describe('ngOnInit', () => {
    it('should call updateActionButtons via permissions subscription', () => {
      const spy = spyOn<any>(
        component,
        'updateActionButtons'
      ).and.callThrough();

      component.ngOnInit();

      expect(spy).toHaveBeenCalled();
    });

    it('should handle missing layerId in route params', async () => {
      TestBed.resetTestingModule();
      await createWithRouteParams({}, false);

      expect(component.loading).toBe(false);
      expect(component.error).toBe('No layer id provided.');
    });
  });

  describe('loadLayer', () => {
    it('should update breadcrumbs with layer name', () => {
      expect(component.breadcrumbs.length).toBe(2);
      expect(component.breadcrumbs[1].title).toBe('Test Layer');
    });

    it('should handle layer loading error', () => {
      (mockLayersService.getLayerById as jasmine.Spy).and.returnValue(
        new Observable((observer) =>
          observer.error({ message: 'Layer not found' })
        )
      );

      const snackBarSpy = spyOn((component as any).snackBar, 'open');

      (component as any).loadLayer('999');

      expect(component.error).toBe('Layer not found');
      expect(snackBarSpy).toHaveBeenCalledWith(
        'Error loading layer: ' + 'Layer not found',
        'Close',
        { duration: 5000 }
      );
    });

    it('should call checkLayerProcessingStatus for processing layers (stubbed)', fakeAsync(() => {
      const processingLayer = {
        id: 1,
        name: 'Processing Layer',
        type: 'Feature',
        state: 'processing'
      };

      (mockLayersService.getLayerById as jasmine.Spy).and.returnValue(
        of(processingLayer as any)
      );

      const statusSpy = component[
        'checkLayerProcessingStatus'
      ] as unknown as jasmine.Spy;

      (component as any).loadLayer('1');

      tick(1500);

      expect(statusSpy).toHaveBeenCalled();

      discardPeriodicTasks();
    }));
  });

  describe('updateUrlLayers', () => {
    it('should create URL mappings for layer tables', () => {
      component.layer = {
        id: 1,
        name: 'Test Layer',
        type: 'Feature',
        tables: [{ name: 'table1' }, { name: 'table2' }]
      } as any;

      (component as any).updateUrlLayers();

      expect(component.urlLayers.length).toBe(2);
      expect(component.urlLayers[0].table).toBe('table1');
      expect(component.urlLayers[0].url).toContain(
        '/api/layers/1/table1/{z}/{x}/{y}.png'
      );
      expect(component.urlLayers[0].url).toContain('access_token=test-token');
      expect(component.urlLayers[1].table).toBe('table2');
    });

    it('should handle layers without tables', () => {
      component.layer = {
        id: 1,
        name: 'Test Layer',
        type: 'Feature'
      } as any;

      (component as any).updateUrlLayers();

      expect(component.urlLayers.length).toBe(0);
    });
  });

  describe('updateActionButtons', () => {
    it('should create action buttons when user has edit permission', () => {
      component.hasLayerEditPermission = true;
      (component as any).updateActionButtons();

      expect(component.eventActionButtons.length).toBe(2);
      expect(component.eventActionButtons[0].label).toBe('Edit Events');
      expect(component.eventActionButtons[1].label).toBe('Add Event');
    });

    it('should update button label when in edit mode', () => {
      component.hasLayerEditPermission = true;
      component.editEvents = true;
      (component as any).updateActionButtons();

      expect(component.eventActionButtons[0].label).toBe('Done');
      expect(component.eventActionButtons[0].type).toBe('btn-primary');
    });

    it('should not create action buttons when user lacks edit permission', () => {
      component.hasLayerEditPermission = false;
      (component as any).updateActionButtons();

      expect(component.eventActionButtons.length).toBe(0);
    });
  });

  describe('getEventsPage', () => {
    it('should load events with pagination parameters', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      component.eventsPageIndex = 2;
      component.eventsPageSize = 10;

      component.getEventsPage();

      expect(mockEventsService.getEvents).toHaveBeenCalledWith({
        page: 2,
        page_size: 10,
        layerId: '1'
      });
    });

    it('should include search term in request', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      component.eventSearchTerm = 'search test';

      component.getEventsPage();

      expect(mockEventsService.getEvents).toHaveBeenCalledWith(
        jasmine.objectContaining({ term: 'search test' })
      );
    });

    it('should handle empty layer', () => {
      component.layer = undefined;
      (mockEventsService.getEvents as jasmine.Spy).calls.reset();

      component.getEventsPage();

      expect(mockEventsService.getEvents).not.toHaveBeenCalled();
      expect(component.loadingEvents).toBe(false);
    });

    it('should handle error loading events', () => {
      (mockEventsService.getEvents as jasmine.Spy).and.returnValue(
        new Observable((observer) =>
          observer.error({ message: 'Failed to load' })
        )
      );

      const snackBarSpy = spyOn((component as any).snackBar, 'open');
      component.layer = { id: 1, name: 'Test', type: 'Feature' } as any;

      component.getEventsPage();

      expect(snackBarSpy).toHaveBeenCalledWith(
        'Error loading events',
        'Close',
        { duration: 5000 }
      );
      expect(component.loadingEvents).toBe(false);
    });
  });

  describe('onEventSearchChange', () => {
    it('should update search term and reset page index', () => {
      spyOn(component, 'getEventsPage');
      component.eventsPageIndex = 5;

      component.onEventSearchChange('new search');

      expect(component.eventSearchTerm).toBe('new search');
      expect(component.eventsPageIndex).toBe(0);
      expect(component.getEventsPage).toHaveBeenCalled();
    });

    it('should handle empty search term', () => {
      spyOn(component, 'getEventsPage');

      component.onEventSearchChange();

      expect(component.eventSearchTerm).toBe('');
      expect(component.getEventsPage).toHaveBeenCalled();
    });
  });

  describe('onEventsPageChange', () => {
    it('should update pagination and reload events', () => {
      spyOn(component, 'getEventsPage');
      const pageEvent = { pageIndex: 3, pageSize: 25 } as any;

      component.onEventsPageChange(pageEvent);

      expect(component.eventsPageIndex).toBe(3);
      expect(component.eventsPageSize).toBe(25);
      expect(component.getEventsPage).toHaveBeenCalled();
    });
  });

  describe('toggleEditEvents', () => {
    it('should toggle edit mode', () => {
      spyOn<any>(component, 'updateActionButtons');
      component.editEvents = false;

      component.toggleEditEvents();

      expect(component.editEvents).toBe(true);
      expect((component as any).updateActionButtons).toHaveBeenCalled();
    });
  });

  describe('addEventToLayer', () => {
    it('should add layer to selected event', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      const selectedEvent = { id: 456, name: 'Selected Event' };
      const snackBarSpy = spyOn((component as any).snackBar, 'open');
      spyOn(component, 'getEventsPage');

      spyOn((component as any).dialog, 'open').and.returnValue({
        afterClosed: () => of({ selectedItem: selectedEvent })
      } as any);

      component.addEventToLayer();

      expect(mockEventsService.addLayerToEvent).toHaveBeenCalledWith('456', {
        id: 1
      });
      expect(component.getEventsPage).toHaveBeenCalled();
      expect(snackBarSpy).toHaveBeenCalledWith(
        `Layer added to event: ${selectedEvent.name}`,
        undefined,
        { duration: 2000 }
      );
    });

    it('should handle error adding layer to event', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      const selectedEvent = { id: 456, name: 'Selected Event' };

      (mockEventsService.addLayerToEvent as jasmine.Spy).and.returnValue(
        new Observable((observer) =>
          observer.error({ message: 'Failed to add' })
        )
      );

      const snackBarSpy = spyOn((component as any).snackBar, 'open');

      spyOn((component as any).dialog, 'open').and.returnValue({
        afterClosed: () => of({ selectedItem: selectedEvent })
      } as any);

      component.addEventToLayer();

      expect(snackBarSpy).toHaveBeenCalledWith(
        'Error adding layer to event',
        'Close',
        {
          duration: 5000
        }
      );
    });

    it('should not proceed if layer is missing', () => {
      component.layer = undefined;
      const dialogSpy = spyOn((component as any).dialog, 'open');

      component.addEventToLayer();

      expect(dialogSpy).not.toHaveBeenCalled();
    });
  });

  describe('removeEventFromLayer', () => {
    it('should remove layer from event', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      const testEvent = { id: 789, name: 'Test Event' } as any;
      const snackBarSpy = spyOn((component as any).snackBar, 'open');
      spyOn(component, 'getEventsPage');

      component.removeEventFromLayer(testEvent);

      expect(mockEventsService.removeLayerFromEvent).toHaveBeenCalledWith(
        '789',
        1
      );
      expect(component.getEventsPage).toHaveBeenCalled();
      expect(snackBarSpy).toHaveBeenCalledWith(
        'Layer removed from event',
        undefined,
        {
          duration: 2000
        }
      );
    });

    it('should stop event propagation when mouse event provided', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      const testEvent = { id: 789, name: 'Test Event' } as any;
      const mouseEvent = jasmine.createSpyObj('MouseEvent', [
        'stopPropagation'
      ]);

      component.removeEventFromLayer(testEvent, mouseEvent);

      expect(mouseEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should handle error removing layer from event', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      const testEvent = { id: 789, name: 'Test Event' } as any;

      (mockEventsService.removeLayerFromEvent as jasmine.Spy).and.returnValue(
        new Observable((observer) =>
          observer.error({ message: 'Failed to remove' })
        )
      );

      const snackBarSpy = spyOn((component as any).snackBar, 'open');

      component.removeEventFromLayer(testEvent);

      expect(snackBarSpy).toHaveBeenCalledWith(
        'Error removing layer from event',
        'Close',
        {
          duration: 5000
        }
      );
    });
  });

  describe('toggleEditDetails', () => {
    it('should populate form when entering edit mode', () => {
      component.layer = {
        id: 1,
        name: 'Test Layer',
        description: 'Test Description',
        type: 'Feature'
      } as any;
      component.editingDetails = false;

      component.toggleEditDetails();

      expect(component.editingDetails).toBe(true);
      expect(component.layerEditForm.name).toBe('Test Layer');
      expect(component.layerEditForm.description).toBe('Test Description');
    });

    it('should toggle edit mode off', () => {
      component.editingDetails = true;

      component.toggleEditDetails();

      expect(component.editingDetails).toBe(false);
    });
  });

  describe('saveLayerDetails', () => {
    beforeEach(() => {
      (mockLayersService.updateLayer as jasmine.Spy).and.returnValue(
        of({
          name: 'Updated Layer',
          description: 'Updated Description'
        })
      );
    });

    it('should update layer details', () => {
      component.layer = { id: 1, name: 'Old Name', type: 'Feature' } as any;
      component.layerEditForm = {
        name: 'New Name',
        description: 'New Description',
        format: '',
        base: false
      };
      const snackBarSpy = spyOn((component as any).snackBar, 'open');

      component.saveLayerDetails();

      expect(mockLayersService.updateLayer).toHaveBeenCalledWith('1', {
        name: 'New Name',
        description: 'New Description',
        type: 'Feature'
      });
      expect(component.editingDetails).toBe(false);
      expect(snackBarSpy).toHaveBeenCalledWith(
        'Layer updated successfully',
        undefined,
        {
          duration: 2000
        }
      );
    });

    it('should handle update error', () => {
      component.layer = { id: 1, name: 'Old Name', type: 'Feature' } as any;

      (mockLayersService.updateLayer as jasmine.Spy).and.returnValue(
        new Observable((observer) =>
          observer.error({
            error: { message: 'Update failed' }
          })
        )
      );

      const snackBarSpy = spyOn((component as any).snackBar, 'open');

      component.saveLayerDetails();

      expect(snackBarSpy).toHaveBeenCalledWith(
        'Error updating layer: Update failed',
        'Close',
        {
          duration: 5000
        }
      );
    });

    it('should not proceed if layer is missing', () => {
      component.layer = undefined;
      (mockLayersService.updateLayer as jasmine.Spy).calls.reset();

      component.saveLayerDetails();

      expect(mockLayersService.updateLayer).not.toHaveBeenCalled();
    });
  });

  describe('cancelEditDetails', () => {
    it('should reset form and exit edit mode', () => {
      component.layer = {
        id: 1,
        name: 'Original Name',
        description: 'Original Description',
        type: 'Feature'
      } as any;
      component.editingDetails = true;
      component.layerEditForm = {
        name: 'Changed',
        description: 'Changed',
        format: '',
        base: false
      };

      component.cancelEditDetails();

      expect(component.editingDetails).toBe(false);
      expect(component.layerEditForm.name).toBe('Original Name');
      expect(component.layerEditForm.description).toBe('Original Description');
    });
  });

  describe('deleteLayer', () => {
    it('should open delete confirmation dialog', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      const dialogSpy = spyOn(
        (component as any).dialog,
        'open'
      ).and.returnValue({
        afterClosed: () => of(false)
      } as any);

      component.deleteLayer();

      expect(dialogSpy).toHaveBeenCalled();
    });

    it('should navigate to layers list when delete confirmed', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;

      const snackBarSpy = spyOn((component as any).snackBar, 'open');
      spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

      spyOn((component as any).dialog, 'open').and.returnValue({
        afterClosed: () => of(true)
      } as any);

      component.deleteLayer();

      expect(snackBarSpy).toHaveBeenCalledWith(
        'Layer deleted successfully',
        'Close',
        { duration: 3000 }
      );

      expect(router.navigate).toHaveBeenCalledWith(
        ['../../layers'],
        jasmine.objectContaining({ relativeTo: jasmine.any(Object) })
      );
    });
  });

  describe('isLayerFileBased', () => {
    it('should return true for file-based layers', () => {
      component.layer = {
        id: 1,
        name: 'Test',
        type: 'Feature',
        file: { name: 'test.kml' }
      } as any;

      expect(component.isLayerFileBased()).toBe(true);
    });

    it('should return false for non-file-based layers', () => {
      component.layer = { id: 1, name: 'Test', type: 'Feature' } as any;

      expect(component.isLayerFileBased()).toBe(false);
    });

    it('should return false when layer is missing', () => {
      component.layer = undefined;

      expect(component.isLayerFileBased()).toBe(false);
    });
  });

  describe('downloadLayer', () => {
    it('should create download link with correct URL', () => {
      component.layer = {
        id: 1,
        name: 'Test',
        type: 'Feature',
        file: { name: 'test.kml' }
      } as any;

      const createElementSpy = spyOn(
        document,
        'createElement'
      ).and.callThrough();
      const appendChildSpy = spyOn(document.body, 'appendChild').and.stub();
      const removeChildSpy = spyOn(document.body, 'removeChild').and.stub();
      const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click').and.stub();

      component.downloadLayer();

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });
  });

  describe('addUploadFile', () => {
    it('should add new upload item to uploads array', () => {
      const initialLength = component.uploads.length;

      component.addUploadFile();

      expect(component.uploads.length).toBe(initialLength + 1);
    });
  });

  describe('onFileSelected', () => {
    it('should accept valid KML file', () => {
      const file = new File(['content'], 'test.kml', {
        type: 'application/vnd.google-earth.kml+xml'
      });
      const event = { target: { files: [file] } };

      component.onFileSelected(event, 0);

      expect(component.uploads[0].file).toBe(file);
      expect(component.uploads[0].error).toBeUndefined();
    });

    it('should accept valid KMZ file', () => {
      const file = new File(['content'], 'test.kmz', {
        type: 'application/vnd.google-earth.kmz'
      });
      const event = { target: { files: [file] } };

      component.onFileSelected(event, 0);

      expect(component.uploads[0].file).toBe(file);
      expect(component.uploads[0].error).toBeUndefined();
    });

    it('should reject invalid file type', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const event = { target: { files: [file] } };
      const snackBarSpy = spyOn((component as any).snackBar, 'open');

      component.onFileSelected(event, 0);

      expect(component.uploads[0].error).toContain('Invalid file type');
      expect(snackBarSpy).toHaveBeenCalled();
    });
  });

  describe('confirmUpload', () => {
    it('should show error when no files selected', () => {
      component.uploads = [{}];
      component.layer = { id: 1, name: 'Test', type: 'Feature' } as any;
      const snackBarSpy = spyOn((component as any).snackBar, 'open');

      component.confirmUpload();

      expect(snackBarSpy).toHaveBeenCalledWith(
        'Please select at least one file to upload',
        'Close',
        { duration: 3000 }
      );
    });

    it('should reject upload for non-Feature layers', () => {
      component.layer = { id: 1, name: 'Test', type: 'GeoPackage' } as any;
      component.uploads = [{ file: new File(['content'], 'test.kml') }];
      const snackBarSpy = spyOn((component as any).snackBar, 'open');

      component.confirmUpload();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('Cannot upload to layer of type "GeoPackage"'),
        'Close',
        { duration: 5000 }
      );
    });

    it('should upload selected files and reset uploads on success', () => {
      component.layer = {
        id: 1,
        name: 'Test',
        type: 'Feature',
        state: 'available'
      } as any;

      const file = new File(['content'], 'test.kml');
      component.uploads = [{ file }];

      const uploadFileSpy = spyOn<any>(component, 'uploadFile').and.returnValue(
        of({ files: [{ name: 'test.kml', features: 10 }] })
      );

      component.confirmUpload();

      expect(uploadFileSpy).toHaveBeenCalledWith(file);
      expect(component.isUploading).toBe(false);
      expect(component.uploads).toEqual([{}]);
    });
  });

  describe('removeUploadFile', () => {
    it('should remove upload item when multiple exist', () => {
      component.uploads = [{}, { file: new File(['content'], 'test.kml') }, {}];
      component.uploadStatuses = { 1: { name: 'test.kml' } };

      component.removeUploadFile(1);

      expect(component.uploads.length).toBe(2);
      expect(component.uploadStatuses[1]).toBeUndefined();
    });

    it('should reset upload item when only one exists', () => {
      component.uploads = [{ file: new File(['content'], 'test.kml') }];
      component.uploadStatuses = { 0: { name: 'test.kml' } };

      component.removeUploadFile(0);

      expect(component.uploads.length).toBe(1);
      expect(component.uploads[0].file).toBeUndefined();
      expect(component.uploadStatuses[0]).toBeUndefined();
    });
  });

  /**
   * These tests VERIFY timer/poll behavior.
   * We rebuild the component with allowRealProcessingCheck=true
   * so it uses the real method (and we clean up timers properly).
   */
  describe('processing timers (real checkLayerProcessingStatus)', () => {
    beforeEach(async () => {
      TestBed.resetTestingModule();
      await createWithRouteParams({ layerId: '1' }, true);
    });

    it('confirmCreateLayer should show creating message and then check status', fakeAsync(() => {
      const snackBarSpy = spyOn((component as any).snackBar, 'open');
      const statusSpy = spyOn<any>(
        component,
        'checkLayerProcessingStatus'
      ).and.callThrough();

      component.confirmCreateLayer();

      expect(snackBarSpy).toHaveBeenCalledWith('Creating layer...', undefined, {
        duration: 2000
      });

      tick(1500);
      expect(statusSpy).toHaveBeenCalled();

      discardPeriodicTasks();
    }));

    it('checkLayerProcessingStatus should reload layer and update url layers', fakeAsync(() => {
      (mockLayersService.getLayerById as jasmine.Spy).and.returnValues(
        of({
          id: 1,
          name: 'Processing',
          type: 'Feature',
          state: 'processing'
        } as any),
        of({
          id: 1,
          name: 'Available',
          type: 'Feature',
          state: 'available'
        } as any)
      );

      const urlSpy = spyOn<any>(component, 'updateUrlLayers').and.callThrough();

      (component as any).checkLayerProcessingStatus();

      tick(0);

      expect(mockLayersService.getLayerById).toHaveBeenCalledWith('1');
      expect(urlSpy).toHaveBeenCalled();

      tick(5000);

      expect(
        (mockLayersService.getLayerById as jasmine.Spy).calls.count()
      ).toBeGreaterThanOrEqual(2);

      discardPeriodicTasks();
    }));

    it('checkLayerProcessingStatus should not schedule another check if layer is available', fakeAsync(() => {
      (mockLayersService.getLayerById as jasmine.Spy).and.returnValue(
        of({
          id: 1,
          name: 'Available',
          type: 'Feature',
          state: 'available'
        } as any)
      );

      (component as any).checkLayerProcessingStatus();
      tick(0);

      expect(component.layer?.state).toBe('available');

      discardPeriodicTasks();
    }));
  });
});
