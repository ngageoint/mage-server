import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { LocalAuthenticationComponent } from './local-authentication.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ApiService } from '../../../api/api.service';
import { UserService } from '../../../user/user.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('Local Authentication Component', () => {
  let component: LocalAuthenticationComponent;
  let fixture: ComponentFixture<LocalAuthenticationComponent>;

  let mockApiService: any;
  let mockUserService: any;
  let mockRouter: any;

  const mockApi = {
    version: { major: 1, minor: 0, micro: 0 },
    serverVersion: '1.0.0',
    initial: false,
    contactInfo: {},
    localAuthenticationStrategy: { enabled: true, name: 'local', type: 'local', title: 'Local', textColor: '', buttonColor: '', icon: '' },
    authenticationStrategies: {}
  };

  beforeEach(waitForAsync(() => {
    mockApiService = {
      getApi: jasmine.createSpy().and.returnValue(of(mockApi))
    };

    mockUserService = {
      signin: jasmine.createSpy()
    };

    mockRouter = {
      navigate: jasmine.createSpy()
    };

    TestBed.configureTestingModule({
      imports: [LocalAuthenticationComponent, MatFormFieldModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: UserService, useValue: mockUserService },
        { provide: Router, useValue: mockRouter },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LocalAuthenticationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not attempt signin when the form is invalid', () => {
    component.onSignin();
    expect(mockUserService.signin).not.toHaveBeenCalled();
  });

  it('should emit authenticated on successful signin', () => {
    spyOn(component.authenticated, 'emit');
    mockUserService.signin.and.returnValue(of({ token: 'abc' }));

    component.authenticationForm.setValue({ username: 'ranma77', password: 'p@ss' });
    component.onSignin();

    expect(mockUserService.signin).toHaveBeenCalledWith('ranma77', 'p@ss');
    expect(component.authenticated.emit).toHaveBeenCalledWith({ token: 'abc' });
  });

  it('should set an error message on failed signin', () => {
    mockUserService.signin.and.returnValue(throwError(() => ({ error: 'Invalid credentials' })));

    component.authenticationForm.setValue({ username: 'ranma77', password: 'wrong' });
    component.onSignin();

    const error = component.error();
    expect(error).toBeTruthy();
    expect(error?.title).toBe('Error Signing In');
  });

  it('should append contact links to the error message when contact info is present', () => {
    mockApiService.getApi.and.returnValue(of({ ...mockApi, contactInfo: { email: 'admin@example.com' } }));
    fixture = TestBed.createComponent(LocalAuthenticationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    mockUserService.signin.and.returnValue(throwError(() => ({ error: 'Invalid credentials' })));
    component.authenticationForm.setValue({ username: 'ranma77', password: 'wrong' });
    component.onSignin();

    const error = component.error();
    expect(error?.message as string).toContain('mailto:admin%40example.com');
  });

  it('should emit signup on onSignup()', () => {
    spyOn(component.signup, 'emit');
    component.onSignup();
    expect(component.signup.emit).toHaveBeenCalled();
  });

  it('should navigate to about on onAboutClick()', () => {
    component.onAboutClick();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['about']);
  });
});
