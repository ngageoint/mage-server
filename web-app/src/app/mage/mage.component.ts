import { Component, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MapService } from '../map/map.service';
import { FilterService } from '../filter/filter.service';
import { MatSidenav } from '@angular/material/sidenav';
import { LocationService } from '../user/location/location.service';
import { ActivatedRoute } from '@angular/router';
import { User } from '../entities/user/entities.user';
import * as _ from 'underscore';

@Component({
  selector: 'mage',
  templateUrl: './mage.component.html',
  styleUrls: ['./mage.component.scss']
})
export class MageComponent implements OnInit, OnDestroy, OnChanges {

  user: User
  map: any
  mapSize: number
  event: any
  hideFeed: boolean = false
  newObservation: any
  
  @ViewChild('feed') feed: MatSidenav

  constructor(
    private mapService: MapService,
    private filterService: FilterService,
    private locationService: LocationService,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.filterService.addListener(this)
    this.mapService.addListener(this)

    this.activatedRoute.data.subscribe(({ user }) => {
      this.user = user
    })
  }

  ngOnDestroy(): void {
    this.filterService.removeListener(this)
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

  onFilterChanged(filter: any) {
    this.event = filter.event?.added?.length ? filter.event.added[0] : null
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
}
