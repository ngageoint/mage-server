import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { StateService } from '@uirouter/angular';
import { LayerDetailsComponent } from './layer-details.component';
import { LayersService } from '../layers.service';
import { EventsService } from '../../admin-event/events.service';
import { LocalStorageService, UserService } from '../../../upgrade/ajs-upgraded-providers';
import { of, Observable } from 'rxjs';

describe('LayerDetailsComponent', () => {
  let component: LayerDetailsComponent;
  let fixture: ComponentFixture<LayerDetailsComponent>;

  const mockStateService = {
    params: { layerId: '1' },
    go: jasmine.createSpy('go')
  };

  const mockLocalStorageService = {
    getToken: () => 'test-token'
  };

  const mockUserService = {
    myself: {
      id: '123',
      role: {
        permissions: ['UPDATE_LAYER', 'DELETE_LAYER']
      }
    }
  };

  const mockLayersService = {
    getLayerById: jasmine.createSpy('getLayerById').and.returnValue(of({
      id: 1,
      name: 'Test Layer',
      type: 'Feature',
      state: 'available'
    })),
    deleteLayer: jasmine.createSpy('deleteLayer').and.returnValue(of({})),
    updateLayer: jasmine.createSpy('updateLayer').and.returnValue(of({}))
  };

  const mockEventsService = {
    getEvents: jasmine.createSpy('getEvents').and.returnValue(of({
      items: []
    })),
    addLayerToEvent: jasmine.createSpy('addLayerToEvent').and.returnValue(of({})),
    removeLayerFromEvent: jasmine.createSpy('removeLayerFromEvent').and.returnValue(of({}))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LayerDetailsComponent],
      imports: [
        HttpClientTestingModule,
        MatDialogModule,
        MatSnackBarModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: StateService, useValue: mockStateService },
        { provide: LayersService, useValue: mockLayersService },
        { provide: EventsService, useValue: mockEventsService },
        { provide: LocalStorageService, useValue: mockLocalStorageService },
        { provide: UserService, useValue: mockUserService }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LayerDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
    it('should set file upload URL with access token', () => {
      expect(component.fileUploadUrl).toContain('/api/layers/1/kml');
      expect(component.fileUploadUrl).toContain('access_token=test-token');
    });

    it('should call updateActionButtons', () => {
      spyOn<any>(component, 'updateActionButtons');
      component.ngOnInit();
      expect((component as any).updateActionButtons).toHaveBeenCalled();
    });
  });

  describe('loadLayer', () => {
    it('should update breadcrumbs with layer name', () => {
      expect(component.breadcrumbs.length).toBe(2);
      expect(component.breadcrumbs[1].title).toBe('Test Layer');
    });

    it('should handle layer loading error', () => {
      const errorLayer = jasmine.createSpy('getLayerById').and.returnValue(
        new Observable(observer => observer.error({ message: 'Layer not found' }))
      );
      mockLayersService.getLayerById = errorLayer;
      const snackBarSpy = spyOn(component['snackBar'], 'open');

      (component as any).loadLayer('999');

      expect(component.error).toBe('Layer not found');
      expect(snackBarSpy).toHaveBeenCalledWith('Error loading layer: Layer not found', 'Close', { duration: 5000 });
    });

    it('should check processing status for unavailable layers', (done) => {
      const processingLayer = {
        id: 1,
        name: 'Processing Layer',
        type: 'Feature',
        state: 'processing'
      };
      mockLayersService.getLayerById.and.returnValue(of(processingLayer));
      spyOn<any>(component, 'checkLayerProcessingStatus');

      (component as any).loadLayer('1');

      setTimeout(() => {
        expect((component as any).checkLayerProcessingStatus).toHaveBeenCalled();
        done();
      }, 1100);
    });
  });

  describe('updateUrlLayers', () => {
    it('should create URL mappings for layer tables', () => {
      component.layer = {
        id: 1,
        name: 'Test Layer',
        type: 'Feature',
        tables: [
          { name: 'table1' },
          { name: 'table2' }
        ]
      } as any;

      (component as any).updateUrlLayers();

      expect(component.urlLayers.length).toBe(2);
      expect(component.urlLayers[0].table).toBe('table1');
      expect(component.urlLayers[0].url).toContain('/api/layers/1/table1/{z}/{x}/{y}.png');
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
      component.layer = null;
      mockEventsService.getEvents.calls.reset();
      component.getEventsPage();

      expect(mockEventsService.getEvents).not.toHaveBeenCalled();
      expect(component.loadingEvents).toBe(false);
    });

    it('should handle error loading events', () => {
      const errorSpy = jasmine.createSpy('getEvents').and.returnValue(
        new Observable(observer => observer.error({ message: 'Failed to load' }))
      );
      mockEventsService.getEvents = errorSpy;
      const snackBarSpy = spyOn(component['snackBar'], 'open');
      component.layer = { id: 1, name: 'Test', type: 'Feature' } as any;

      component.getEventsPage();

      expect(snackBarSpy).toHaveBeenCalledWith('Error loading events', 'Close', { duration: 5000 });
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

  describe('gotoEvent', () => {
    it('should navigate to event details', () => {
      const testEvent = { id: 123, name: 'Test Event' } as any;

      component.gotoEvent(testEvent);

      expect(mockStateService.go).toHaveBeenCalledWith('admin.event', { eventId: 123 });
    });
  });

  describe('addEventToLayer', () => {
    it('should add layer to selected event', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      const selectedEvent = { id: 456, name: 'Selected Event' };
      const snackBarSpy = spyOn(component['snackBar'], 'open');
      spyOn(component, 'getEventsPage');

      spyOn(component['dialog'], 'open').and.returnValue({
        afterClosed: () => of({ selectedItem: selectedEvent })
      } as any);

      component.addEventToLayer();

      expect(mockEventsService.addLayerToEvent).toHaveBeenCalledWith('456', { id: 1 });
      expect(component.getEventsPage).toHaveBeenCalled();
      expect(snackBarSpy).toHaveBeenCalledWith('Layer added to event: Selected Event', null, { duration: 2000 });
    });

    it('should handle error adding layer to event', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      const selectedEvent = { id: 456, name: 'Selected Event' };
      const errorSpy = jasmine.createSpy('addLayerToEvent').and.returnValue(
        new Observable(observer => observer.error({ message: 'Failed to add' }))
      );
      mockEventsService.addLayerToEvent = errorSpy;
      const snackBarSpy = spyOn(component['snackBar'], 'open');

      spyOn(component['dialog'], 'open').and.returnValue({
        afterClosed: () => of({ selectedItem: selectedEvent })
      } as any);

      component.addEventToLayer();

      expect(snackBarSpy).toHaveBeenCalledWith('Error adding layer to event', 'Close', { duration: 5000 });
    });

    it('should not proceed if layer is null', () => {
      component.layer = null;
      const dialogSpy = spyOn(component['dialog'], 'open');

      component.addEventToLayer();

      expect(dialogSpy).not.toHaveBeenCalled();
    });
  });

  describe('removeEventFromLayer', () => {
    it('should remove layer from event', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      const testEvent = { id: 789, name: 'Test Event' } as any;
      const snackBarSpy = spyOn(component['snackBar'], 'open');
      spyOn(component, 'getEventsPage');

      component.removeEventFromLayer(testEvent);

      expect(mockEventsService.removeLayerFromEvent).toHaveBeenCalledWith('789', 1);
      expect(component.getEventsPage).toHaveBeenCalled();
      expect(snackBarSpy).toHaveBeenCalledWith('Layer removed from event', null, { duration: 2000 });
    });

    it('should stop event propagation when mouse event provided', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      const testEvent = { id: 789, name: 'Test Event' } as any;
      const mouseEvent = jasmine.createSpyObj('MouseEvent', ['stopPropagation']);

      component.removeEventFromLayer(testEvent, mouseEvent);

      expect(mouseEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should handle error removing layer from event', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      const testEvent = { id: 789, name: 'Test Event' } as any;
      const errorSpy = jasmine.createSpy('removeLayerFromEvent').and.returnValue(
        new Observable(observer => observer.error({ message: 'Failed to remove' }))
      );
      mockEventsService.removeLayerFromEvent = errorSpy;
      const snackBarSpy = spyOn(component['snackBar'], 'open');

      component.removeEventFromLayer(testEvent);

      expect(snackBarSpy).toHaveBeenCalledWith('Error removing layer from event', 'Close', { duration: 5000 });
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
      mockLayersService.updateLayer = jasmine.createSpy('updateLayer').and.returnValue(of({
        name: 'Updated Layer',
        description: 'Updated Description'
      }));
    });

    it('should update layer details', () => {
      component.layer = { id: 1, name: 'Old Name', type: 'Feature' } as any;
      component.layerEditForm = { name: 'New Name', description: 'New Description', format: '', base: false };
      const snackBarSpy = spyOn(component['snackBar'], 'open');

      component.saveLayerDetails();

      expect(mockLayersService.updateLayer).toHaveBeenCalledWith('1', {
        name: 'New Name',
        description: 'New Description',
        type: 'Feature'
      });
      expect(component.editingDetails).toBe(false);
      expect(snackBarSpy).toHaveBeenCalledWith('Layer updated successfully', null, { duration: 2000 });
    });

    it('should handle update error', () => {
      component.layer = { id: 1, name: 'Old Name', type: 'Feature' } as any;
      const errorSpy = jasmine.createSpy('updateLayer').and.returnValue(
        new Observable(observer => observer.error({
          error: { message: 'Update failed' }
        }))
      );
      mockLayersService.updateLayer = errorSpy;
      const snackBarSpy = spyOn(component['snackBar'], 'open');

      component.saveLayerDetails();

      expect(snackBarSpy).toHaveBeenCalledWith('Error updating layer: Update failed', 'Close', { duration: 5000 });
    });

    it('should not proceed if layer is null', () => {
      component.layer = null;
      mockLayersService.updateLayer = jasmine.createSpy('updateLayer');

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
      component.layerEditForm = { name: 'Changed', description: 'Changed', format: '', base: false };

      component.cancelEditDetails();

      expect(component.editingDetails).toBe(false);
      expect(component.layerEditForm.name).toBe('Original Name');
      expect(component.layerEditForm.description).toBe('Original Description');
    });
  });

  describe('deleteLayer', () => {
    it('should open delete confirmation dialog', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      const dialogSpy = spyOn(component['dialog'], 'open').and.returnValue({
        afterClosed: () => of(false)
      } as any);

      component.deleteLayer();

      expect(dialogSpy).toHaveBeenCalled();
    });

    it('should navigate to layers list when delete confirmed', () => {
      component.layer = { id: 1, name: 'Test Layer', type: 'Feature' } as any;
      const snackBarSpy = spyOn(component['snackBar'], 'open');

      spyOn(component['dialog'], 'open').and.returnValue({
        afterClosed: () => of(true)
      } as any);

      component.deleteLayer();

      expect(snackBarSpy).toHaveBeenCalledWith('Layer deleted successfully', 'Close', { duration: 3000 });
      expect(mockStateService.go).toHaveBeenCalledWith('admin.layers');
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

    it('should return false when layer is null', () => {
      component.layer = null;

      expect(component.isLayerFileBased()).toBeFalsy();
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

      const createElementSpy = spyOn(document, 'createElement').and.callThrough();
      const appendChildSpy = spyOn(document.body, 'appendChild').and.stub();
      const removeChildSpy = spyOn(document.body, 'removeChild').and.stub();

      component.downloadLayer();

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
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
      const file = new File(['content'], 'test.kml', { type: 'application/vnd.google-earth.kml+xml' });
      const event = {
        target: {
          files: [file]
        }
      };

      component.onFileSelected(event, 0);

      expect(component.uploads[0].file).toBe(file);
      expect(component.uploads[0].error).toBeUndefined();
    });

    it('should accept valid KMZ file', () => {
      const file = new File(['content'], 'test.kmz', { type: 'application/vnd.google-earth.kmz' });
      const event = {
        target: {
          files: [file]
        }
      };

      component.onFileSelected(event, 0);

      expect(component.uploads[0].file).toBe(file);
      expect(component.uploads[0].error).toBeUndefined();
    });

    it('should reject invalid file type', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const event = {
        target: {
          files: [file]
        }
      };
      const snackBarSpy = spyOn(component['snackBar'], 'open');

      component.onFileSelected(event, 0);

      expect(component.uploads[0].error).toContain('Invalid file type');
      expect(snackBarSpy).toHaveBeenCalled();
    });

    it('should reject files larger than 50MB', () => {
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.kml', { type: 'application/vnd.google-earth.kml+xml' });
      const event = {
        target: {
          files: [largeFile]
        }
      };
      const snackBarSpy = spyOn(component['snackBar'], 'open');

      component.onFileSelected(event, 0);

      expect(component.uploads[0].error).toContain('exceeds 50MB limit');
      expect(snackBarSpy).toHaveBeenCalled();
    });
  });

  describe('confirmUpload', () => {
    it('should show error when no files selected', () => {
      component.uploads = [{}];
      const snackBarSpy = spyOn(component['snackBar'], 'open');

      component.confirmUpload();

      expect(snackBarSpy).toHaveBeenCalledWith('Please select at least one file to upload', 'Close', { duration: 3000 });
    });

    it('should reject upload for non-Feature layers', () => {
      component.layer = { id: 1, name: 'Test', type: 'GeoPackage' } as any;
      component.uploads = [{ file: new File(['content'], 'test.kml') }];
      const snackBarSpy = spyOn(component['snackBar'], 'open');

      component.confirmUpload();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('Cannot upload to layer of type "GeoPackage"'),
        'Close',
        { duration: 5000 }
      );
    });

    it('should upload selected files', () => {
      component.layer = { id: 1, name: 'Test', type: 'Feature' } as any;
      const file = new File(['content'], 'test.kml');
      component.uploads = [{ file }];
      const snackBarSpy = spyOn(component['snackBar'], 'open');

      const uploadFileSpy = spyOn<any>(component, 'uploadFile').and.returnValue(of({
        files: [{ name: 'test.kml', features: 10 }]
      }));

      component.confirmUpload();

      expect(uploadFileSpy).toHaveBeenCalledWith(file, 0);
      expect(snackBarSpy).toHaveBeenCalledWith('Successfully uploaded 1 file(s)', 'Close', { duration: 3000 });
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

  describe('confirmCreateLayer', () => {
    it('should show creating message and check status', (done) => {
      const snackBarSpy = spyOn(component['snackBar'], 'open');
      spyOn<any>(component, 'checkLayerProcessingStatus');

      component.confirmCreateLayer();

      expect(snackBarSpy).toHaveBeenCalledWith('Creating layer...', null, { duration: 2000 });

      setTimeout(() => {
        expect((component as any).checkLayerProcessingStatus).toHaveBeenCalled();
        done();
      }, 1600);
    });
  });

  describe('checkLayerProcessingStatus', () => {
    it('should reload layer and check again if not available', (done) => {
      const processingLayer = {
        id: 1,
        name: 'Processing',
        type: 'Feature',
        state: 'processing'
      };
      mockLayersService.getLayerById.and.returnValue(of(processingLayer));
      mockStateService.params.layerId = '1';
      spyOn<any>(component, 'updateUrlLayers');

      (component as any).checkLayerProcessingStatus();

      setTimeout(() => {
        expect((component as any).updateUrlLayers).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should not check again if layer is available', () => {
      const availableLayer = {
        id: 1,
        name: 'Available',
        type: 'Feature',
        state: 'available'
      };
      mockLayersService.getLayerById.and.returnValue(of(availableLayer));
      mockStateService.params.layerId = '1';

      (component as any).checkLayerProcessingStatus();

      expect(component.layer.state).toBe('available');
    });
  });
});
