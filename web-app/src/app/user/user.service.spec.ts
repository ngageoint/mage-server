import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { EventPreference } from 'core-lib-src/user';

describe('User Service Tests', () => {
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [UserService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    const service: UserService = TestBed.inject(UserService);
    expect(service).toBeTruthy();
  });

  describe('idpSignin', () => {
    it('emits the sign in result posted back from the sign in window', () => {
      const service: UserService = TestBed.inject(UserService);
      spyOn(window, 'open').and.returnValue(null);

      let result: any;
      service.idpSignin('openidconnect').subscribe(response => result = response);
      window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, data: { token: 'token' } }));

      expect(result).toEqual({ token: 'token' });
    });

    it('ignores messages from other origins and keeps waiting for the sign in result', () => {
      const service: UserService = TestBed.inject(UserService);
      spyOn(window, 'open').and.returnValue(null);

      let result: any;
      service.idpSignin('openidconnect').subscribe(response => result = response);
      window.dispatchEvent(new MessageEvent('message', { origin: 'https://extension.example.com', data: { other: true } }));

      expect(result).toBeUndefined();

      window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, data: { token: 'token' } }));

      expect(result).toEqual({ token: 'token' });
    });
  });

  describe('getEventPreferences', () => {
    it('gets preferences for the given event', () => {
      const service: UserService = TestBed.inject(UserService);
      const eventPreference: EventPreference = { forms: { 1: { fields: { field1: { recentChoices: ['blue'] } } } } };

      let result: EventPreference;
      service.getEventPreferences(1).subscribe(preferences => result = preferences);

      const req = httpTestingController.expectOne('/api/my/preferences/events/1');
      expect(req.request.method).toEqual('GET');
      req.flush(eventPreference);

      expect(result).toEqual(eventPreference);
    });
  });
});
