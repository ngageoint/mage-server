import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ProfileComponent } from './profile.component';
import { MatDialogModule as MatDialogModule } from '@angular/material/dialog';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { UserAvatarModule } from '../user-avatar/user-avatar.module';
import { MatCardModule as MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Profile Component', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let httpMock: HttpTestingController;
  let snackBar: MatSnackBar;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [ProfileComponent],
    imports: [MatDialogModule,
        MatIconModule,
        MatFormFieldModule,
        UserAvatarModule,
        MatCardModule,
        MatToolbarModule,
        MatSnackBarModule],
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

    expect(component.saving).toBeTrue();
    expect(component.profileError).toBeUndefined();

    const req = httpMock.expectOne('/api/users/myself');
    expect(req.request.method).toBe('PUT');
    req.flush(updatedUser);

    expect(component.saving).toBeFalse();
    expect(component.user).toEqual(updatedUser);
    expect(component.profileError).toBeUndefined();
    expect(snackBar.open).toHaveBeenCalledWith('Profile updated successfully', undefined, { duration: 3000 });
  });

  it('should show an inline error and stop saving when save fails', () => {
    component.onSave();

    const req = httpMock.expectOne('/api/users/myself');
    req.flush('failure', { status: 500, statusText: 'Server Error' });

    expect(component.saving).toBeFalse();
    expect(component.profileError).toBe('Error updating profile, please try again later.');
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('should clear a previous error when a new save is attempted', () => {
    component.onSave();
    httpMock.expectOne('/api/users/myself').flush('failure', { status: 500, statusText: 'Server Error' });
    expect(component.profileError).toBeDefined();

    component.onSave();

    expect(component.profileError).toBeUndefined();
    httpMock.expectOne('/api/users/myself').flush({ username: 'jdoe', displayName: 'Jane Doe' });
  });
});
