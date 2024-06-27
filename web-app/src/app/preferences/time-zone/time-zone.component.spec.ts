import { TestBed, waitForAsync } from '@angular/core/testing';
import { TimeZoneComponent } from './time-zone.component';

describe('TimeZoneComponent', () => {
  let component: TimeZoneComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [TimeZoneComponent]
    })
      .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
