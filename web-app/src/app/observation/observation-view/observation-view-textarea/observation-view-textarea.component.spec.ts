import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ObservationViewTextareaComponent } from './observation-view-textarea.component';

describe('ObservationViewTextareaComponent', () => {
  let component: ObservationViewTextareaComponent;
  let fixture: ComponentFixture<ObservationViewTextareaComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationViewTextareaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationViewTextareaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
