import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { MapService } from '../map/map.service';
import { FilterService } from '../filter/filter.service';
import { EventService } from '../event/event.service';
import { UserService } from '../user/user.service';
import * as _ from 'underscore';
import { PollingService } from '../event/polling.service';

@Component({
  selector: 'mage',
  templateUrl: './mage.component.html',
  styleUrls: ['./mage.component.scss']
})
export class MageComponent implements OnInit, OnChanges, OnDestroy {

  map: any
  hideFeed: boolean
  filteredEvent: any = {}
  filteredTeams: any
  filteredInterval: any
  newObservation: any
  feedChangedUsers = {}

  constructor(
    private mapService: MapService,
    private userService: UserService,
    private eventService: EventService,
    private filterService: FilterService,
    private pollingService: PollingService
  ) {}

  ngOnInit(): void {
    // TODO figure this out
    // this.$animate.on('addClass', this.$document.find('.feed'), ($mapPane, animationPhase) => {
    //   this.resolveMapAfterFeaturesPaneTransition(animationPhase);
    // });
    // this.$animate.on('removeClass', this.$document.find('.feed'), ($mapPane, animationPhase) => {
    //   this.resolveMapAfterFeaturesPaneTransition(animationPhase);
    // });

    // TODO this is in contructor, do we need this anymore
    // this.mapService.initialize();

    this.filterService.addListener(this);
    this.mapService.addListener(this);

    this.eventService.query().subscribe(events => {
      const recentEventId = this.userService.getRecentEventId();
      const recentEvent = _.find(events, event => { return event.id === recentEventId; });
      if (recentEvent) {
        this.filterService.setFilter({ event: recentEvent });
        this.pollingService.setPollingInterval(this.pollingService.getPollingInterval());
      } else if (events.length > 0) {
        // TODO 'welcome to MAGE dialog'
        this.filterService.setFilter({ event: events[0] });
        this.pollingService.setPollingInterval(this.pollingService.getPollingInterval());
      } else {
        // TODO welcome to mage, sorry you have no events
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.toggleFeed && !changes.toggleFeed.isFirstChange()) {
      this.hideFeed = !this.hideFeed;
    }
  }

  ngOnDestroy(): void {
    this.filterService.removeListener(this);
    this.filterService.removeFilters();

    this.pollingService.setPollingInterval(0);

    this.mapService.destroy();

    this.eventService.destroy();
  }

  onMap($event) {
    this.map = $event.map;
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

  onToggleFeed($event) {
    this.hideFeed = $event.hidden;
  }

  showFeed() {
    this.hideFeed = false;
  }

  onAddObservation($event) {
    if (this.hideFeed) {
      this.showFeed();
    }

    this.newObservation = $event;
  }

  onLocation(location) {
    const event = this.filterService.getEvent();

    // TODO create location service to send location
    // this.Location.create({
    //   eventId: event.id,
    //   geometry: {
    //     type: 'Point',
    //     coordinates: [location.longitude, location.latitude]
    //   },
    //   properties: {
    //     timestamp: new Date().valueOf(),
    //     accuracy: location.accuracy,
    //     altitude: location.altitude,
    //     altitudeAccuracy: location.altitudeAccuracy,
    //     heading: location.heading,
    //     speed: location.speed
    //   }
    // });
  }

  onBroadcastLocation(callback) {
    if (!this.eventService.isUserInEvent(this.userService.myself, this.filterService.getEvent())) {
      // TODO make angular modal
      // this.$uibModal.open({
      //   template: require('../error/not.in.event.html'),
      //   controller: 'NotInEventController',
      //   resolve: {
      //     title: function () {
      //       return 'Cannot Broadcast Location';
      //     }
      //   }
      // });

      callback(false);
    } else {
      callback(true);
    }
  }
}
