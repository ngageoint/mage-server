import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationEditDateComponent } from './observation-edit-date.component';

describe('ObservationEditDateComponent', () => {
  let component: ObservationEditDateComponent;
  let fixture: ComponentFixture<ObservationEditDateComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationEditDateComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationEditDateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });
});
