import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { CreateUserModalComponent } from './create-user.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { ApiService } from '../../../api/api.service';
import { Role } from '../user';
import { of } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

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
      declarations: [CreateUserModalComponent],
      imports: [
        ReactiveFormsModule,
        FormsModule,
        MatDialogModule,
        BrowserAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule
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
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should validate required fields in form', () => {
    const form = component.signup;
    form.get('displayName')?.setValue('');
    form.get('username')?.setValue('');
    form.get('password')?.setValue('');
    expect(form.valid).toBeFalse();
    expect(form.get('displayName')?.invalid).toBeTrue();
    expect(form.get('username')?.invalid).toBeTrue();
    expect(form.get('password')?.invalid).toBeTrue();
  });

  it('should display error messages when form fields are invalid and touched', () => {
    const form = component.signup;
    const displayNameControl = form.get('displayName');
    displayNameControl?.setValue('');
    displayNameControl?.markAsTouched();
    fixture.detectChanges();
    const errorMessage = fixture.nativeElement.querySelector(
      '.password-error-popover mat-error'
    );
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.textContent).toContain('Display name is required');
  });

  it('should update password strength on password change', () => {
    const passwordControl = component.signup.get('password');
    passwordControl?.setValue('GoodPass');
    fixture.detectChanges();
    expect(component.passwordStrength.text).toBe('Good');
    expect(component.passwordStrength.value).toEqual('50');
    passwordControl?.setValue('Str0ngPass!');
    fixture.detectChanges();
    expect(component.passwordStrength.text).toBe('Excellent');
    expect(component.passwordStrength.value).toEqual('100');
  });

  it('should handle avatar file change and show preview', () => {
    const avatarInput =
      fixture.nativeElement.querySelector('input[type="file"]');
    spyOn(component, 'onAvatarChanged');
    avatarInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.onAvatarChanged).toHaveBeenCalled();
  });

  it('should clear avatar preview when clear button is clicked', () => {
    component.avatarPreviewUrl = 'some-preview-url';
    component.selectedAvatarFileName = 'avatar.png';
    component.clearAvatar();
    expect(component.avatarPreviewUrl).toBe('');
    expect(component.selectedAvatarFileName).toBe('');
  });

  it('should handle form submission when valid', () => {
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
  });

  it('should not submit form if invalid', () => {
    (dialogRefSpy.close as jasmine.Spy).calls.reset();
    component.saveUser();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });
});
