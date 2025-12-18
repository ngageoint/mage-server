import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormDetailsComponent } from './form-details.component';
import { EventsService } from '../../events.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LocalStorageService, UserService } from '../../../../upgrade/ajs-upgraded-providers';
import { StateService } from '@uirouter/angular';
import { of, throwError } from 'rxjs';
import { Event as MageEvent } from 'src/app/filter/filter.types';

describe('FormDetailsComponent', () => {
  let component: FormDetailsComponent;
  let fixture: ComponentFixture<FormDetailsComponent>;
  let mockEventsService: jasmine.SpyObj<EventsService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockLocalStorageService: any;
  let mockUserService: any;
  let mockStateService: any;

  const mockEvent: MageEvent = {
    id: 1,
    name: 'Test Event',
    description: 'Test event description',
    feedIds: [],
    layers: [],
    style: {} as any,
    teams: [],
    forms: [
      {
        id: 1,
        name: 'Test Form',
        description: 'Test Description',
        color: '#ff0000',
        default: false,
        archived: false,
        fields: [],
        userFields: []
      } as any
    ]
  };

  beforeEach(async () => {
    mockEventsService = jasmine.createSpyObj('EventsService', [
      'getEventById',
      'createForm',
      'updateForm'
    ]);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    mockLocalStorageService = {
      getToken: jasmine.createSpy('getToken').and.returnValue('test-token')
    };
    mockUserService = {
      myself: jasmine.createSpy('myself')
    };
    mockStateService = {
      params: {
        eventId: '1',
        formId: null
      },
      go: jasmine.createSpy('go')
    };

    await TestBed.configureTestingModule({
      declarations: [FormDetailsComponent],
      providers: [
        { provide: EventsService, useValue: mockEventsService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: LocalStorageService, useValue: mockLocalStorageService },
        { provide: UserService, useValue: mockUserService },
        { provide: StateService, useValue: mockStateService }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(FormDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    beforeEach(() => {
      spyOn<any>(component, 'generateSampleObservations');
      spyOn<any>(component, 'fetchFormIcons');
    });

    it('should load event and setup breadcrumbs for new form', () => {
      mockEventsService.getEventById.and.returnValue(of(mockEvent));
      mockStateService.params.formId = null;

      component.ngOnInit();

      expect(mockLocalStorageService.getToken).toHaveBeenCalled();
      expect(component.token).toBe('test-token');
      expect(mockEventsService.getEventById).toHaveBeenCalledWith('1');
      expect(component.event).toEqual(mockEvent);
      expect(component.breadcrumbs.length).toBe(3);
      expect(component.breadcrumbs[2].title).toBe('New Form');
      expect(component.form.archived).toBe(false);
      expect(component.form.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(component.form.fields).toEqual([]);
      expect(component.form.userFields).toEqual([]);
    });

    it('should load event and existing form for edit', () => {
      mockEventsService.getEventById.and.returnValue(of(mockEvent));
      mockStateService.params.formId = '1';

      component.ngOnInit();

      expect(mockEventsService.getEventById).toHaveBeenCalledWith('1');
      expect(component.event).toEqual(mockEvent);
      expect(component.form).toEqual(mockEvent.forms[0]);
      expect(component.breadcrumbs[2].title).toBe('Test Form');
    });

    it('should handle error when loading event', () => {
      const error = { message: 'Error loading event' };
      mockEventsService.getEventById.and.returnValue(throwError(() => error));
      spyOn(console, 'error');

      component.ngOnInit();

      expect(console.error).toHaveBeenCalledWith('Error loading event:', error);
      expect(mockSnackBar.open).toHaveBeenCalledWith('Error loading event', 'Close', { duration: 3000 });
    });

    it('should handle missing formId in event forms', () => {
      const eventWithoutForm = { ...mockEvent, forms: [] };
      mockEventsService.getEventById.and.returnValue(of(eventWithoutForm));
      mockStateService.params.formId = '999';

      component.ngOnInit();

      expect(component.form.id).toBeUndefined();
    });
  });

  describe('validateForm', () => {
    it('should return true when form is valid', () => {
      component.form = { name: 'Test Form', color: '#ff0000' };
      component.generalFormSubmitted = false;

      const result = component.validateForm();

      expect(result).toBe(true);
      expect(component.formValid).toBe(true);
      expect(component.generalFormSubmitted).toBe(true);
    });

    it('should return false when name is missing', () => {
      component.form = { name: '', color: '#ff0000' };

      const result = component.validateForm();

      expect(result).toBe(false);
      expect(component.formValid).toBe(false);
    });

    it('should return false when color is missing', () => {
      component.form = { name: 'Test Form', color: '' };

      const result = component.validateForm();

      expect(result).toBe(false);
      expect(component.formValid).toBe(false);
    });

    it('should return false when both name and color are missing', () => {
      component.form = {};

      const result = component.validateForm();

      expect(result).toBe(false);
      expect(component.formValid).toBe(false);
    });
  });

  describe('saveForm', () => {
    beforeEach(() => {
      component.event = mockEvent;
      component.form = { name: 'Test Form', color: '#ff0000' };
    });

    it('should not save if form is invalid', () => {
      component.form = { name: '', color: '' };

      component.saveForm();

      expect(mockEventsService.createForm).not.toHaveBeenCalled();
      expect(mockEventsService.updateForm).not.toHaveBeenCalled();
    });

    it('should not save if event is not loaded', () => {
      component.event = null;
      component.form = { name: 'Test Form', color: '#ff0000' };

      component.saveForm();

      expect(mockEventsService.createForm).not.toHaveBeenCalled();
      expect(mockEventsService.updateForm).not.toHaveBeenCalled();
    });

    it('should update existing form', () => {
      component.form = { name: 'Test Form', color: '#ff0000', id: 1 };
      const savedForm = { ...component.form };
      mockEventsService.updateForm.and.returnValue(of(savedForm));

      component.saveForm();

      expect(component.saving).toBe(false);
      expect(mockEventsService.updateForm).toHaveBeenCalled();
      const [eventId, formId, payload] = mockEventsService.updateForm.calls.mostRecent().args;
      expect(eventId).toBe('1');
      expect(formId).toBe('1');
      expect(payload).toEqual(jasmine.objectContaining({
        name: 'Test Form',
        color: '#ff0000'
      }));
      expect(payload.fields).toEqual([]);
      expect(payload.userFields).toEqual([]);
      expect(component.form).toEqual(jasmine.objectContaining(savedForm));
      expect(component.form.fields).toEqual([]);
      expect(component.form.userFields).toEqual([]);
      expect(component.formDirty).toBe(false);
      expect(component.generalFormSubmitted).toBe(false);
      expect(mockSnackBar.open).toHaveBeenCalledWith('Form saved successfully', 'Close', { duration: 3000 });
    });

    it('should handle save error with errors object', () => {
      const errorResponse = {
        error: {
          errors: { name: ['Name is required'] }
        }
      };
      mockEventsService.createForm.and.returnValue(throwError(() => errorResponse));
      spyOn(component, 'showError');

      component.saveForm();

      expect(component.saving).toBe(false);
      expect(component.showError).toHaveBeenCalledWith({
        title: 'Error Saving Form',
        message: "If the problem persists please contact your MAGE administrator for help.",
        errors: { name: ['Name is required'] }
      });
    });

    it('should handle save error without errors object', () => {
      const errorResponse = { error: {} };
      mockEventsService.createForm.and.returnValue(throwError(() => errorResponse));
      spyOn(component, 'showError');

      component.saveForm();

      expect(component.saving).toBe(false);
      expect(component.showError).toHaveBeenCalledWith({
        title: 'Error Saving Form',
        message: "Please try again later, if the problem persists please contact your MAGE administrator for help.",
        errors: undefined
      });
    });
  });

  describe('archiveForm', () => {
    beforeEach(() => {
      component.event = mockEvent;
      component.form = { id: 1, name: 'Test Form', archived: false };
    });

    it('should archive form successfully', () => {
      mockEventsService.updateForm.and.returnValue(of(component.form));

      component.archiveForm();

      expect(component.form.archived).toBe(true);
      expect(mockEventsService.updateForm).toHaveBeenCalledWith(
        '1',
        '1',
        jasmine.objectContaining({ archived: true })
      );
      expect(mockSnackBar.open).toHaveBeenCalledWith('Form archived successfully', 'Close', { duration: 3000 });
    });

    it('should not archive if event is not loaded', () => {
      component.event = null;

      component.archiveForm();

      expect(mockEventsService.updateForm).not.toHaveBeenCalled();
    });

    it('should handle archive error', () => {
      const error = { message: 'Error archiving' };
      mockEventsService.updateForm.and.returnValue(throwError(() => error));
      spyOn(console, 'error');

      component.archiveForm();

      expect(console.error).toHaveBeenCalledWith('Error archiving form:', error);
      expect(mockSnackBar.open).toHaveBeenCalledWith('Error archiving form', 'Close', { duration: 3000 });
    });
  });

  describe('restoreForm', () => {
    beforeEach(() => {
      component.event = mockEvent;
      component.form = { id: 1, name: 'Test Form', archived: true };
    });

    it('should restore form successfully', () => {
      mockEventsService.updateForm.and.returnValue(of(component.form));

      component.restoreForm();

      expect(component.form.archived).toBe(false);
      expect(mockEventsService.updateForm).toHaveBeenCalledWith(
        '1',
        '1',
        jasmine.objectContaining({ archived: false })
      );
      expect(mockSnackBar.open).toHaveBeenCalledWith('Form restored successfully', 'Close', { duration: 3000 });
    });

    it('should handle restore error', () => {
      const error = { message: 'Error restoring' };
      mockEventsService.updateForm.and.returnValue(throwError(() => error));
      spyOn(console, 'error');

      component.restoreForm();

      expect(console.error).toHaveBeenCalledWith('Error restoring form:', error);
      expect(mockSnackBar.open).toHaveBeenCalledWith('Error restoring form', 'Close', { duration: 3000 });
    });
  });

  describe('showError', () => {
    it('should display error message in snackbar', () => {
      const error = {
        title: 'Error Title',
        message: 'Error message'
      };

      component.showError(error);

      expect(mockSnackBar.open).toHaveBeenCalledWith('Error Title: Error message', 'Close', { duration: 5000 });
    });
  });

  describe('navigateToFields', () => {
    it('should navigate to form fields edit page', () => {
      component.event = mockEvent;
      component.form = { id: 1 };

      component.navigateToFields();

      expect(mockStateService.go).toHaveBeenCalledWith('admin.formFieldsEdit', { eventId: 1, formId: 1 });
    });
  });

  describe('navigateToMap', () => {
    it('should navigate to form map edit page', () => {
      component.event = mockEvent;
      component.form = { id: 1 };

      component.navigateToMap();

      expect(mockStateService.go).toHaveBeenCalledWith('admin.formMapEdit', { eventId: 1, formId: 1 });
    });
  });

  describe('navigateToFeed', () => {
    it('should navigate to form feed edit page', () => {
      component.event = mockEvent;
      component.form = { id: 1 };

      component.navigateToFeed();

      expect(mockStateService.go).toHaveBeenCalledWith('admin.formFeedEdit', { eventId: 1, formId: 1 });
    });
  });

  describe('exportForm', () => {
    let mockAnchor: any;

    beforeEach(() => {
      component.event = mockEvent;
      component.form = { id: 1, name: 'Test Form' };
      component.token = 'test-token';

      mockAnchor = {
        href: '',
        download: '',
        style: { display: '' },
        click: jasmine.createSpy('click')
      };
      spyOn(document, 'createElement').and.returnValue(mockAnchor);
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');
    });

    it('should trigger download for form export', () => {
      component.exportForm();

      expect(mockSnackBar.open).toHaveBeenCalledWith('Exporting form...', 'Close', { duration: 2000 });
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.href).toContain('/api/events/1/1/form.zip');
      expect(mockAnchor.href).toContain('access_token=test-token');
      expect(mockAnchor.download).toBe('Test Form.zip');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
    });

    it('should not export if token is not available', () => {
      component.token = null;

      component.exportForm();

      expect(document.createElement).not.toHaveBeenCalled();
      expect(mockSnackBar.open).not.toHaveBeenCalled();
    });

    it('should use default filename if form name is not set', () => {
      component.form = { id: 1 };

      component.exportForm();

      expect(mockAnchor.download).toBe('form.zip');
    });
  });
});
