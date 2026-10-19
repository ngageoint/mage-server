import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { EventPreference } from 'core-lib-src/user';
import { IdpSigninResult } from '../entities/authentication/authentication';

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
    it('opens the identity provider sign in as a named popup window', () => {
      const service: UserService = TestBed.inject(UserService);
      const open = spyOn(window, 'open').and.returnValue({} as Window);

      service.idpSignin('openidconnect').subscribe();

      expect(open).toHaveBeenCalledTimes(1);
      const [url, name, features] = open.calls.mostRecent().args;
      expect(url).toBe('/auth/openidconnect/signin');
      expect(name).toBe('mage-idp-signin');
      expect(features).toContain('popup');
      expect(features).toContain('width=480');
      expect(features).toContain('height=680');
    });

    it('reports a blocked popup instead of waiting for a result', () => {
      const service: UserService = TestBed.inject(UserService);
      spyOn(window, 'open').and.returnValue(null);

      let result: IdpSigninResult;
      service.idpSignin('openidconnect').subscribe(response => result = response);

      expect(result).toEqual({ status: 'popupBlocked' });
    });

    function signinResult(data: any): IdpSigninResult {
      const service: UserService = TestBed.inject(UserService);
      spyOn(window, 'open').and.returnValue({} as Window);

      let result: IdpSigninResult;
      service.idpSignin('openidconnect').subscribe(response => result = response);
      window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, data }));
      return result;
    }

    it('reports a user and token posted back as authenticated', () => {
      const user: any = { id: 'user-1' };
      expect(signinResult({ user, token: 'token' })).toEqual({ status: 'authenticated', user, token: 'token' });
    });

    it('reports a user posted back without a token as unauthorized', () => {
      const user: any = { id: 'user-1', active: false };
      expect(signinResult({ user })).toEqual({ status: 'unauthorized', user });
    });

    it('reports an empty result as a failed sign in', () => {
      expect(signinResult({})).toEqual({ status: 'failed' });
    });

    it('stops listening once the sign in result arrives', () => {
      const service: UserService = TestBed.inject(UserService);
      spyOn(window, 'open').and.returnValue({} as Window);
      const add = spyOn(window, 'addEventListener').and.callThrough();
      const remove = spyOn(window, 'removeEventListener').and.callThrough();

      service.idpSignin('openidconnect').subscribe();
      const listener = add.calls.mostRecent().args[1];
      window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, data: {} }));

      expect(remove).toHaveBeenCalledWith('message', listener);
    });

    it('stops listening when unsubscribed before a result arrives', () => {
      const service: UserService = TestBed.inject(UserService);
      spyOn(window, 'open').and.returnValue({} as Window);
      const add = spyOn(window, 'addEventListener').and.callThrough();
      const remove = spyOn(window, 'removeEventListener').and.callThrough();

      const subscription = service.idpSignin('openidconnect').subscribe();
      const listener = add.calls.mostRecent().args[1];
      subscription.unsubscribe();

      expect(remove).toHaveBeenCalledWith('message', listener);
    });

    it('ignores messages from other origins and keeps waiting for the sign in result', () => {
      const service: UserService = TestBed.inject(UserService);
      spyOn(window, 'open').and.returnValue({} as Window);
      const user: any = { id: 'user-1' };

      let result: IdpSigninResult;
      service.idpSignin('openidconnect').subscribe(response => result = response);
      window.dispatchEvent(new MessageEvent('message', { origin: 'https://extension.example.com', data: { other: true } }));

      expect(result).toBeUndefined();

      window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, data: { user, token: 'token' } }));

      expect(result).toEqual({ status: 'authenticated', user, token: 'token' });
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
