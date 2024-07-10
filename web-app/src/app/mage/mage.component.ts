import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MapService } from '../map/map.service';
import { FilterService } from '../filter/filter.service';
import { EventService } from '../event/event.service';
import { UserService } from '../user/user.service';
import * as _ from 'underscore';
import { MatSidenav } from '@angular/material/sidenav';
import { LocationService } from '../user/location/location.service';

@Component({
  selector: 'mage',
  templateUrl: './mage.component.html',
  styleUrls: ['./mage.component.scss']
})
export class MageComponent implements OnInit, OnDestroy, OnChanges {

  map: any
  mapSize: number
  hideFeed: boolean = false
  newObservation: any

  @ViewChild('feed') feed: MatSidenav

  constructor(
    private mapService: MapService,
    private userService: UserService,
    private eventService: EventService,
    private filterService: FilterService,
    private locationService: LocationService
  ) {}

  ngOnInit(): void {
    this.mapService.addListener(this)
  }

  ngOnDestroy(): void {
    this.mapService.removeListener(this)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.toggleFeed && !changes.toggleFeed.isFirstChange()) {
      this.mapSize = Date.now()
      this.hideFeed = !this.hideFeed;
    }
  }

  onMap($event) {
    this.map = $event.map
  }

  onFeedToggle(): void {
    this.feed.toggle()
    this.mapSize = Date.now()
  }

  onAddObservation($event) {
    if (!this.feed.opened) {
      this.onFeedToggle()
    }

    this.newObservation = $event
  }

  onLocation(location) {
    //TODO  where should this come from I think I can listen to the map service
    const event = this.filterService.getEvent();

    // TODO  create location service to send location
    this.locationService.create(event.id, {
      eventId: event.id,
      geometry: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      },
      properties: {
        timestamp: new Date().valueOf(),
        accuracy: location.accuracy,
        altitude: location.altitude,
        altitudeAccuracy: location.altitudeAccuracy,
        heading: location.heading,
        speed: location.speed
      }
    }).subscribe({
      error: (response) => {
        console.log('Error sending location', response.message)
      }
    })
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

      callback(false)
    } else {
      callback(true)
    }
  }
}
