import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AdminAuthenticationLocalComponent } from './admin-authentication-local.component';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

describe('AdminAuthenticationLocalComponent', () => {
  let component: AdminAuthenticationLocalComponent;
  let fixture: ComponentFixture<AdminAuthenticationLocalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AdminAuthenticationLocalComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminAuthenticationLocalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
