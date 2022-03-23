import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminEventFormPreviewDialogComponent } from './admin-event-form-preview-dialog.component';

describe('AdminEventFormPreviewDialogComponent', () => {
  let component: AdminEventFormPreviewDialogComponent;
  let fixture: ComponentFixture<AdminEventFormPreviewDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AdminEventFormPreviewDialogComponent ]
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
