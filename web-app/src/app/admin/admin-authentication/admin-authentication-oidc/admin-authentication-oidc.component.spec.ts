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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
