import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { ChangePasswordComponent } from './change-password.component';
import { UserService } from '../../../user/user.service';

describe('ChangePasswordComponent', () => {
  let component: ChangePasswordComponent;
  let fixture: ComponentFixture<ChangePasswordComponent>;

  const mockUser: any = {
    id: 'test-user-id',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com'
  };

  const mockUserService: Partial<UserService> = {
    updateUserPassword: jasmine
      .createSpy('updateUserPassword')
      .and.returnValue(of(null))
  };

  const mockDialogRef = {
    close: jasmine.createSpy('close')
  };

  const mockSnackBar = {
    open: jasmine.createSpy('open')
  };

  beforeEach(async () => {
    mockDialogRef.close.calls.reset();
    mockSnackBar.open.calls.reset();
    (mockUserService.updateUserPassword as jasmine.Spy).calls.reset();
    (mockUserService.updateUserPassword as jasmine.Spy).and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [ChangePasswordComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { user: mockUser } },
        { provide: UserService, useValue: mockUserService },
        { provide: MatSnackBar, useValue: mockSnackBar }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should require both password fields', () => {
    component.updatePassword();

    expect(component.form.controls.password.hasError('required')).toBeTrue();
    expect(component.form.controls.passwordconfirm.hasError('required')).toBeTrue();
    expect(mockUserService.updateUserPassword as jasmine.Spy).not.toHaveBeenCalled();
  });

  it('should flag a mismatch error on the confirm field', () => {
    component.form.controls.password.setValue('abc123');
    component.form.controls.passwordconfirm.setValue('different');

    expect(component.form.controls.passwordconfirm.hasError('match')).toBeTrue();
    expect(component.form.invalid).toBeTrue();
  });

  it('should update the password, show a snackbar, and close the dialog on success', () => {
    component.form.controls.password.setValue('newpass123');
    component.form.controls.passwordconfirm.setValue('newpass123');

    component.updatePassword();

    expect(mockUserService.updateUserPassword as jasmine.Spy).toHaveBeenCalledWith(
      mockUser.id,
      { password: 'newpass123', passwordconfirm: 'newpass123' }
    );
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Password successfully updated.',
      'Close',
      { duration: 5000 }
    );
    expect(mockDialogRef.close).toHaveBeenCalled();
    expect(component.saving).toBeFalse();
  });

  it('should set an error and stop saving when the request fails', () => {
    (mockUserService.updateUserPassword as jasmine.Spy).and.returnValue(
      throwError(() => ({ error: 'boom' }))
    );

    component.form.controls.password.setValue('newpass123');
    component.form.controls.passwordconfirm.setValue('newpass123');

    component.updatePassword();

    expect(component.error).toBe('boom');
    expect(component.saving).toBeFalse();
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('should close the dialog on cancel', () => {
    component.cancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });
});
