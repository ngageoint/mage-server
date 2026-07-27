import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { LdapAuthenticationComponent } from './ldap-authentication.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { AuthenticationButtonComponent } from '../button/authentication-button.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { UserService } from '../../../user/user.service';
import { of, throwError } from 'rxjs';

describe('LDAP Authentication Component', () => {
  let component: LdapAuthenticationComponent;
  let fixture: ComponentFixture<LdapAuthenticationComponent>;

  let mockUserService: any;

  beforeEach(waitForAsync(() => {
    mockUserService = {
      ldapSignin: jasmine.createSpy()
    };

    TestBed.configureTestingModule({
      imports: [LdapAuthenticationComponent, AuthenticationButtonComponent, MatFormFieldModule],
      providers: [
        { provide: UserService, useValue: mockUserService },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LdapAuthenticationComponent);
    component = fixture.componentInstance;
    component.strategy = { enabled: true, name: 'ldap', type: 'ldap', title: 'LDAP', textColor: '', buttonColor: '', icon: '' };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not attempt signin when the form is invalid', () => {
    component.onSignin();
    expect(mockUserService.ldapSignin).not.toHaveBeenCalled();
  });

  it('should emit authenticated on successful signin', () => {
    spyOn(component.authenticated, 'emit');
    mockUserService.ldapSignin.and.returnValue(of({ token: 'abc' }));

    component.authenticationForm.setValue({ username: 'ranma77', password: 'p@ss' });
    component.onSignin();

    expect(mockUserService.ldapSignin).toHaveBeenCalledWith('ranma77', 'p@ss');
    expect(component.authenticated.emit).toHaveBeenCalledWith({ token: 'abc' });
  });

  it('should set error and contact signals on failed signin', () => {
    mockUserService.ldapSignin.and.returnValue(throwError(() => ({ error: 'Invalid credentials' })));

    component.authenticationForm.setValue({ username: 'ranma77', password: 'wrong' });
    component.onSignin();

    const error = component.error();
    expect(error).toBeTruthy();
    expect(error?.title).toBe('Error Signing In');
    expect(error?.message).toBe('Invalid credentials');
    expect(component.contact()).toContain('email</a>');
  });
});
