import { TestBed, waitForAsync } from '@angular/core/testing';
import { CoordinateSystemComponent } from './coordinate-system.component';

describe('CoordinateSystemComponent', () => {
  let component: CoordinateSystemComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [CoordinateSystemComponent]
    })
      .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
