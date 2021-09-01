import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationViewAttachmentComponent } from './observation-view-attachment.component';

describe('ObservationViewAttachmentComponent', () => {
  let component: ObservationViewAttachmentComponent;
  let fixture: ComponentFixture<ObservationViewAttachmentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ObservationViewAttachmentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationViewAttachmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
