import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { CreateUserModalComponent } from './create-user.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import {
  MatDialogModule as MatDialogModule,
  MatDialogRef as MatDialogRef,
  MAT_DIALOG_DATA as MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { ApiService } from '../../../api/api.service';
import { Role } from '../user';
import { of, throwError } from 'rxjs';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { MatSelectModule as MatSelectModule } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule as MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule as MatProgressBarModule } from '@angular/material/progress-bar';
import { UserService } from '../../../user/user.service';

describe('CreateUserModalComponent', () => {
  let component: CreateUserModalComponent;
  let fixture: ComponentFixture<CreateUserModalComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<CreateUserModalComponent>>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;

  const mockRoles: Role[] = [
    { id: '1', name: 'Admin', permissions: [] },
    { id: '2', name: 'User', permissions: [] }
  ];

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getApi']);
    userServiceSpy = jasmine.createSpyObj('UserService', ['createUser']);
    userServiceSpy.createUser.and.callFake((user: any) =>
      of({ ...user, id: 'created-id' })
    );
    apiServiceSpy.getApi.and.returnValue(
      of({
        authenticationStrategies: {
          local: {
            passwordHelpText: 'Password must be at least 8 characters.'
          }
        }
      })
    );

    await TestBed.configureTestingModule({
      declarations: [CreateUserModalComponent],
      imports: [
        ReactiveFormsModule,
        FormsModule,
        MatDialogModule,
        NoopAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        MatTooltipModule,
        MatProgressBarModule
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { roles: mockRoles } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: UserService, useValue: userServiceSpy }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateUserModalComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load passwordHelpText from the local strategy on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(apiServiceSpy.getApi).toHaveBeenCalled();
    expect(component.passwordHelpText).toBe(
      'Password must be at least 8 characters.'
    );

    const passwordControl = component.signup.get('password');
    const confirmControl = component.signup.get('passwordconfirm');

    expect(passwordControl).toBeTruthy();
    expect(confirmControl).toBeTruthy();
  }));

  it('should leave passwordHelpText unset when the api does not provide one', fakeAsync(() => {
    apiServiceSpy.getApi.and.returnValue(
      of({ authenticationStrategies: { local: {} } })
    );

    fixture.detectChanges();
    tick();

    expect(component.passwordHelpText).toBeUndefined();
  }));

  it('should validate required fields in form', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const form = component.signup;
    form.get('displayName')?.setValue('');
    form.get('username')?.setValue('');
    form.get('password')?.setValue('');
    form.get('passwordconfirm')?.setValue('');
    form.get('selectedRole')?.setValue(null);

    form.updateValueAndValidity();

    expect(form.valid).toBeFalse();
    expect(form.get('displayName')?.invalid).toBeTrue();
    expect(form.get('username')?.invalid).toBeTrue();
    expect(form.get('password')?.invalid).toBeTrue();
    expect(form.get('passwordconfirm')?.invalid).toBeTrue();
    expect(form.get('selectedRole')?.invalid).toBeTrue();
  }));

  it('should update password strength object when password changes', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const passwordControl = component.signup.get('password');
    expect(passwordControl).toBeTruthy();

    const before = component.passwordStrength;
    passwordControl?.setValue('GoodPass1!');
    tick();

    expect(component.passwordStrength).toBeTruthy();
    expect(component.passwordStrength).not.toBe(before);
  }));

  it('should handle form submission when valid', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    (dialogRefSpy.close as jasmine.Spy).calls.reset();

    component.signup.patchValue({
      displayName: 'John Doe',
      username: 'john_doe',
      email: '',
      password: 'S!t!0!n!g!P!a!s!s!1!',
      passwordconfirm: 'S!t!0!n!g!P!a!s!s!1!',
      selectedRole: mockRoles[0].id
    });

    component.passwordErrorMessages = [];
    component.signup.updateValueAndValidity();

    component.saveUser();

    expect(userServiceSpy.createUser).toHaveBeenCalledWith({
      username: 'john_doe',
      displayName: 'John Doe',
      email: '',
      password: 'S!t!0!n!g!P!a!s!s!1!',
      passwordconfirm: 'S!t!0!n!g!P!a!s!s!1!',
      roleId: '1',
      avatar: null,
      icon: null,
      iconMetadata: null
    });
    expect(dialogRefSpy.close).toHaveBeenCalledWith(
      jasmine.objectContaining({ username: 'john_doe', id: 'created-id' })
    );
  }));

  it('should not submit form if invalid', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    (dialogRefSpy.close as jasmine.Spy).calls.reset();
    component.passwordErrorMessages = [];

    component.saveUser();

    expect(dialogRefSpy.close).not.toHaveBeenCalled();
    expect(component.signup.touched).toBeTrue();
  }));

  it('should not submit form if password errors exist', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    (dialogRefSpy.close as jasmine.Spy).calls.reset();

    component.signup.patchValue({
      displayName: 'John Doe',
      username: 'john_doe',
      email: '',
      password: 'S!t!0!n!g!P!a!s!s!1!',
      passwordconfirm: 'S!t!0!n!g!P!a!s!s!1!',
      selectedRole: mockRoles[0].id
    });

    component.passwordErrorMessages = ['x'];
    component.signup.updateValueAndValidity();

    component.saveUser();

    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  }));

  it('should surface the server password policy message on a 400 response', fakeAsync(() => {
    userServiceSpy.createUser.and.returnValue(
      throwError(() => ({ status: 400, error: 'Password is too weak' }))
    );

    fixture.detectChanges();
    tick();
    (dialogRefSpy.close as jasmine.Spy).calls.reset();

    component.signup.patchValue({
      displayName: 'John Doe',
      username: 'john_doe',
      email: '',
      password: 'weak',
      passwordconfirm: 'weak',
      selectedRole: mockRoles[0].id
    });

    component.passwordErrorMessages = [];
    component.signup.updateValueAndValidity();

    component.saveUser();

    expect(dialogRefSpy.close).not.toHaveBeenCalled();
    expect(component.saving()).toBeFalse();
    expect(component.passwordErrorMessages).toEqual(['Password is too weak']);
    expect(
      component.signup.get('password')?.errors?.['policy']
    ).toBeTrue();
    expect(component.serverError()).toBe('');
  }));

  it('should show a generic error for non-password server failures', fakeAsync(() => {
    userServiceSpy.createUser.and.returnValue(
      throwError(() => ({ status: 500, error: 'boom' }))
    );

    fixture.detectChanges();
    tick();

    component.signup.patchValue({
      displayName: 'John Doe',
      username: 'john_doe',
      email: '',
      password: 'somepassword',
      passwordconfirm: 'somepassword',
      selectedRole: mockRoles[0].id
    });

    component.passwordErrorMessages = [];
    component.signup.updateValueAndValidity();

    component.saveUser();

    expect(component.serverError()).toBe(
      'Failed to create user. Please try again.'
    );
  }));
});
