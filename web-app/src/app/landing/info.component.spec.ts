import { TestBed, waitForAsync } from '@angular/core/testing';
import { LandingComponent } from './landing.component';

describe('LandingComponent', () => {
  let component: LandingComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [LandingComponent]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
