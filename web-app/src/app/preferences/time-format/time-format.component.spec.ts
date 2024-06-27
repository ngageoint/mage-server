import { TestBed, waitForAsync } from '@angular/core/testing';
import { TimeFormatComponent } from './time-format.component';

describe('TimeFormatComponent', () => {
  let component: TimeFormatComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [TimeFormatComponent]
    })
      .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
