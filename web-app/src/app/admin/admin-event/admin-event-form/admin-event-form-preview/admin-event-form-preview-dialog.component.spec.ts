import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { AdminEventFormPreviewDialogComponent } from './admin-event-form-preview-dialog.component';

describe('AdminEventFormPreviewDialogComponent', () => {
  let component: AdminEventFormPreviewDialogComponent;
  let fixture: ComponentFixture<AdminEventFormPreviewDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AdminEventFormPreviewDialogComponent ],
      imports: [MatDialogModule],
      providers: [{
        provide: MatDialogRef, useValue: {}
      }, {
        provide: MAT_DIALOG_DATA, useValue: {
          fields: []
        }
      }]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminEventFormPreviewDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
