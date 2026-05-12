import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IdpAuthenticationComponent } from './idp-authentication.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { AuthenticationButtonComponent } from '../button/authentication-button.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Idp Authentication Component', () => {
  let component: IdpAuthenticationComponent;
  let fixture: ComponentFixture<IdpAuthenticationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [IdpAuthenticationComponent, AuthenticationButtonComponent, MatFormFieldModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IdpAuthenticationComponent);
    component = fixture.componentInstance;
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
