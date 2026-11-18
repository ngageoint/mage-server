import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IdpAuthenticationComponent } from './idp-authentication.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { AuthenticationButtonComponent } from '../button/authentication-button.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { UserService } from '../../../user/user.service';
import { Subject, of } from 'rxjs';
import { IdpSigninResult } from '../../../entities/authentication/authentication';

describe('Idp Authentication Component', () => {
  let component: IdpAuthenticationComponent;
  let fixture: ComponentFixture<IdpAuthenticationComponent>;

  let mockUserService: jasmine.SpyObj<UserService>;

  beforeEach(waitForAsync(() => {
    mockUserService = jasmine.createSpyObj<UserService>('UserService', ['idpSignin']);

    TestBed.configureTestingModule({
    declarations: [IdpAuthenticationComponent],
    imports: [MatFormFieldModule, AuthenticationButtonComponent],
    providers: [
      { provide: UserService, useValue: mockUserService },
      provideHttpClient(withInterceptorsFromDi()),
      provideHttpClientTesting()
    ]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IdpAuthenticationComponent);
    component = fixture.componentInstance;
    component.strategy = { enabled: true, name: 'oauth', type: 'oauth', title: 'OAuth', textColor: '', buttonColor: '', icon: '' };
    fixture.detectChanges();
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit authenticated when a token and user are returned', () => {
    spyOn(component.authenticated, 'emit');
    const user: any = { active: true, enabled: true };
    mockUserService.idpSignin.and.returnValue(of<IdpSigninResult>({ status: 'authenticated', user, token: 'abc' }));

    component.signin();

    expect(mockUserService.idpSignin).toHaveBeenCalledWith('oauth');
    expect(component.authenticated.emit).toHaveBeenCalledWith({ user, token: 'abc' });
  });

  it('should only handle the latest attempt when the button is clicked again', () => {
    spyOn(component.authenticated, 'emit');
    const user: any = { active: true, enabled: true };
    const first = new Subject<IdpSigninResult>();
    const second = new Subject<IdpSigninResult>();
    mockUserService.idpSignin.and.returnValues(first, second);

    component.signin();
    component.signin();
    first.next({ status: 'authenticated', user, token: 'abc' });
    second.next({ status: 'authenticated', user, token: 'abc' });

    expect(first.observed).toBeFalse();
    expect(component.authenticated.emit).toHaveBeenCalledTimes(1);
  });

  it('should stop waiting for a sign in result when destroyed', () => {
    const result = new Subject<IdpSigninResult>();
    mockUserService.idpSignin.and.returnValue(result);

    component.signin();
    expect(result.observed).toBeTrue();

    fixture.destroy();
    expect(result.observed).toBeFalse();
  });

  it('should emit created when the user is not authorized for a token', () => {
    spyOn(component.created, 'emit');
    const user: any = { active: false, enabled: true };
    mockUserService.idpSignin.and.returnValue(of<IdpSigninResult>({ status: 'unauthorized', user }));

    component.signin();

    expect(component.created.emit).toHaveBeenCalledWith({ reason: 'signup', user });
  });

  it('should set an error when sign in fails', () => {
    spyOn(component.authenticated, 'emit');
    spyOn(component.created, 'emit');
    mockUserService.idpSignin.and.returnValue(of<IdpSigninResult>({ status: 'failed' }));

    component.signin();

    expect(component.authenticated.emit).not.toHaveBeenCalled();
    expect(component.created.emit).not.toHaveBeenCalled();
    expect(component.error).toBeTruthy();
    expect(component.error.title).toBe('Error Signing In');
  });

  it('should tell the user when the sign in window is blocked', () => {
    spyOn(component.authenticated, 'emit');
    spyOn(component.created, 'emit');
    mockUserService.idpSignin.and.returnValue(of<IdpSigninResult>({ status: 'popupBlocked' }));

    component.signin();
    fixture.detectChanges();

    expect(component.authenticated.emit).not.toHaveBeenCalled();
    expect(component.created.emit).not.toHaveBeenCalled();
    expect(component.error.title).toBe('Sign In Window Blocked');
    expect(fixture.nativeElement.querySelector('.error__message').textContent).toContain('Allow pop-ups for this site');
  });
});
