import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AdminAuthenticationLDAPComponent } from './admin-authentication-ldap.component';

describe('AdminAuthenticationLDAPComponent', () => {
  let component: AdminAuthenticationLDAPComponent;
  let fixture: ComponentFixture<AdminAuthenticationLDAPComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AdminAuthenticationLDAPComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminAuthenticationLDAPComponent);
    component = fixture.componentInstance;
    component.strategy = {
      enabled: true,
      name: '',
      type: '',
      title: '',
      textColor: '#FFFFFF',
      buttonColor: '#1E88E5',
      icon: null,
      settings: {
        usersReqAdmin: {
          enabled: true
        },
        devicesReqAdmin: {
          enabled: true
        },
        headers: {},
        profile: {}
      }
    }
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
