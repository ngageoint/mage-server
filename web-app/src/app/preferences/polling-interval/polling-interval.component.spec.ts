import { TestBed, waitForAsync } from '@angular/core/testing';
import { PollingIntervalComponent } from './polling-interval.component';

describe('PollingIntervalComponent', () => {
  let component: PollingIntervalComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PollingIntervalComponent]
    })
      .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
