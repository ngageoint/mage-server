import { TestBed, waitForAsync } from '@angular/core/testing';
import { PasswordResetSuccessDialog } from './password-reset-success-dialog';

describe('Password Reset Success Component', () => {
  let component: PasswordResetSuccessDialog;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PasswordResetSuccessDialog]
    })
      .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
