import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationPopupComponent } from './observation-popup.component';

describe('ObservationPopupComponent', () => {
  let component: ObservationPopupComponent;
  let fixture: ComponentFixture<ObservationPopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ObservationPopupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });
});
