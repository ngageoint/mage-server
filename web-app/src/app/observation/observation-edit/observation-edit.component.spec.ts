import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationEditComponent } from './observation-edit.component';

describe('ObservationEditComponent', () => {
  let component: ObservationEditComponent;
  let fixture: ComponentFixture<ObservationEditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationEditComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
