import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationViewComponent } from './observation-view.component';

describe('ObservationViewComponent', () => {
  let component: ObservationViewComponent;
  let fixture: ComponentFixture<ObservationViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
