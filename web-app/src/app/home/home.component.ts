import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MapService } from '../map/map.service';
import { FilterService } from '../filter/filter.service';
import { MatSidenav } from '@angular/material/sidenav';
import { LocationService } from '../user/location/location.service';
import { ActivatedRoute } from '@angular/router';
import { User } from 'core-lib-src/user';
import * as _ from 'underscore';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {

  user: User
  map: any
  event: any
  hideFeed: boolean = false
  newObservation: any

  @ViewChild('feed') feed: MatSidenav

  constructor(
    private mapService: MapService,
    private filterService: FilterService,
    private locationService: LocationService,
    private activatedRoute: ActivatedRoute
  ) { }

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

  onMap($event) {
    this.map = $event.map
  }

  onFilterChanged(filter: any) {
    this.event = filter.event?.added?.length ? filter.event.added[0] : null
  }

  onAddObservation($event) {
    if (!this.feed.opened) {
      this.feed.toggle()
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