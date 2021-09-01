import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationEditAttachmentComponent } from './observation-edit-attachment.component';

describe('ObservationEditAttachmentComponent', () => {
  let component: ObservationEditAttachmentComponent;
  let fixture: ComponentFixture<ObservationEditAttachmentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationEditAttachmentComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationEditAttachmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});