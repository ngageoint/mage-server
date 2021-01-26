import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationOptionsComponent } from './observation-options.component';

describe('ObservationOptionsComponent', () => {
  let component: ObservationOptionsComponent;
  let fixture: ComponentFixture<ObservationOptionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ObservationOptionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
