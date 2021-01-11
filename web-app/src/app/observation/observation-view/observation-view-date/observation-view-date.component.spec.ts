import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationViewDateComponent } from './observation-view-date.component';

describe('ObservationViewDateComponent', () => {
  let component: ObservationViewDateComponent;
  let fixture: ComponentFixture<ObservationViewDateComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationViewDateComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationViewDateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
