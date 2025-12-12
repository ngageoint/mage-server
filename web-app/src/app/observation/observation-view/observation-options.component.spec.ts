import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

import { ObservationOptionsComponent } from './observation-options.component';

describe('ObservationOptionsComponent', () => {
  let component: ObservationOptionsComponent;
  let fixture: ComponentFixture<ObservationOptionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MatListModule, MatIconModule],
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
