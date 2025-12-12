import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { SignupComponent } from './signup.component';
import { ApiService } from '../../../api/api.service';
import { UserService } from '../../../user/user.service';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { User } from 'core-lib-src/user';
import { HttpErrorResponse } from '@angular/common/http';
import { PasswordPolicy } from '../@types/signup';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('SignupComponent', () => {
  let component: SignupComponent;
  let fixture: ComponentFixture<SignupComponent>;

  let mockApiService: any;
  let mockUserService: any;

  const mockPasswordPolicy: PasswordPolicy = {
    passwordMinLengthEnabled: true,
    passwordMinLength: 8,
    lowLettersEnabled: true,
    lowLetters: 1,
    highLettersEnabled: true,
    highLetters: 1,
    numbersEnabled: true,
    numbers: 1,
    specialCharsEnabled: true,
    specialChars: 1,
    maxConCharsEnabled: true,
    maxConChars: 2,
    restrictSpecialCharsEnabled: true,
    restrictSpecialChars: '!@#',
    minCharsEnabled: true,
    minChars: 2,
    helpTextTemplate: {
      passwordMinLength: 'Test #',
      lowLetters: 'Test #',
      highLetters: 'Test #',
      numbers: 'Test #',
      specialChars: 'Test #',
      maxConChars: 'Test #',
      restrictSpecialChars: 'Test #',
      minChars: 'Test #'
    }
  };

  const mockUser: User = {
    id: '1',
    username: 'ranma77',
    displayName: 'Ranma Saotome',
    active: true,
    enabled: true,
    authentication: 'LOCAL',
    createdAt: new Date().toDateString(),
    lastUpdated: new Date().toDateString(),
    recentEventIds: [],
    role: 'martial artist',
    email: 'ranma@example.com',
    phones: []
  };

  beforeEach(waitForAsync(() => {
    mockApiService = {
      getApi: jasmine.createSpy().and.returnValue(
        of({
          authenticationStrategies: {
            local: {
              settings: {
                passwordPolicy: mockPasswordPolicy
              }
            }
          }
        })
      )
    };

    mockUserService = {
      signup: jasmine
        .createSpy()
        .and.returnValue(
          of({ captcha: 'captcha-uri', token: 'captcha-token' })
        ),
      signupVerify: jasmine.createSpy().and.returnValue(of(mockUser))
    };

    TestBed.configureTestingModule({
      declarations: [SignupComponent],
      imports: [
        ReactiveFormsModule,
        HttpClientTestingModule,
        MatFormFieldModule,
        MatInputModule,
        CommonModule,
        BrowserModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
    });
  }));

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize passwordPolicy and update password control', () => {
    const passwordControl = component.signup.get('password');
    expect(passwordControl?.validator).toBeTruthy();
    expect(component.passwordPolicy).toEqual(mockPasswordPolicy);
  });

  it('should emit cancel event on onCancel()', () => {
    spyOn(component.complete, 'emit');
    component.onCancel();
    expect(component.complete.emit).toHaveBeenCalledWith({ reason: 'cancel' });
  });

  it('should get captcha on getCaptcha()', () => {
    component.signup.controls.username.setValue(mockUser.username);
    component.getCaptcha();
    expect(mockUserService.signup).toHaveBeenCalledWith(mockUser.username);
    expect(component.captcha.token).toBe('captcha-token');
  });

  it('should not call getCaptcha() without username', () => {
    component.signup.controls.username.setValue('');
    component.getCaptcha();
    expect(mockUserService.signup).not.toHaveBeenCalled();
    expect(component.loadingCaptcha).toBeFalse();
  });

  it('should emit signup event if form is valid and passwords match', () => {
    spyOn(component.complete, 'emit');

    component.signup.patchValue({
      username: mockUser.username,
      displayName: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      password: 'Aa1!Aa1!',
      passwordconfirm: 'Aa1!Aa1!',
      captchaText: 'captcha'
    });

    component.captcha.token = 'valid-token';

    component.onSignup();

    expect(mockUserService.signupVerify).toHaveBeenCalled();
    expect(component.complete.emit).toHaveBeenCalledWith({
      reason: 'signup',
      user: mockUser
    });
  });

  it('should set error if passwords do not match', () => {
    component.signup.patchValue({
      password: 'Password1!',
      passwordconfirm: 'Mismatch'
    });

    component.onSignup();

    const errors = component.signup.controls.passwordconfirm.errors;
    expect(errors).toBeTruthy();
    expect(errors!['match']).toBeTrue();
  });

  it('should handle 401 error and call getCaptcha()', () => {
    const getCaptchaSpy = spyOn(component, 'getCaptcha');
    mockUserService.signupVerify = jasmine
      .createSpy()
      .and.returnValue(
        throwError(
          () =>
            new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
        )
      );

    component.signup.patchValue({
      username: mockUser.username,
      displayName: mockUser.displayName,
      email: mockUser.email,
      phone: '',
      password: 'Aa1!Aa1!',
      passwordconfirm: 'Aa1!Aa1!',
      captchaText: 'text'
    });

    component.captcha.token = 'token';
    component.onSignup();

    expect(getCaptchaSpy).toHaveBeenCalled();
  });

  it('should set captcha error on 403', () => {
    mockUserService.signupVerify = jasmine
      .createSpy()
      .and.returnValue(
        throwError(
          () => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' })
        )
      );

    component.signup.patchValue({
      username: mockUser.username,
      displayName: mockUser.displayName,
      email: mockUser.email,
      phone: '',
      password: 'Aa1!Aa1!',
      passwordconfirm: 'Aa1!Aa1!',
      captchaText: 'text'
    });

    component.captcha.token = 'token';
    component.onSignup();

    expect(component.signup.controls.captchaText.errors?.invalid).toBeTrue();
  });

  it('should set username error on 409', () => {
    mockUserService.signupVerify = jasmine
      .createSpy()
      .and.returnValue(
        throwError(
          () => new HttpErrorResponse({ status: 409, statusText: 'Conflict' })
        )
      );

    component.signup.patchValue({
      username: mockUser.username,
      displayName: mockUser.displayName,
      email: mockUser.email,
      phone: '',
      password: 'Aa1!Aa1!',
      passwordconfirm: 'Aa1!Aa1!',
      captchaText: 'text'
    });

    component.captcha.token = 'token';
    component.onSignup();

    expect(component.signup.controls.username.errors?.exists).toBeTrue();
  });

  it('should evaluate password strength', () => {
    component.signup.controls.username.setValue('testuser');
    component.onPasswordChanged('TestPassword123!');
    expect(component.passwordStrength).toBeTruthy();
  });

  it('should return correct tooltip text from password policy', () => {
    const tooltip = component.passwordTooltipText;
    expect(tooltip).toContain('At least 8 characters');
    expect(tooltip).toContain('Minimum 1 lowercase');
    expect(tooltip).toContain('Allowed: !@#');
  });

  it('should validate password with policy (too short)', () => {
    const ctrl = component.signup.controls.password;
    ctrl.setValue('aa');
    fixture.detectChanges();
    const errors = ctrl.errors || {};
    expect(errors['passwordMinLength']).toBeTrue();
  });

  it('should allow valid password by policy', () => {
    const ctrl = component.signup.controls.password;
    ctrl.setValue('Aa1!Aa1!');
    fixture.detectChanges();
    expect(ctrl.errors).toBeNull();
  });

  it('should toggle showPassword flag', () => {
    expect(component.showPassword).toBeFalse();
    component.showPassword = true;
    expect(component.showPassword).toBeTrue();
  });

  it('should toggle showConfirmPassword flag', () => {
    expect(component.showConfirmPassword).toBeFalse();
    component.showConfirmPassword = true;
    expect(component.showConfirmPassword).toBeTrue();
  });

  it('should validate minChars rule for mixed-case letters', () => {
    const ctrl = component.signup.controls.password;

    ctrl.setValue('1!');
    fixture.detectChanges();
    expect((ctrl.errors || {})['minChars']).toBeTrue();

    ctrl.setValue('AA1a!');
    fixture.detectChanges();
    expect((ctrl.errors || {})['minChars']).toBeFalsy();
  });
});
