import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { EventService, FilterService } from 'src/app/upgrade/ajs-upgraded-providers';
import * as moment from 'moment';

@Component({
  selector: 'observation-list',
  templateUrl: './observation-list.component.html',
  styleUrls: ['./observation-list.component.scss']
})
export class ObservationListComponent implements OnInit, OnDestroy {
  loaded = false

  event: any

  observationsById = {}

  currentObservationPage = 0
  observationPages = []
  observationsPerPage = 50

  filter = 'all'

  filterChangedListener: any

  constructor(
    @Inject(EventService) private eventService: any,
    @Inject(FilterService) private filterService: any) {
  }

  ngOnInit(): void {
    this.event = this.filterService.getEvent()
    this.eventService.addObservationsChangedListener(this)
    this.filterService.addListener(this)
  }

  ngOnDestroy(): void {
    this.filterService.removeListener(this)
    this.eventService.removeObservationsChangedListener(this)
  }

  trackByPageId(index: number, page: any): any {
    return index
  }

  trackByObservationId(index: number, observation: any): any {
    return observation.id
  }

  onFilterChanged(): void {
    this.currentObservationPage = 0
  }

  filterChanged(filter): void {
    this.filter = filter;
    this.filterService.setFilter({ actionFilter: filter });
  }

  onObservationsChanged(changed): void {
    this.loaded = true

    this.event = this.filterService.getEvent()

    const { added = [], updated = [], removed = [] } = changed
    added.forEach(observation => {
      this.observationsById[observation.id] = observation
    })

    updated.forEach(observation => {
      this.observationsById[observation.id] = observation
    })

    removed.forEach(observation => {
      delete this.observationsById[observation.id]
    })

    this.calculateObservationPages(Object.values(this.observationsById))
  }

  calculateObservationPages(observations: any[]): void {
    if (!observations) return;

    // Sort the observations
    observations.sort((a, b) => {
      return moment(b.properties.timestamp).valueOf() - moment(a.properties.timestamp).valueOf()
    })

    // Slice into pages
    const pages = []
    for (let i = 0, j = observations.length; i < j; i += this.observationsPerPage) {
      pages.push(observations.slice(i, i + this.observationsPerPage))
    }

    this.observationPages = pages

    // If a new page showed up that wasn't there before, switch to it
    if (this.currentObservationPage === -1 && pages.length) {
      this.currentObservationPage = 0
    }

    // ensure the page that they were on did not go away
    this.currentObservationPage = Math.min(this.currentObservationPage, pages.length - 1)
  }
}
