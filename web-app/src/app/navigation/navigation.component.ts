import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { FormControl } from '@angular/forms';
import { Observable, map, startWith } from 'rxjs';
import { FilterService } from '../filter/filter.service';
import { MapService } from '../map/map.service';
import { UserService } from '../user/user.service';
import { EventService } from '../event/event.service';
import { PollingService } from '../event/polling.service';
import * as _ from 'underscore';
import { Router } from '@angular/router';
import { SessionService } from 'mage-web-app/http/session.service';

@Component({
    selector: 'navigation',
    templateUrl: './navigation.component.html',
    styleUrls: ['./navigation.component.scss'],
    standalone: false
})
export class NavigationComponent implements OnInit, OnDestroy {
  @Output() onFeedToggle = new EventEmitter<void>();
  @Output() onPreferencesToggle = new EventEmitter<void>();
  @ViewChild('eventSearchInput') eventSearchInput: ElementRef<HTMLInputElement>;

  events: any[] = [];
  eventSearchControl = new FormControl('');
  filteredEvents: Observable<any[]>;

  eventMenuPosition: ConnectedPosition[] = [
    { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' }
  ];

  state = 'map';
  filteredEvent: any = {};
  eventsLoaded = false;
  filteredTeams: any;
  filteredInterval: any;
  feedChangedUsers = {};
  isAdmin: boolean = false;

  constructor(
    private router: Router,
    private mapService: MapService,
    private sessionService: SessionService,
    private userService: UserService,
    private eventService: EventService,
    private filterService: FilterService,
    private pollingService: PollingService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.filterService.event$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.onEventSelected(event));

    this.filterService.teams$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((teams) => {
        this.filteredTeams = _.map(teams, (t) => t.name).join(', ');
      });

    this.filterService.interval$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const intervalChoice = this.filterService.getIntervalChoice();
        if (intervalChoice.filter !== 'all') {
          if (intervalChoice.filter === 'custom') {
            // TODO format custom time interval
            this.filteredInterval = 'Custom time interval';
          } else {
            this.filteredInterval = intervalChoice.label;
          }
        } else {
          this.filteredInterval = null;
        }
      });

    this.filteredEvents = this.eventSearchControl.valueChanges.pipe(
      startWith(''),
      map((value) => this.filterEvents(value ?? ''))
    );

    this.eventService.query().subscribe((events) => {
      this.events = [...events].sort((a, b) => a.name.localeCompare(b.name));
      this.eventSearchControl.setValue('', { emitEvent: true });

      const recentEventId = this.userService.getRecentEventId();
      const recentEvent = _.find(events, (event) => {
        return event.id === recentEventId;
      });
      const event = recentEvent || (events.length > 0 ? events[0] : null);
      if (event) {
        this.filterService.setFilter({ event });
        this.pollingService.setPollingInterval(
          this.pollingService.getPollingInterval()
        );
      } else {
        // TODO welcome to mage, sorry you have no events
      }
      this.eventsLoaded = true;
    });

    this.mapService.init();
    this.eventService.init();
    this.isAdmin = this.sessionService.amAdmin;
  }

  ngOnDestroy(): void {
    this.filterService.removeFilters();

    this.mapService.destroy();

    this.eventService.destroy();
  }

  toggleFeed(): void {
    this.onFeedToggle.emit();
  }

  togglePreferences(): void {
    this.onPreferencesToggle.emit();
  }

  onLogout() {
    this.userService.logout().subscribe(() => {
      this.router.navigate(['landing']);
    });
  }

  onEventMenuOpened(): void {
    this.eventSearchControl.setValue('');
    setTimeout(() => this.eventSearchInput?.nativeElement.focus(), 0);
  }

  onSelectEvent(event: any): void {
    this.filterService.setFilter({ event });
  }

  private filterEvents(name: string): any[] {
    if (!name) return this.events.slice();
    const lower = name.toLowerCase();
    return this.events.filter((e) => e.name.toLowerCase().includes(lower));
  }

  private onEventSelected(event: any) {
    this.feedChangedUsers = {};

    if (event) {
      this.filteredEvent = event;

      // Stop broadcasting location if the event switches
      this.mapService.onLocationStop();
    }
  }
}
