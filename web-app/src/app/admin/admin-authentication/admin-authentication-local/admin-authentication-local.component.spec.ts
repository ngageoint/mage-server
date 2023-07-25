import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AdminAuthenticationLocalComponent } from './admin-authentication-local.component';

describe('AdminAuthenticationLocalComponent', () => {
  let component: AdminAuthenticationLocalComponent;
  let fixture: ComponentFixture<AdminAuthenticationLocalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AdminAuthenticationLocalComponent ]
    })
    .compileComponents();
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
