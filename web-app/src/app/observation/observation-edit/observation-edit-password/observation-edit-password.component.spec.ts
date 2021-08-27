import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationEditPasswordComponent } from './observation-edit-password.component';

describe('ObservationEditPasswordComponent', () => {
  let component: ObservationEditPasswordComponent;
  let fixture: ComponentFixture<ObservationEditPasswordComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ObservationEditPasswordComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationEditPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
