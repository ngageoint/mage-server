import { animate, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, Inject, Input, OnChanges, OnInit, Output, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTabGroup } from '@angular/material/tabs';
import * as moment from 'moment';
import { EventService, FilterService, MapService, UserService } from '../upgrade/ajs-upgraded-providers';
import { FeedAction, FeedPanelService } from './feed-panel.service';
import { FeedService } from '@ngageoint/mage.web-core-lib/feed';

@Component({
  selector: 'feed-panel',
  templateUrl: './feed-panel.component.html',
  styleUrls: ['./feed-panel.component.scss'],
  animations: [
    trigger('slide', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('150ms', style({ transform: 'translateX(0%)' })),
      ]),
      transition(':leave', [
        animate('250ms', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class FeedPanelComponent implements OnInit, OnChanges {
  @Input() event: any
  @Input() observationLocation: any
  @Input() observationsChanged: any

  @Output() toggle = new EventEmitter<any>()

  @ViewChild('tabGroup') tabGroup: MatTabGroup
  @ViewChild('permissionDialog') permissionDialog: TemplateRef<any>

  defaultTabs = [{
    id: 'observations',
    title: 'Observations',
    icon: 'place'
  }, {
    id: 'people',
    title: 'People',
    icon: 'people'
  }]
  tabs = this.defaultTabs.slice()

  currentTab: any

  feedItem: any

  edit = false
  editForm: any
  newObservation: any

  firstObservationChange = true
  observationBadge: number = null

  viewObservation: any
  editObservation: any

  viewUser: any

  contactOpen: any;
  info = {};
  statusTitle = 'Cannot Create Observation';
  statusMessage = 'You are not part of this event.';

  constructor(
    public dialog: MatDialog,
    private feedService: FeedService,
    private feedPanelService: FeedPanelService,
    @Inject(MapService) private mapService: any,
    @Inject(UserService) private userService: any,
    @Inject(FilterService) private filterService: any,
    @Inject(EventService) private eventService: any) { }

  ngOnInit(): void {
    this.currentTab = this.tabs[0]

    this.eventService.addObservationsChangedListener(this)
    this.feedService.feeds.subscribe(feeds => this.onFeedsChanged(feeds));
    this.feedPanelService.item$.subscribe(event => this.onFeedItemEvent(event));

    this.feedPanelService.viewUser$.subscribe(event => {
      this.viewUser = event.user
      this.newObservation = null
      this.editObservation = null
      this.viewObservation = null
      this.feedItem = null

      this.toggle.emit({
        hidden: false
      })
    })

    this.feedPanelService.viewObservation$.subscribe(event => {
      this.viewObservation = event.observation;
      this.newObservation = null
      this.editObservation = null
      this.viewUser = null
      this.feedItem = null

      this.toggle.emit({
        hidden: false
      })
    })

    this.feedPanelService.editObservation$.subscribe(event => {
      this.edit = true;

      const observation = event.observation;
      const formMap = this.eventService.getForms(observation).reduce((map, form) => {
        map[form.id] = form
        return map
      }, {})

      const form = {
        geometryField: {
          title: 'Location',
          type: 'geometry',
          name: 'geometry',
          value: observation.geometry,
          required: true
        },
        timestampField: {
          title: '',
          type: 'date',
          name: 'timestamp',
          value: moment(observation.properties.timestamp).toDate(),
          required: true
        },
        forms: []
      }

      observation.properties.forms.forEach(propertyForm => {
        const observationForm = this.eventService.createForm(propertyForm, formMap[propertyForm.formId])
        form.forms.push(observationForm)
      })

      this.editForm = form
      this.editObservation = observation
    })
  }

  ngOnDestroy(): void {
    this.eventService.removeObservationsChangedListener(this)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.event && changes.event.currentValue) {
      this.newObservation = null
      this.editObservation = null
      this.viewObservation = null
      this.viewUser = null
      this.feedItem = null
      this.observationBadge = null
    }

    if (changes.observationLocation && changes.observationLocation.currentValue) {
      // Don't allow new observation if observation create is in progress
      if (this.newObservation) return

      this.createNewObservation(changes.observationLocation.currentValue)
    }
  }

  onTabSwitched(tab): void {
    this.currentTab = tab;

    this.newObservation = null;
    this.editObservation = null;
    this.viewObservation = null;
    this.viewUser = null;
    this.feedItem = null;
  }

  onObservationsChanged(changed): void {
    if (!this.firstObservationChange && this.currentTab.id !== 'observations') {
      if (changed.added && changed.added.length) this.observationBadge += changed.added.length
      if (changed.updated && changed.updated.length) this.observationBadge += changed.updated.length
    }

    this.firstObservationChange = false
  }

  createNewObservation(location: any): void {
    const event = this.filterService.getEvent()
    if (!this.eventService.isUserInEvent(this.userService.myself, event)) {
      this.info = {
        statusTitle: this.statusTitle,
        statusMessage: this.statusMessage,
        id: this.userService.myself.username
      };
      this.contactOpen = { opened: true };

      return
    }

    const observation = {
      id: 'new',
      eventId: event.id,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [location.latLng.lng, location.latLng.lat]
      },
      properties: {
        timestamp: new Date(),
        forms: []
      }
    }

    this.eventService.getFormsForEvent(event, { archived: false }).forEach(form => {
      for (let i = 0; i < form.min || 0; i++) {
        observation.properties.forms.push({ formId: form.id })
      }

      if (form.default && !form.min) {
        observation.properties.forms.push({ formId: form.id })
      }
    })

    this.newObservation = observation
  }

  cancelNewObservation(): void {
    delete this.newObservation
  }

  onUserViewClose(): void {
    this.mapService.deselectFeatureInLayer(this.viewUser, 'people');
    this.viewUser = null;
  }

  onObservationViewClose(): void {
    this.mapService.deselectFeatureInLayer(this.viewObservation, 'observations');
    this.viewObservation = null;
  }

  onObservationEditClose(observation?: any): void {
    this.newObservation = null;
    this.editObservation = null;

    if (observation && this.viewObservation && this.viewObservation.id === observation.id) {
      this.viewObservation = observation
    }
  }

  onObservationDelete(event): void {
    this.newObservation = null;
    this.editObservation = null;
    this.viewObservation = null;
    this.mapService.removeFeatureFromLayer(event.observation, 'observations');
  }

  tabChanged(event: number): void {
    if (event === 0) {
      this.observationBadge = null
    }
  }

  onContactClose(): void {
    this.contactOpen = { opened: false };
  }

  onFeedsChanged(feeds): void {
    this.tabs = this.defaultTabs.concat(feeds.map(feed => {
      const style = feed.mapStyle || {}
      return {
        id: `feed-${feed.id}`,
        title: feed.title,
        iconUrl: style.iconUrl,
        feed: feed
      }
    }))
  }

  onFeedItemEvent(event): void {
    if (event.action == FeedAction.Select) {
      this.feedItem = {
        feed: event.feed,
        item: event.item
      };
    } else {
      this.feedItem = null;
    }
  }
}
