import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';

import { AdminEventFormPreviewComponent } from './admin-event-form-preview.component';

describe('AdminEventFormPreviewComponent', () => {
  let component: AdminEventFormPreviewComponent;
  let fixture: ComponentFixture<AdminEventFormPreviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule],
      declarations: [ AdminEventFormPreviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminEventFormPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
