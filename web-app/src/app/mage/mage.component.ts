import { Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MapService } from '../map/map.service';
import { FilterService } from '../filter/filter.service';
import { EventService } from '../event/event.service';
import { UserService } from '../user/user.service';
import * as _ from 'underscore';

@Component({
  selector: 'mage',
  templateUrl: './mage.component.html',
  styleUrls: ['./mage.component.scss']
})
export class MageComponent implements OnInit, OnChanges {

  map: any
  hideFeed: boolean = false
  newObservation: any

  constructor(
    private mapService: MapService,
    private userService: UserService,
    private eventService: EventService,
    private filterService: FilterService
  ) {}

  ngOnInit(): void {
    this.mapService.addListener(this);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.toggleFeed && !changes.toggleFeed.isFirstChange()) {
      this.hideFeed = !this.hideFeed;
    }
  }

  onMap($event) {
    this.map = $event.map;
  }

  showFeed() {
    this.hideFeed = false;
  }

  onAddObservation($event) {
    console.log('trying to add a mage component')
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
