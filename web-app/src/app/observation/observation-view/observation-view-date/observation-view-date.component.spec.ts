import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MomentPipe } from 'src/app/moment/moment.pipe';

import { ObservationViewDateComponent } from './observation-view-date.component';

describe('ObservationViewDateComponent', () => {
  let component: ObservationViewDateComponent;
  let fixture: ComponentFixture<ObservationViewDateComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationViewDateComponent, MomentPipe]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationViewDateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });
});
