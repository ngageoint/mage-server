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
import { of } from 'rxjs';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { MatSelectModule as MatSelectModule } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule as MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule as MatProgressBarModule } from '@angular/material/progress-bar';

describe('CreateUserModalComponent', () => {
  let component: CreateUserModalComponent;
  let fixture: ComponentFixture<CreateUserModalComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<CreateUserModalComponent>>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  const mockRoles: Role[] = [
    { id: '1', name: 'Admin', permissions: [] },
    { id: '2', name: 'User', permissions: [] }
  ];

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getApi']);
    apiServiceSpy.getApi.and.returnValue(
      of({
        authenticationStrategies: {
          local: {
            settings: {
              passwordPolicy: {
                passwordMinLength: 8,
                passwordMinLengthEnabled: true,
                lowLettersEnabled: true,
                lowLetters: 1,
                highLettersEnabled: true,
                highLetters: 1,
                numbersEnabled: true,
                numbers: 1,
                specialCharsEnabled: true,
                specialChars: 1,
                maxConCharsEnabled: true,
                maxConChars: 3,
                restrictSpecialCharsEnabled: true,
                restrictSpecialChars: '!@#',
                helpTextTemplate: {
                  passwordMinLength: 'be at least # characters long',
                  lowLetters: 'have at least # lowercase letter(s)',
                  highLetters: 'have at least # uppercase letter(s)',
                  numbers: 'contain at least # number(s)',
                  specialChars: 'contain at least # special character(s)',
                  maxConChars: 'have no more than # consecutive characters',
                  restrictSpecialChars: 'use only these special characters: #'
                }
              }
            }
          }
        }
      })
    );

    await TestBed.configureTestingModule({
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
        MatProgressBarModule,
        CreateUserModalComponent
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { roles: mockRoles } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: ApiService, useValue: apiServiceSpy }
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

  it('should initialize password policy on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(apiServiceSpy.getApi).toHaveBeenCalled();
    expect(component.passwordPolicy).toBeTruthy();
    expect(component.passwordTooltipText.length).toBeGreaterThan(0);

    const passwordControl = component.signup.get('password');
    const confirmControl = component.signup.get('passwordconfirm');

    expect(passwordControl).toBeTruthy();
    expect(confirmControl).toBeTruthy();
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

  it('should clear avatar preview when clearAvatar is called', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.avatarPreviewUrl = 'some-preview-url';
    component.selectedAvatarFileName = 'avatar.png';
    component.newUserFiles.avatar = new File(['x'], 'avatar.png', {
      type: 'image/png'
    });

    component.clearAvatar();

    expect(component.avatarPreviewUrl).toBe('');
    expect(component.selectedAvatarFileName).toBe('');
    expect(component.newUserFiles.avatar).toBeNull();
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

    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      confirmed: true,
      user: {
        username: 'john_doe',
        displayName: 'John Doe',
        email: '',
        password: 'S!t!0!n!g!P!a!s!s!1!',
        passwordconfirm: 'S!t!0!n!g!P!a!s!s!1!',
        roleId: '1',
        avatar: null,
        icon: null,
        iconMetadata: '{"type":"none","text":"","color":"#007bff"}'
      }
    });
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
});
