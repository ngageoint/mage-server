import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAuthenticationOAuth2Component } from './admin-authentication-oauth2.component';

describe('AdminAuthenticationOAuth2Component', () => {
  let component: AdminAuthenticationOAuth2Component;
  let fixture: ComponentFixture<AdminAuthenticationOAuth2Component>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AdminAuthenticationOAuth2Component]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminAuthenticationOAuth2Component);
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
