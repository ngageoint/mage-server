import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { IngressModule } from '../ingress/ingress.module';
import { LocalAuthenticationComponent } from '../ingress/authentication/local/local-authentication.component';
import { ApiService } from '../api/api.service';
import { UserService } from '../user/user.service';

describe('User Guide login entry', () => {
  it('is not offered on the sign-in screen; the guide is reached through About MAGE', () => {
    TestBed.configureTestingModule({
      imports: [IngressModule],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ApiService, useValue: { getApi: () => of({}) } },
        { provide: UserService, useValue: { signin: jasmine.createSpy('signin') } }
      ]
    });
    const fixture = TestBed.createComponent(LocalAuthenticationComponent);
    fixture.componentInstance.landing = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[aria-label="Open the MAGE user guide in a new tab"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href*="help"]')).toBeNull();
  });
});
