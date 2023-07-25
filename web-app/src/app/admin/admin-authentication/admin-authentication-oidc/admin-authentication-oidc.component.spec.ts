import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAuthenticationOidcComponent } from './admin-authentication-oidc.component';

describe('AdminAuthenticationOidcComponent', () => {
  let component: AdminAuthenticationOidcComponent;
  let fixture: ComponentFixture<AdminAuthenticationOidcComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AdminAuthenticationOidcComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminAuthenticationOidcComponent);
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
