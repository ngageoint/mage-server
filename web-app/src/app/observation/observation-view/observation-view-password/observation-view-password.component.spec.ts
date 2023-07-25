import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationViewPasswordComponent } from './observation-view-password.component';
import { PasswordPipe } from './password.pipe';

describe('ObservationViewPasswordComponent', () => {
  let component: ObservationViewPasswordComponent;
  let fixture: ComponentFixture<ObservationViewPasswordComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ObservationViewPasswordComponent, PasswordPipe ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationViewPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
