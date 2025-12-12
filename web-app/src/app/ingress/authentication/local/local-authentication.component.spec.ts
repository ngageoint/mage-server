import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { LocalAuthenticationComponent } from './local-authentication.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthenticationButtonComponent } from '../button/authentication-button.component';

describe('Local Authentication Component', () => {
  let component: LocalAuthenticationComponent;
  let fixture: ComponentFixture<LocalAuthenticationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [LocalAuthenticationComponent, AuthenticationButtonComponent],
      imports: [HttpClientTestingModule, MatFormFieldModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LocalAuthenticationComponent);
    component = fixture.componentInstance;
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
