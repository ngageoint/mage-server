import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ExportViewComponent } from './export-view.component';
import { ExportService } from '../export.service';
import { EventService } from 'src/app/event/event.service';
import { SidebarService } from 'src/app/sidebar/sidebar.service';
import { SessionService } from '../../http/session.service';
import { Export, ExportStatus } from '../entities.export';
import { MomentModule } from '../../moment/moment.module';

describe('ExportViewComponent', () => {
  let component: ExportViewComponent;
  let fixture: ComponentFixture<ExportViewComponent>;

  const event = {
    id: 1,
    name: 'Test Event',
    forms: [{
      id: 10,
      name: 'Form One',
      archived: false,
      fields: [
        { id: 1, name: 'field1', title: 'Field 1', type: 'text', archived: false },
        { id: 2, name: 'field2', title: 'Field 2', type: 'text', archived: false }
      ]
    }]
  };

  const item: Export = {
    id: '1',
    physicalPath: '/tmp/test.kml',
    exportType: 'kml',
    url: '/api/exports/mine/1',
    status: ExportStatus.Completed,
    options: {
      event: event as any,
      projection: [{ formId: 10, fields: ['field1'] }]
    }
  } as Export;

  const exportService = { exports$: of([]), deleteExport: () => of(null) } as any;
  const eventService = jasmine.createSpyObj('EventService', ['getEventById']);
  const sidebarService = jasmine.createSpyObj('SidebarService', ['viewExport']);
  const sessionService = jasmine.createSpyObj('SessionService', ['getToken']);
  const dialog = jasmine.createSpyObj('MatDialog', ['open']);

  beforeEach(waitForAsync(() => {
    eventService.getEventById.and.returnValue(event);
    sessionService.getToken.and.returnValue('token');

    TestBed.configureTestingModule({
      imports: [MomentModule],
      declarations: [ExportViewComponent],
      providers: [
        { provide: ExportService, useValue: exportService },
        { provide: EventService, useValue: eventService },
        { provide: SidebarService, useValue: sidebarService },
        { provide: SessionService, useValue: sessionService },
        { provide: MatDialog, useValue: dialog },
        provideNoopAnimations()
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportViewComponent);
    component = fixture.componentInstance;
    component.item = item;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should reconstruct field projections reflecting the saved selection', () => {
    expect(component.formProjections.length).toEqual(1);
    const fields = component.formProjections[0].fieldProjections;
    expect(fields.find(f => f.field.name === 'field1').selected).toBeTrue();
    expect(fields.find(f => f.field.name === 'field2').selected).toBeFalse();
  });

  it('should emit close', () => {
    spyOn(component.close, 'emit');
    component.onClose();
    expect(component.close.emit).toHaveBeenCalled();
  });
});
