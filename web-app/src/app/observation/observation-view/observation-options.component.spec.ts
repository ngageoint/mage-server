import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

import { ObservationOptionsComponent } from './observation-options.component';

describe('ObservationOptionsComponent', () => {
  let component: ObservationOptionsComponent;
  let fixture: ComponentFixture<ObservationOptionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ObservationOptionsComponent ],
      providers: [{
        provide: MatBottomSheetRef,
        useValue: {}
      }]
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
