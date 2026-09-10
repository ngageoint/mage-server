import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { NavigationComponent } from './navigation.component';
import { FilterService } from '../filter/filter.service';
import { MapService } from '../map/map.service';
import { UserService } from '../user/user.service';
import { EventService } from '../event/event.service';
import { PollingService } from '../event/polling.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { Router } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule as MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

const eventA: any = { id: 1, name: 'Alpha Event' };
const eventB: any = { id: 2, name: 'Bravo Event' };

describe('Navigation Component', () => {
  let component: NavigationComponent;
  let fixture: ComponentFixture<NavigationComponent>;
  let filterService: jasmine.SpyObj<FilterService>;
  let eventService: jasmine.SpyObj<EventService>;
  let userService: jasmine.SpyObj<UserService>;

  beforeEach(waitForAsync(() => {
    filterService = jasmine.createSpyObj('FilterService', ['setFilter', 'removeFilters', 'getIntervalChoice'], {
      event$: of(null),
      teams$: of([]),
      interval$: of({})
    });
    filterService.getIntervalChoice.and.returnValue({ filter: 'all', label: 'All' });

    eventService = jasmine.createSpyObj('EventService', ['query', 'init', 'destroy']);
    eventService.query.and.returnValue(of([eventA, eventB]));

    userService = jasmine.createSpyObj('UserService', ['getRecentEventId', 'logout']);
    userService.getRecentEventId.and.returnValue(null);

    TestBed.configureTestingModule({
      declarations: [NavigationComponent],
      imports: [MatIconModule, MatMenuModule, MatToolbarModule],
      providers: [
        { provide: FilterService, useValue: filterService },
        { provide: MapService, useValue: jasmine.createSpyObj('MapService', ['init', 'destroy', 'onLocationStop']) },
        { provide: UserService, useValue: userService },
        { provide: EventService, useValue: eventService },
        { provide: PollingService, useValue: jasmine.createSpyObj('PollingService', ['getPollingInterval', 'setPollingInterval']) },
        { provide: SessionService, useValue: { amAdmin: false } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NavigationComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('selects the first event when there is no recently used event', () => {
    component.ngOnInit();

    expect(filterService.setFilter).toHaveBeenCalledWith({ event: eventA });
  });

  it('selects the recently used event when one is saved', () => {
    userService.getRecentEventId.and.returnValue(eventB.id);

    component.ngOnInit();

    expect(filterService.setFilter).toHaveBeenCalledWith({ event: eventB });
  });

  it('does not select an event when none are available', () => {
    eventService.query.and.returnValue(of([]));

    component.ngOnInit();

    expect(filterService.setFilter).not.toHaveBeenCalled();
  });

  it('sorts the event list by name for the picker', () => {
    eventService.query.and.returnValue(of([eventB, eventA]));

    component.ngOnInit();

    expect(component.events).toEqual([eventA, eventB]);
  });

  it('filters events in the picker by search text', (done) => {
    component.ngOnInit();

    component.filteredEvents.subscribe((events) => {
      if (events.length === 1) {
        expect(events).toEqual([eventB]);
        done();
      }
    });

    component.eventSearchControl.setValue('bravo');
  });

  it('calls setFilter when an event is selected from the picker', () => {
    component.ngOnInit();

    component.onSelectEvent(eventB);

    expect(filterService.setFilter).toHaveBeenCalledWith({ event: eventB });
  });

  it('does not show the "no event" placeholder until the event query resolves', () => {
    const events$ = new Subject<any[]>();
    eventService.query.and.returnValue(events$);

    component.ngOnInit();

    expect(component.eventsLoaded).toBe(false);

    events$.next([eventA, eventB]);

    expect(component.eventsLoaded).toBe(true);
  });

  it('unsubscribes and cleans up on destroy', () => {
    component.ngOnInit();

    component.ngOnDestroy();

    expect(filterService.removeFilters).toHaveBeenCalled();
    expect(eventService.destroy).toHaveBeenCalled();
  });
});
