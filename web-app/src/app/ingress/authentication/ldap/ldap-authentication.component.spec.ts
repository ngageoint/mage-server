import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { LdapAuthenticationComponent } from './ldap-authentication.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { AuthenticationButtonComponent } from '../button/authentication-button.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('LDAP Authentication Component', () => {
  let component: LdapAuthenticationComponent;
  let fixture: ComponentFixture<LdapAuthenticationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [LdapAuthenticationComponent, AuthenticationButtonComponent],
    imports: [MatFormFieldModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LdapAuthenticationComponent);
    component = fixture.componentInstance;
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
