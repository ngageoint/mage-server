import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FilterService } from './filter.service';
import { UserService } from '../user/user.service';
import { LocalStorageService } from '../http/local-storage.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Filter Service Tests', () => {

  let service: FilterService;
  let userService: jasmine.SpyObj<UserService>;
  let localStorageService: jasmine.SpyObj<LocalStorageService>;

  beforeEach(() => {
    userService = jasmine.createSpyObj('UserService', ['addRecentEvent']);
    userService.addRecentEvent.and.returnValue(of({}));

    localStorageService = jasmine.createSpyObj('LocalStorageService', [
      'getTimeInterval', 'setTimeInterval',
      'getTeams', 'setTeams',
      'getUsers', 'setUsers',
      'getForms', 'setForms'
    ]);
    localStorageService.getTimeInterval.and.returnValue(null);
    localStorageService.getTeams.and.returnValue([]);

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        FilterService,
        { provide: UserService, useValue: userService },
        { provide: LocalStorageService, useValue: localStorageService },
        { provide: SessionService, useValue: {} },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(FilterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('event$', () => {

    it('emits the current value (null) to a new subscriber', (done) => {
      service.event$.subscribe((event) => {
        expect(event).toBeNull();
        done();
      });
    });

    it('emits when setEvent is called with a new event', () => {
      const emitted: any[] = [];
      service.event$.subscribe((event) => emitted.push(event));

      const event: any = { id: 1, name: 'Event 1', teams: [] };
      service.setEvent(event);

      expect(emitted).toEqual([null, event]);
    });

    it('does not emit again for the same event id', () => {
      const event: any = { id: 1, name: 'Event 1', teams: [] };
      service.setEvent(event);

      const emitted: any[] = [];
      service.event$.subscribe((e) => emitted.push(e));

      service.setEvent({ id: 1, name: 'Event 1 renamed', teams: [] } as any);

      expect(emitted).toEqual([event]);
    });

    it('emits null when removeFilters is called', () => {
      const event: any = { id: 1, name: 'Event 1', teams: [] };
      service.setEvent(event);

      const emitted: any[] = [];
      service.event$.subscribe((e) => emitted.push(e));

      service.removeFilters();

      expect(emitted).toEqual([event, null]);
    });
  });

  describe('teams$/users$/forms$', () => {

    it('emits current teams when setTeams is called', () => {
      const emitted: any[] = [];
      service.teams$.subscribe((teams) => emitted.push(teams));

      const team: any = { id: 1, name: 'Team 1' };
      service.setTeams([team]);

      expect(emitted).toEqual([[], [team]]);
    });

    it('emits current users when setUsers is called', () => {
      const emitted: any[] = [];
      service.users$.subscribe((users) => emitted.push(users));

      const user: any = { id: 'u1', displayName: 'User 1' };
      service.setUsers([user]);

      expect(emitted).toEqual([[], [user]]);
    });

    it('emits current forms when setForms is called', () => {
      const emitted: any[] = [];
      service.forms$.subscribe((forms) => emitted.push(forms));

      const form: any = { id: 1, name: 'Form 1' };
      service.setForms([form]);

      expect(emitted).toEqual([[], [form]]);
    });
  });

  describe('interval$', () => {

    it('emits when the interval actually changes', () => {
      const emitted: any[] = [];
      service.interval$.subscribe((interval) => emitted.push(interval));

      const choice = { filter: 86400, label: 'Last 24 Hours' };
      service.setTimeInterval({ choice });

      expect(emitted.length).toBe(2);
      expect(emitted[1].choice).toEqual(choice);
    });

    it('does not emit again for the same choice', () => {
      const choice = service.getIntervalChoice();

      const emitted: any[] = [];
      service.interval$.subscribe((interval) => emitted.push(interval));

      service.setTimeInterval({ choice });

      expect(emitted.length).toBe(1);
    });
  });

  describe('actionFilter$', () => {

    it('emits when setFilter is called with an actionFilter', () => {
      const emitted: string[] = [];
      service.actionFilter$.subscribe((actionFilter) => emitted.push(actionFilter));

      service.setFilter({ actionFilter: 'important' });

      expect(emitted).toEqual(['', 'important']);
    });
  });

  describe('setFilter', () => {

    it('sets event, teams, users, and forms together', () => {
      const event: any = { id: 1, name: 'Event 1', teams: [{ id: 5, name: 'Team 5' }] };
      const team: any = { id: 5, name: 'Team 5' };
      const user: any = { id: 'u1', displayName: 'User 1' };
      const form: any = { id: 1, name: 'Form 1' };

      service.setFilter({ event, teams: [team], users: [user], forms: [form] });

      expect(service.getEvent()).toEqual(event);
      expect(service.getTeams()).toEqual([team]);
      expect(service.getUsers()).toEqual([user]);
      expect(service.getForms()).toEqual([form]);
    });

    it('resets teams to the previously saved selection when event changes without an explicit teams filter', () => {
      localStorageService.getTeams.and.returnValue([5]);
      const team: any = { id: 5, name: 'Team 5' };
      const event: any = { id: 1, name: 'Event 1', teams: [team] };

      service.setFilter({ event });

      expect(service.getTeams()).toEqual([team]);
    });
  });
});
