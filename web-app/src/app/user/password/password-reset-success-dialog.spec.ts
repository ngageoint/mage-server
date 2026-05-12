import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { PasswordResetSuccessDialog } from './password-reset-success-dialog';
import { MatDialogModule as MatDialogModule, MatDialogRef as MatDialogRef } from '@angular/material/dialog';

describe('Password Reset Success Component', () => {
  let component: PasswordResetSuccessDialog;
  let fixture: ComponentFixture<PasswordResetSuccessDialog>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule, PasswordResetSuccessDialog],
      providers: [{
        provide: MatDialogRef, 
        useValue: {}
      }]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PasswordResetSuccessDialog);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
