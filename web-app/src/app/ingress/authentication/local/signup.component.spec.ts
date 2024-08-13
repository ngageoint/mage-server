import { TestBed, waitForAsync } from '@angular/core/testing';
import { SignupComponent } from './signup.component';

describe('Signup Component', () => {
  let component: SignupComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [SignupComponent]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
