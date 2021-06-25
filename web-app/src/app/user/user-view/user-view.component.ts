import { Component, EventEmitter, Inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { LatLng } from 'leaflet';
import { PointAccuracy } from 'src/app/map/clip/clip.component';
import { EventService, FilterService, LocationService, MapService } from 'src/app/upgrade/ajs-upgraded-providers';
import * as moment from 'moment'

@Component({
  selector: 'user-view',
  templateUrl: './user-view.component.html',
  styleUrls: ['./user-view.component.scss']
})
export class UserViewComponent implements OnInit, OnChanges {
  @Input() user: any
  @Input() event: any

  @Output() close = new EventEmitter<void>()

  accuracy: PointAccuracy
  observationsById = {}
  userObservations = []

  constructor(
    @Inject(MapService) private mapService: any,
    @Inject(EventService) private eventService: any,
    @Inject(FilterService) private filterService: any,
    @Inject(LocationService) private locationService: any) {}

  ngOnInit(): void {
    this.event = this.filterService.getEvent();

    const observationsChangedListener = {
      onObservationsChanged: this.onObservationsChanged.bind(this)
    }
    this.eventService.addObservationsChangedListener(observationsChangedListener)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.user && changes.user.currentValue && changes.user.currentValue.location) {
      this.setAccuracy(changes.user.currentValue.location)
    }
  }

  setAccuracy(location): void {
    const age = Date.now() - moment(location.properties.timestamp).valueOf();
    const bucket = this.locationService.colorBuckets.find(bucket => age > bucket.min && age <= bucket.max)
    const color = bucket ? bucket.color : null;

    this.accuracy = {
      latlng: new LatLng(location.geometry.coordinates[1], location.geometry.coordinates[0]),
      color: color,
      radius: location.properties.accuracy || 0,
      zoomTo: true
    }
  }

  trackObservationById(index: number, observation: any): any {
    return observation.id;
  }

  onClose(): void {
    this.close.emit(this.user)
  }

  onUserLocationClick(): void {
    this.mapService.zoomToFeatureInLayer(this.user, 'People');
  }

  onObservationsChanged(changed): void {
    this.event = this.filterService.getEvent()

    const filter = (observation: any): boolean => { return observation.user.id === this.user.user.id }

    const { added = [], updated = [], removed = [] } = changed
    added.filter(filter).forEach(observation => {
      this.observationsById[observation.id] = observation
    })

    updated.filter(filter).forEach(observation => {
      this.observationsById[observation.id] = observation
    })

    removed.filter(filter).forEach(observation => {
      delete this.observationsById[observation.id]
    })

    this.userObservations = Object.values(this.observationsById)
  }
}
