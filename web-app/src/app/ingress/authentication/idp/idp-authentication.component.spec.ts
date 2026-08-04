import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IdpAuthenticationComponent } from './idp-authentication.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { AuthenticationButtonComponent } from '../button/authentication-button.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { UserService } from '../../../user/user.service';
import { of } from 'rxjs';

describe('Idp Authentication Component', () => {
  let component: IdpAuthenticationComponent;
  let fixture: ComponentFixture<IdpAuthenticationComponent>;

  let mockUserService: jasmine.SpyObj<UserService>;

  beforeEach(waitForAsync(() => {
    mockUserService = jasmine.createSpyObj<UserService>('UserService', ['idpSignin']);

    TestBed.configureTestingModule({
    declarations: [IdpAuthenticationComponent, AuthenticationButtonComponent],
    imports: [MatFormFieldModule],
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
    const response = { token: 'abc', user: { active: true, enabled: true } };
    mockUserService.idpSignin.and.returnValue(of(response));

    component.signin();

    expect(mockUserService.idpSignin).toHaveBeenCalledWith('oauth');
    expect(component.authenticated.emit).toHaveBeenCalledWith(response);
  });

  it('should emit created when a user is returned without a token', () => {
    spyOn(component.created, 'emit');
    const user: any = { active: false, enabled: true };
    mockUserService.idpSignin.and.returnValue(of({ user }));

    component.signin();

    expect(component.created.emit).toHaveBeenCalledWith({ reason: 'signup', user });
  });

  it('should set an error when no user is returned at all', () => {
    spyOn(component.authenticated, 'emit');
    spyOn(component.created, 'emit');
    mockUserService.idpSignin.and.returnValue(of({}));

    component.signin();

    expect(component.authenticated.emit).not.toHaveBeenCalled();
    expect(component.created.emit).not.toHaveBeenCalled();
    expect(component.error).toBeTruthy();
    expect(component.error.title).toBe('Error Signing In');
  });
});
