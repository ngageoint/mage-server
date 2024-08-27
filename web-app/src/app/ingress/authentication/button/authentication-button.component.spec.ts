import { TestBed, waitForAsync } from '@angular/core/testing';
import { AuthenticationButtonComponent } from './authentication-button.component';

describe('Authentication Button Component', () => {
  let component: AuthenticationButtonComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AuthenticationButtonComponent]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
