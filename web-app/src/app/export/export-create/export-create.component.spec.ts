import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ExportCreateComponent } from './export-create.component';
import { ExportService } from '../export.service';
import { EventService } from 'src/app/event/event.service';
import { FilterService } from 'src/app/filter/filter.service';
import { ExportFormat, FormProjection } from '../entities.export';

describe('ExportCreateComponent', () => {
  let component: ExportCreateComponent;
  let fixture: ComponentFixture<ExportCreateComponent>;

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

  const exportService = jasmine.createSpyObj('ExportService', ['export']);
  const eventService = jasmine.createSpyObj('EventService', ['query']);
  const filterService = jasmine.createSpyObj('FilterService', ['getEvent']);

  beforeEach(waitForAsync(() => {
    exportService.export.and.returnValue(of({}));
    eventService.query.and.returnValue(of([event]));
    filterService.getEvent.and.returnValue(event);

    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, MatChipsModule, MatSelectModule],
      declarations: [ExportCreateComponent],
      providers: [
        { provide: ExportService, useValue: exportService },
        { provide: EventService, useValue: eventService },
        { provide: FilterService, useValue: filterService },
        provideNoopAnimations()
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should build form projections from the selected event', () => {
    expect(component.formProjections.length).toEqual(1);
    expect(component.formProjections[0].fieldProjections.length).toEqual(2);
  });

  it('should omit projection when all fields selected', () => {
    component.eventControl.setValue(event);
    component.exportFormat = ExportFormat.CSV;
    component.exportData();
    const request = exportService.export.calls.mostRecent().args[1];
    expect(request.projection).toBeUndefined();
  });

  it('should include projection when a subset is selected', () => {
    const formProjection: FormProjection = component.formProjections[0];
    formProjection.fieldProjections[1].selected = false;
    component.eventControl.setValue(event);
    component.exportData();
    const request = exportService.export.calls.mostRecent().args[1];
    expect(request.projection).toEqual([{ formId: 10, fields: ['field1'] }]);
  });
});
