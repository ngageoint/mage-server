import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAuthenticationSAMLComponent } from './admin-authentication-saml.component';

describe('AdminAuthenticationSAMLComponent', () => {
  let component: AdminAuthenticationSAMLComponent;
  let fixture: ComponentFixture<AdminAuthenticationSAMLComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AdminAuthenticationSAMLComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminAuthenticationSAMLComponent);
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
        profile: {},
        options: {}
      }
    }
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
