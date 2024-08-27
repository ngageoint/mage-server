import { TestBed, waitForAsync } from '@angular/core/testing';
import { LdapAuthenticationComponent } from './ldap-authentication.component';

describe('LDAP Authentication Component', () => {
  let component: LdapAuthenticationComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [LdapAuthenticationComponent]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
