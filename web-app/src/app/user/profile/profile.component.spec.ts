import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ProfileComponent } from './profile.component';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpEvent, HttpEventType, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { delay, of, throwError } from 'rxjs';
import { UserService } from '../user.service';
import { SessionService } from 'mage-web-app/http/session.service';

describe('Profile Component', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let httpMock: HttpTestingController;
  let snackBar: MatSnackBar;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    snackBar = TestBed.inject(MatSnackBar);
    spyOn(snackBar, 'open');

    component.profile.setValue({
      username: 'jdoe',
      displayName: 'Jane Doe',
      email: 'jane@example.com',
      phone: ''
    });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not save and should mark the form touched when it is invalid', () => {
    component.profile.controls.displayName.setValue('')

    component.onSave();

    expect(component.profile.touched).toBeTrue();
    httpMock.expectNone('/api/users/myself');
  });

  it('should update the user and show a success message when save succeeds', () => {
    const updatedUser = { username: 'jdoe', displayName: 'Jane Doe' };

    component.onSave();

    expect(component.saving()).toBeTrue();

    const req = httpMock.expectOne('/api/users/myself');
    expect(req.request.method).toBe('PUT');
    req.flush(updatedUser);

    expect(component.saving()).toBeFalse();
    expect(component.user()).toEqual(updatedUser);
    expect(snackBar.open).toHaveBeenCalledWith('Profile updated successfully', undefined, { duration: 3000 });
  });

  it('should show the server error as a snackbar and stop saving when save fails', () => {
    component.onSave();

    const req = httpMock.expectOne('/api/users/myself');
    req.flush('failure', { status: 500, statusText: 'Server Error' });

    expect(component.saving()).toBeFalse();
    expect(snackBar.open).toHaveBeenCalledWith('failure', undefined, { duration: 6000 });
  });

  it('should fall back to a generic message when the error response has no string body', () => {
    component.onSave();

    const req = httpMock.expectOne('/api/users/myself');
    req.flush(null, { status: 0, statusText: 'Unknown Error' });

    expect(component.saving()).toBeFalse();
    expect(snackBar.open).toHaveBeenCalledWith('Error updating profile, please try again later.', undefined, { duration: 6000 });
  });
});

describe('Profile Component without zone.js', () => {
  const user = {
    username: 'user1',
    displayName: 'User One',
    email: 'user1@example.com',
    authentication: { type: 'local' }
  };

  let userService: jasmine.SpyObj<UserService>;

  beforeEach(async () => {
    userService = jasmine.createSpyObj('UserService', ['saveProfile', 'updatePassword']);

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserService, useValue: userService },
        { provide: SessionService, useValue: { user, clearSession: jasmine.createSpy('clearSession') } }
      ]
    }).compileComponents();
  });

  async function render(): Promise<ComponentFixture<ProfileComponent>> {
    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  async function settle(fixture: ComponentFixture<ProfileComponent>): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 10));
    await fixture.whenStable();
  }

  function fillPassword(fixture: ComponentFixture<ProfileComponent>): void {
    fixture.componentInstance.password.setValue({
      currentPassword: 'old-password',
      newPassword: 'new-password',
      newPasswordConfirm: 'new-password'
    });
  }

  it('should hide the saving mask when the save completes', async () => {
    userService.saveProfile.and.returnValue(
      of({ type: HttpEventType.Response, body: user } as HttpEvent<any>).pipe(delay(0))
    );
    const fixture = await render();

    fixture.nativeElement.querySelectorAll('.actions button')[1].click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.mask')).not.toBeNull();

    await settle(fixture);
    expect(fixture.nativeElement.querySelector('.mask')).toBeNull();
  });

  it('should show the server error when the password change fails', async () => {
    userService.updatePassword.and.returnValue(
      throwError(() => ({ status: 400, error: 'Password does not meet policy' })).pipe(delay(0))
    );
    const fixture = await render();
    fillPassword(fixture);

    fixture.componentInstance.onResetPassword();
    await settle(fixture);

    expect(fixture.nativeElement.querySelector('.error')?.textContent).toContain('Password does not meet policy');
  });

  it('should show invalid password when the current password is rejected', async () => {
    userService.updatePassword.and.returnValue(
      throwError(() => ({ status: 401 })).pipe(delay(0))
    );
    const fixture = await render();
    fillPassword(fixture);

    fixture.componentInstance.onResetPassword();
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('Invalid password');
  });
});
