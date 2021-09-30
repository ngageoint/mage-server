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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
