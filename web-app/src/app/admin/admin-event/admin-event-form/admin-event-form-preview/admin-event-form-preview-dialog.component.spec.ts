import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AdminEventFormPreviewDialogComponent } from './admin-event-form-preview-dialog.component';

import { AdminEventFormPreviewComponent } from './admin-event-form-preview.component';

describe('AdminEventFormPreviewComponent', () => {
  let component: AdminEventFormPreviewDialogComponent
  let fixture: ComponentFixture<AdminEventFormPreviewDialogComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, MatDialogModule],
      declarations: [AdminEventFormPreviewComponent],
      providers: [{
        provide: MAT_DIALOG_DATA,
        useValue: {
          name: 'Mock Form',
          fields: [{
            id: 1,
            archived: true,
            name: 'field1',
            title: 'Field 1',
            type: 'textfield'
          },{
            id: 3,
            archived: false,
            name: 'field3',
            title: 'Field 3',
            type: 'textfield'
          },{
            id: 2,
            archived: false,
            name: 'field2',
            title: 'Field 2',
            type: 'textfield'
          }]
        }
      }]
    })
      .compileComponents()
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminEventFormPreviewDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have id', () => {
    const id = component.formGroup.get('id')
    expect(id).toBeDefined()
    expect(id.value).toEqual(0)
  });

  it('should have formId', () => {
    const formId = component.formGroup.get('formId')
    expect(formId).toBeDefined()
    expect(formId.value).toEqual(0)
  });

  it('should filter archived fields', () => {
    const nonArchivedFieldNames = component.formDefinition.fields.filter(field => {
      return !field.archived
    }).map(field => field.name)

    const controlPaths = Object.keys(component.formGroup.controls).filter(path => {
      return path !== 'id' && path !== 'formId'
    })

    controlPaths.forEach(path => {
      expect(nonArchivedFieldNames).toContain(path)
    })
  });

  it('should sort fields', () => {
    const controlPaths = Object.keys(component.formGroup.controls)
    expect(controlPaths).toEqual(['id', 'formId', 'field2', 'field3'])
  });
});
