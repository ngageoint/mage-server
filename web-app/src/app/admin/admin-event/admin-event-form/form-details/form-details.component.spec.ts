import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { FormDetailsComponent } from './form-details.component';
import { AdminEventsService } from '../../../services/admin-events.service';
import { SessionService } from 'mage-web-app/http/session.service';

import { MageEvent } from 'mage-web-app/entities/event/entities.event';

describe('FormDetailsComponent', () => {
  let component: FormDetailsComponent;
  let fixture: ComponentFixture<FormDetailsComponent>;

  let mockEventsService: jasmine.SpyObj<AdminEventsService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockSessionService: { getToken: jasmine.Spy; user$: any };
  let mockRoute: any;

  const mockEvent: MageEvent = {
    id: 1,
    name: 'Test Event',
    description: 'Test event description',
    feedIds: [],
    layers: [],
    style: {} as any,
    teams: [],
    acl: {},
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
    mockEventsService = jasmine.createSpyObj('AdminEventsService', [
      'getEventById',
      'createForm',
      'updateForm'
    ]);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    mockSessionService = {
      getToken: jasmine.createSpy('getToken').and.returnValue('test-token'),
      user$: of({ id: 'u1', displayName: 'Ranma Saotome' } as any)
    };

    mockRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.callFake((key: string) => {
            if (key === 'eventId') return '1';
            if (key === 'formId') return null;
            return null;
          })
        }
      }
    };

    await TestBed.configureTestingModule({
      declarations: [FormDetailsComponent],
      providers: [
        { provide: AdminEventsService, useValue: mockEventsService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: SessionService, useValue: mockSessionService },
        { provide: ActivatedRoute, useValue: mockRoute }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

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

    it('returns early when eventId is missing', () => {
      mockRoute.snapshot.paramMap.get.and.callFake((key: string) => {
        if (key === 'eventId') return null;
        if (key === 'formId') return null;
        return null;
      });

      component.ngOnInit();

      expect(mockEventsService.getEventById).not.toHaveBeenCalled();
      expect(component.event).toBeNull();
    });

    it('loads event and sets up breadcrumbs for new form', () => {
      mockEventsService.getEventById.and.returnValue(of(mockEvent));
      mockRoute.snapshot.paramMap.get.and.callFake((key: string) => {
        if (key === 'eventId') return '1';
        if (key === 'formId') return null;
        return null;
      });

      component.ngOnInit();

      expect(mockSessionService.getToken).toHaveBeenCalled();
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

    it('loads event and existing form for edit and sets routes', () => {
      mockEventsService.getEventById.and.returnValue(of(mockEvent));
      mockRoute.snapshot.paramMap.get.and.callFake((key: string) => {
        if (key === 'eventId') return '1';
        if (key === 'formId') return '1';
        return null;
      });

      component.ngOnInit();

      expect(component.event).toEqual(mockEvent);
      expect(component.form).toEqual(
        jasmine.objectContaining(mockEvent.forms[0] as any)
      );
      expect(component.breadcrumbs[2].title).toBe('Test Form');

      expect((component as any).generateSampleObservations).toHaveBeenCalled();
      expect((component as any).fetchFormIcons).toHaveBeenCalled();
    });

    it('handles error when loading event', () => {
      const error = { message: 'Error loading event' };
      mockEventsService.getEventById.and.returnValue(throwError(() => error));
      spyOn(console, 'error');

      component.ngOnInit();

      expect(console.error).toHaveBeenCalledWith('Error loading event:', error);
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Error loading event',
        'Close',
        { duration: 3000 }
      );
    });

    it('handles missing formId in event forms', () => {
      const eventWithoutForm = { ...mockEvent, forms: [] };
      mockEventsService.getEventById.and.returnValue(of(eventWithoutForm));
      mockRoute.snapshot.paramMap.get.and.callFake((key: string) => {
        if (key === 'eventId') return '1';
        if (key === 'formId') return '999';
        return null;
      });

      component.ngOnInit();

      expect(component.form.id).toBeUndefined();
    });
  });

  describe('validateForm', () => {
    it('returns true when form is valid', () => {
      component.form = { name: 'Test Form', color: '#ff0000' };
      component.generalFormSubmitted = false;

      const result = component.validateForm();

      expect(result).toBe(true);
      expect(component.generalFormSubmitted).toBe(true);
    });

    it('returns false when name is missing', () => {
      component.form = { name: '', color: '#ff0000' };

      const result = component.validateForm();

      expect(result).toBe(false);
    });

    it('returns false when color is missing', () => {
      component.form = { name: 'Test Form', color: '' };

      const result = component.validateForm();

      expect(result).toBe(false);
    });

    it('returns false when both name and color are missing', () => {
      component.form = {};

      const result = component.validateForm();

      expect(result).toBe(false);
    });
  });

  describe('saveForm', () => {
    beforeEach(() => {
      component.event = mockEvent;
      component.form = {
        name: 'Test Form',
        color: '#ff0000',
        fields: [],
        userFields: []
      };
    });

    it('does not save if form is invalid', () => {
      component.form = { name: '', color: '' };

      component.saveForm();

      expect(mockEventsService.createForm).not.toHaveBeenCalled();
      expect(mockEventsService.updateForm).not.toHaveBeenCalled();
    });

    it('does not save if event is not loaded', () => {
      component.event = null;

      component.saveForm();

      expect(mockEventsService.createForm).not.toHaveBeenCalled();
      expect(mockEventsService.updateForm).not.toHaveBeenCalled();
    });

    it('updates existing form', () => {
      component.form = {
        name: 'Test Form',
        color: '#ff0000',
        id: 1,
        fields: [],
        userFields: []
      };
      const savedForm = { ...component.form };
      mockEventsService.updateForm.and.returnValue(of(savedForm as any));

      component.saveForm();

      expect(mockEventsService.updateForm).toHaveBeenCalled();
      const [eventId, formId, payload] =
        mockEventsService.updateForm.calls.mostRecent().args;

      expect(eventId).toBe('1');
      expect(formId).toBe('1');
      expect(payload).toEqual(
        jasmine.objectContaining({ name: 'Test Form', color: '#ff0000' })
      );
      expect(component.generalFormSubmitted).toBe(false);
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Form saved successfully',
        'Close',
        { duration: 3000 }
      );
    });

    it('handles save error with errors object', () => {
      const errorResponse = {
        error: { errors: { name: ['Name is required'] } }
      };
      mockEventsService.createForm.and.returnValue(
        throwError(() => errorResponse)
      );
      spyOn(component, 'showError');

      component.form = {
        name: 'Test Form',
        color: '#ff0000',
        fields: [],
        userFields: []
      };
      component.event = mockEvent;
      component.form.id = undefined;

      component.saveForm();

      expect(component.showError).toHaveBeenCalledWith({
        title: 'Error Saving Form',
        message:
          'If the problem persists please contact your MAGE administrator for help.',
        errors: { name: ['Name is required'] }
      });
    });

    it('handles save error without errors object', () => {
      const errorResponse = { error: {} };
      mockEventsService.createForm.and.returnValue(
        throwError(() => errorResponse)
      );
      spyOn(component, 'showError');

      component.form = {
        name: 'Test Form',
        color: '#ff0000',
        fields: [],
        userFields: []
      };
      component.event = mockEvent;
      component.form.id = undefined;

      component.saveForm();

      expect(component.showError).toHaveBeenCalledWith({
        title: 'Error Saving Form',
        message:
          'Please try again later, if the problem persists please contact your MAGE administrator for help.',
        errors: undefined
      });
    });
  });

  describe('archiveForm', () => {
    beforeEach(() => {
      component.event = mockEvent;
      component.form = {
        id: 1,
        name: 'Test Form',
        archived: false,
        fields: [],
        userFields: []
      };
    });

    it('archives form successfully', () => {
      mockEventsService.updateForm.and.returnValue(of(component.form as any));

      component.archiveForm();

      expect(component.form.archived).toBe(true);
      expect(mockEventsService.updateForm).toHaveBeenCalledWith(
        '1',
        '1',
        jasmine.objectContaining({ archived: true })
      );
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Form archived successfully',
        'Close',
        { duration: 3000 }
      );
    });

    it('does not archive if event is not loaded', () => {
      component.event = null;

      component.archiveForm();

      expect(mockEventsService.updateForm).not.toHaveBeenCalled();
    });

    it('handles archive error', () => {
      const error = { message: 'Error archiving' };
      mockEventsService.updateForm.and.returnValue(throwError(() => error));
      spyOn(console, 'error');

      component.archiveForm();

      expect(console.error).toHaveBeenCalledWith(
        'Error archiving form:',
        error
      );
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Error archiving form',
        'Close',
        { duration: 3000 }
      );
    });
  });

  describe('restoreForm', () => {
    beforeEach(() => {
      component.event = mockEvent;
      component.form = {
        id: 1,
        name: 'Test Form',
        archived: true,
        fields: [],
        userFields: []
      };
    });

    it('restores form successfully', () => {
      mockEventsService.updateForm.and.returnValue(of(component.form as any));

      component.restoreForm();

      expect(component.form.archived).toBe(false);
      expect(mockEventsService.updateForm).toHaveBeenCalledWith(
        '1',
        '1',
        jasmine.objectContaining({ archived: false })
      );
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Form restored successfully',
        'Close',
        { duration: 3000 }
      );
    });

    it('handles restore error', () => {
      const error = { message: 'Error restoring' };
      mockEventsService.updateForm.and.returnValue(throwError(() => error));
      spyOn(console, 'error');

      component.restoreForm();

      expect(console.error).toHaveBeenCalledWith(
        'Error restoring form:',
        error
      );
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Error restoring form',
        'Close',
        { duration: 3000 }
      );
    });
  });

  describe('showError', () => {
    it('displays error message in snackbar', () => {
      component.showError({
        title: 'Error Title',
        message: 'Error message'
      } as any);

      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Error Title: Error message',
        'Close',
        { duration: 5000 }
      );
    });
  });

  describe('getDropdownFields', () => {
    it('returns empty array when form has no fields', () => {
      component.form = { name: 'Test Form', color: '#ff0000', fields: [] };

      expect(component.getDropdownFields()).toEqual([]);
    });

    it('excludes non-dropdown fields', () => {
      component.form = {
        name: 'Test Form',
        color: '#ff0000',
        fields: [
          { name: 'notes', type: 'textfield' } as any,
          { name: 'count', type: 'numberfield' } as any
        ]
      };

      expect(component.getDropdownFields()).toEqual([]);
    });

    it('includes dropdown and userDropdown fields, excluding multiselect and archived', () => {
      const dropdown = { name: 'status', type: 'dropdown' } as any;
      const userDropdown = { name: 'assignee', type: 'userDropdown' } as any;
      const multiselect = {
        name: 'tags',
        type: 'dropdown',
        multiselect: true
      } as any;
      const archived = {
        name: 'old',
        type: 'dropdown',
        archived: true
      } as any;

      component.form = {
        name: 'Test Form',
        color: '#ff0000',
        fields: [dropdown, userDropdown, multiselect, archived]
      };

      expect(component.getDropdownFields()).toEqual([dropdown, userDropdown]);
    });

    it('excludes the field named by excludeField', () => {
      const primary = { name: 'status', type: 'dropdown' } as any;
      const secondary = { name: 'severity', type: 'dropdown' } as any;

      component.form = {
        name: 'Test Form',
        color: '#ff0000',
        fields: [primary, secondary]
      };

      expect(component.getDropdownFields('status')).toEqual([secondary]);
    });
  });

  describe('getIconUrl', () => {
    it('returns null when no icons have been cached', () => {
      expect(component.getIconUrl('')).toBeNull();
    });

    it('returns the form-wide default icon for an empty primary', () => {
      (component as any).iconCache = { icon: 'default-icon-url' };

      expect(component.getIconUrl('')).toBe('default-icon-url');
    });

    it('returns the icon for a primary choice', () => {
      (component as any).iconCache = {
        Active: { icon: 'active-icon-url' },
        icon: 'default-icon-url'
      };

      expect(component.getIconUrl('Active')).toBe('active-icon-url');
    });

    it('returns the icon for a primary/variant combination', () => {
      (component as any).iconCache = {
        Active: { High: 'active-high-icon-url', icon: 'active-icon-url' }
      };

      expect(component.getIconUrl('Active', 'High')).toBe(
        'active-high-icon-url'
      );
    });

    it('falls back to the primary icon when the variant has no icon', () => {
      (component as any).iconCache = {
        Active: { icon: 'active-icon-url' }
      };

      expect(component.getIconUrl('Active', 'High')).toBe(
        'active-icon-url'
      );
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

    it('triggers download for form export', () => {
      component.exportForm();

      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Exporting form...',
        'Close',
        { duration: 2000 }
      );
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.href).toContain('/api/events/1/1/form.zip');
      expect(mockAnchor.href).toContain('access_token=test-token');
      expect(mockAnchor.download).toBe('Test Form.zip');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
    });

    it('does not export if token is not available', () => {
      component.token = null;

      component.exportForm();

      expect(document.createElement).not.toHaveBeenCalled();
      expect(mockSnackBar.open).not.toHaveBeenCalled();
    });

    it('uses default filename if form name is not set', () => {
      component.form = { id: 1 };

      component.exportForm();

      expect(mockAnchor.download).toBe('form.zip');
    });
  });
});
