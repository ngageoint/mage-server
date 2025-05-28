import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FilterService } from '../filter/filter.service';
import { MapService } from '../map/map.service';
import { UserService } from '../user/user.service';
import { EventService } from '../event/event.service';
import { PollingService } from '../event/polling.service';
import * as _ from 'underscore';
import { Router } from '@angular/router';

@Component({
  selector: 'navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit, OnDestroy {
  @Output() onFeedToggle = new EventEmitter<void>();
  @Output() onPreferencesToggle = new EventEmitter<void>();

  state = "map"
  filteredEvent: any = {}
  filteredTeams: any
  filteredInterval: any
  feedChangedUsers = {}
  isAdmin: boolean = false

  constructor(
    private router: Router,
    private mapService: MapService,
    private userService: UserService,
    private eventService: EventService,
    private filterService: FilterService,
    private pollingService: PollingService
  ) { }

  ngOnInit(): void {
    this.filterService.addListener(this);

    this.eventService.query().subscribe(events => {
      const recentEventId = this.userService.getRecentEventId();
      const recentEvent = _.find(events, event => { return event.id === recentEventId; });
      if (recentEvent) {
        this.filterService.setFilter({ event: recentEvent });
        this.pollingService.setPollingInterval(this.pollingService.getPollingInterval());
      } else if (events.length > 0) {
        // TODO 'welcome to Mage dialog'
        this.filterService.setFilter({ event: events[0] });
        this.pollingService.setPollingInterval(this.pollingService.getPollingInterval());
      } else {
        // TODO welcome to mage, sorry you have no events
      }
    });

    this.mapService.init()
    this.eventService.init()
    this.isAdmin = this.userService.amAdmin;
  }

  ngOnDestroy(): void {
    this.filterService.removeListener(this)
    this.filterService.removeFilters()

    this.mapService.destroy()

    this.eventService.destroy()
  }

  toggleFeed(): void {
    this.onFeedToggle.emit()
  }

  togglePreferences(): void {
    this.onPreferencesToggle.emit()
  }

  onLogout() {
    this.userService.logout().subscribe(() => {
      this.router.navigate(['landing']);
    })
  }

  onFilterChanged(filter) {
    this.feedChangedUsers = {};

    if (filter.event) {
      this.filteredEvent = this.filterService.getEvent();

      // Stop broadcasting location if the event switches
      this.mapService.onLocationStop();
    }

    if (filter.teams) this.filteredTeams = _.map(this.filterService.getTeams(), t => { return t.name; }).join(', ');
    if (filter.timeInterval) {
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
    }
  }
}
