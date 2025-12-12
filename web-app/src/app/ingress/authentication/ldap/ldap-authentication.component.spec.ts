import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { LdapAuthenticationComponent } from './ldap-authentication.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthenticationButtonComponent } from '../button/authentication-button.component';

describe('LDAP Authentication Component', () => {
  let component: LdapAuthenticationComponent;
  let fixture: ComponentFixture<LdapAuthenticationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [LdapAuthenticationComponent, AuthenticationButtonComponent],
      imports: [HttpClientTestingModule, MatFormFieldModule]
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
