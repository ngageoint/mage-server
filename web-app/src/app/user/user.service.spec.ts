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

    describe('sign in result', () => {
      let service: UserService;
      let popup: jasmine.SpyObj<Window>;
      let channel: jasmine.SpyObj<BroadcastChannel>;

      beforeEach(() => {
        service = TestBed.inject(UserService);
        popup = jasmine.createSpyObj<Window>('popup', ['close']);
        spyOn(window, 'open').and.returnValue(popup);
        channel = jasmine.createSpyObj<BroadcastChannel>('channel', ['addEventListener', 'close']);
        // A constructor, so spyOn's typings (functions only) don't apply
        spyOn(window as any, 'BroadcastChannel').and.returnValue(channel);
      });

      function broadcast(data: any): void {
        const [type, listener] = channel.addEventListener.calls.mostRecent().args;
        expect(type).toBe('message');
        (listener as EventListener)(new MessageEvent('message', { data }));
      }

      it('listens on the sign in channel', () => {
        service.idpSignin('openidconnect').subscribe();

        expect(window.BroadcastChannel).toHaveBeenCalledWith('mage-idp-signin');
      });

      it('reports a user and token as authenticated', () => {
        const user: any = { id: 'user-1' };
        let result: IdpSigninResult;
        service.idpSignin('openidconnect').subscribe(response => result = response);

        broadcast({ user, token: 'token' });

        expect(result).toEqual({ status: 'authenticated', user, token: 'token' });
      });

      it('reports a user without a token as unauthorized', () => {
        const user: any = { id: 'user-1', active: false };
        let result: IdpSigninResult;
        service.idpSignin('openidconnect').subscribe(response => result = response);

        broadcast({ user });

        expect(result).toEqual({ status: 'unauthorized', user });
      });

      it('reports an empty result as a failed sign in', () => {
        let result: IdpSigninResult;
        service.idpSignin('openidconnect').subscribe(response => result = response);

        broadcast({});

        expect(result).toEqual({ status: 'failed' });
      });

      it('closes the popup and stops listening once the result arrives', () => {
        service.idpSignin('openidconnect').subscribe();

        broadcast({});

        expect(popup.close).toHaveBeenCalled();
        expect(channel.close).toHaveBeenCalled();
      });

      it('stops listening when unsubscribed before a result arrives', () => {
        const subscription = service.idpSignin('openidconnect').subscribe();

        subscription.unsubscribe();

        expect(channel.close).toHaveBeenCalled();
      });
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
