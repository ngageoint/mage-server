import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { EventService, FilterService, MapService } from 'src/app/upgrade/ajs-upgraded-providers';

@Component({
  selector: 'user-view',
  templateUrl: './user-view.component.html',
  styleUrls: ['./user-view.component.scss']
})
export class UserViewComponent implements OnInit {
  @Input() user: any
  @Input() event: any

  @Output() close = new EventEmitter<void>()

  observationsById = {}
  userObservations = []

  constructor(
    @Inject(MapService) private mapService: any,
    @Inject(EventService) private eventService: any,
    @Inject(FilterService) private filterService: any) {}

  ngOnInit(): void {
    this.event = this.filterService.getEvent();

    const observationsChangedListener = {
      onObservationsChanged: this.onObservationsChanged.bind(this)
    }
    this.eventService.addObservationsChangedListener(observationsChangedListener)
  }

  trackObservationById(index: number, observation: any): any {
    return observation.id;
  }

  onClose(): void {
    this.close.emit(this.user)
  }

  onUserLocationClick(user: any): void {
    this.mapService.zoomToFeatureInLayer(user, 'People');
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
