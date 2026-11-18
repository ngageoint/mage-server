import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamService } from '@ngageoint/mage.web-core-lib/team';
import { Subject, of, throwError } from 'rxjs';

import { UserDetailsViewComponent } from './user-details-view.component';
import { UserService } from '../../../../user/user.service';
import { AdminEventsService } from '../../../services/admin-events.service';
import { SessionService } from 'mage-web-app/http/session.service';

describe('UserDetailsViewComponent', () => {
  let component: UserDetailsViewComponent;
  let fixture: ComponentFixture<UserDetailsViewComponent>;
  let teamsServiceSpy: jasmine.SpyObj<TeamService>;
  let eventsServiceSpy: jasmine.SpyObj<AdminEventsService>;

  const mockUser: any = { id: 'user-1', displayName: 'User One', active: true, enabled: true };
  const teamOne: any = { id: 'team-1', name: 'Team One' };
  const teamTwo: any = { id: 'team-2', name: 'Team Two' };
  const eventOne: any = { id: 1, name: 'Event One' };

  beforeEach(async () => {
    teamsServiceSpy = jasmine.createSpyObj('TeamService', ['search']);
    teamsServiceSpy.search.and.returnValue(of({ items: [teamOne], totalCount: 1 } as any));

    eventsServiceSpy = jasmine.createSpyObj('AdminEventsService', ['getEvents']);
    eventsServiceSpy.getEvents.and.returnValue(of({ items: [eventOne], totalCount: 1 } as any));

    await TestBed.configureTestingModule({
      imports: [UserDetailsViewComponent],
      providers: [
        { provide: TeamService, useValue: teamsServiceSpy },
        { provide: AdminEventsService, useValue: eventsServiceSpy },
        { provide: UserService, useValue: jasmine.createSpyObj('UserService', ['deleteUser', 'updateUser']) },
        {
          provide: SessionService,
          useValue: {
            user$: of({ id: 'admin-1' }),
            hasPermission: () => true,
            getToken: () => 'token'
          }
        },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['dismiss']) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: ActivatedRoute, useValue: {} }
      ]
    })
      .overrideComponent(UserDetailsViewComponent, { set: { template: '', imports: [] } })
      .compileComponents();

    fixture = TestBed.createComponent(UserDetailsViewComponent);
    component = fixture.componentInstance;
    component.user = { ...mockUser };
  });

  it('should load teams and events on init', () => {
    fixture.detectChanges();

    expect(component.userTeams()).toEqual([teamOne]);
    expect(component.totalUserTeams()).toBe(1);
    expect(component.loadingTeams()).toBeFalse();
    expect(component.userEvents()).toEqual([eventOne]);
    expect(component.totalUserEvents()).toBe(1);
    expect(component.loadingEvents()).toBeFalse();
  });

  it('should debounce team search input into a single request', fakeAsync(() => {
    fixture.detectChanges();
    teamsServiceSpy.search.calls.reset();
    component.userTeamsPageIndex = 2;

    component.onTeamSearchChange('t');
    tick(100);
    component.onTeamSearchChange('te');
    tick(100);
    component.onTeamSearchChange('team');
    tick(300);

    expect(teamsServiceSpy.search).toHaveBeenCalledTimes(1);
    expect(teamsServiceSpy.search).toHaveBeenCalledWith(
      jasmine.objectContaining({ term: 'team', pageIndex: 0 })
    );
  }));

  it('should clear the team search through the debounced path', fakeAsync(() => {
    fixture.detectChanges();
    component.onTeamSearchChange('team');
    tick(300);
    teamsServiceSpy.search.calls.reset();

    component.onTeamSearchChange();
    tick(300);

    expect(component.teamSearchTerm).toBe('');
    expect(teamsServiceSpy.search).toHaveBeenCalledWith(
      jasmine.objectContaining({ term: undefined })
    );
  }));

  it('should ignore a stale team response when a newer request is made', fakeAsync(() => {
    const first = new Subject<any>();
    const second = new Subject<any>();
    teamsServiceSpy.search.and.returnValues(first, second);

    fixture.detectChanges();
    component.onUserTeamsPageChange({ pageIndex: 1, pageSize: 5, length: 10 });

    second.next({ items: [teamTwo], totalCount: 2 });
    first.next({ items: [teamOne], totalCount: 1 });
    tick();

    expect(component.userTeams()).toEqual([teamTwo]);
  }));

  it('should show an empty team list on failure and recover on the next request', fakeAsync(() => {
    teamsServiceSpy.search.and.returnValues(
      throwError(() => new Error('nope')),
      of({ items: [teamOne], totalCount: 1 } as any)
    );

    fixture.detectChanges();

    expect(component.userTeams()).toEqual([]);
    expect(component.loadingTeams()).toBeFalse();

    component.onUserTeamsPageChange({ pageIndex: 0, pageSize: 5, length: 0 });

    expect(component.userTeams()).toEqual([teamOne]);
  }));

  it('should debounce event search input into a single request', fakeAsync(() => {
    fixture.detectChanges();
    eventsServiceSpy.getEvents.calls.reset();

    component.onEventSearchChange('e');
    tick(100);
    component.onEventSearchChange('event');
    tick(300);

    expect(eventsServiceSpy.getEvents).toHaveBeenCalledTimes(1);
    expect(eventsServiceSpy.getEvents).toHaveBeenCalledWith(
      jasmine.objectContaining({ term: 'event', page: 0 })
    );
  }));
});
