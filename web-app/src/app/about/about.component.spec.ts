import { TestBed, waitForAsync } from '@angular/core/testing';
import { AboutComponent } from './about.component';

describe('AdminMapComponent', () => {
  let component: AboutComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AboutComponent]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
