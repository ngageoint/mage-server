import { TestBed, waitForAsync } from '@angular/core/testing';
import { StatusComponent } from './status.component';

describe('Signup Status Component', () => {
  let component: StatusComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [StatusComponent]
    })
      .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
