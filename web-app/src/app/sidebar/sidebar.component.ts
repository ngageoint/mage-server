import { animate, style, transition, trigger } from '@angular/animations';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { MatTabGroup as MatTabGroup } from '@angular/material/tabs';
import { filter, pairwise } from 'rxjs/operators';
import moment from 'moment';
import { FeedAction, FeedItemEvent, SidebarService } from './sidebar.service';
import { FeedTab } from './sidebar-tab.component';
import { MapService } from '../map/map.service';
import { FilterService } from '../filter/filter.service';
import { EventService } from '../event/event.service';
import { ContactDialogComponent } from '../contact/contact-dialog.component';
import { Feed, FeedService } from '@ngageoint/mage.web-core-lib/feed';
import { SessionService } from 'mage-web-app/http/session.service';
import { ExportService } from '../export/export.service';
import { Export } from '../export/entities.export';
import { Form } from '../entities/event/entities.event';
import { FormProperties, Observation } from '../entities/observation/entities.observation';
import { UserWithLocation } from '../entities/user/entities.user-location';

@Component({
    selector: 'sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
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
    ],
    standalone: false
})
export class SidebarComponent implements OnInit, OnChanges {
  @Input() event: any
  @Input() observationLocation: any
  @Input() observationsChanged: any

  @Output() toggle = new EventEmitter<any>()

  @ViewChild('tabGroup') tabGroup: MatTabGroup
  @ViewChild('permissionDialog') permissionDialog: TemplateRef<any>

  defaultTabs: FeedTab[] = [{
    id: 'observations',
    title: 'Observations',
    icon: { name: 'place' }
  }, {
    id: 'people',
    title: 'People',
    icon: { name: 'people' }
  }]
  tabs: FeedTab[] = this.defaultTabs.slice()

  exportTab: FeedTab = {
    id: 'export',
    title: 'Export',
    icon: { name: 'archive' }
  }

  currentTab: any

  feedItem: any

  edit = false
  editForm: any
  newObservation: any

  observationBadge: number | null = null

  viewObservation: Observation | null = null
  editObservation: Observation | null = null

  viewUser: UserWithLocation | null = null

  viewExport: any

  contactOpen: any;
  info = {};
  statusTitle = 'Cannot Create Observation';
  statusMessage = 'You are not part of this event.';

  constructor(
    public dialog: MatDialog,
    private feedService: FeedService,
    private sidebarService: SidebarService,
    private mapService: MapService,
    private sessionService: SessionService,
    private filterService: FilterService,
    private eventService: EventService,
    private exportService: ExportService,
    private destroyRef: DestroyRef) { }

  ngOnInit(): void {
    this.currentTab = this.tabs[0]

    this.exportService.exports$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (exports: Export[]) => {
        this.exportTab.count = exports.length
      }
    })
    this.exportService.fetchExports().subscribe()

    this.eventService.mapObservations$.pipe(
      filter(obs => obs !== null),
      pairwise(),
      filter(([prev]) => prev.length > 0),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(([prev, curr]) => {
      if (this.currentTab.id === 'observations') return
      const prevIds = new Set(prev.map((o: any) => o.id))
      const newCount = curr.filter((o: any) => !prevIds.has(o.id)).length
      if (newCount > 0) this.observationBadge = (this.observationBadge ?? 0) + newCount
    })
    this.feedService.feeds$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(feeds => this.onFeedsChanged(feeds));
    this.sidebarService.item$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => this.onFeedItemEvent(event));

    this.sidebarService.viewUser$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      this.viewUser = event.user
      this.newObservation = null
      this.editObservation = null
      this.viewObservation = null
      this.feedItem = null
      this.viewExport = null

      this.toggle.emit({
        hidden: false
      })
    })

    this.sidebarService.viewObservation$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      this.viewObservation = event.observation;
      this.newObservation = null
      this.editObservation = null
      this.viewUser = null
      this.feedItem = null
      this.viewExport = null

      this.toggle.emit({
        hidden: false
      })
    })

    this.sidebarService.editObservation$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      this.edit = true;

      const observation = event.observation;
      const formMap = this.eventService.getForms(observation).reduce<Record<number, Form>>((map, form) => {
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
        forms: [] as Form[]
      }

      observation.properties.forms.forEach(propertyForm => {
        const observationForm = this.eventService.createForm(propertyForm, formMap[propertyForm.formId])
        form.forms.push(observationForm)
      })

      this.editForm = form
      this.editObservation = observation
    })

    this.sidebarService.viewExport$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe($event => {
      this.viewExport = $event.item
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.event && changes.event.currentValue) {
      this.newObservation = null
      this.editObservation = null
      this.viewObservation = null
      this.viewUser = null
      this.feedItem = null
      this.viewExport = null
      this.observationBadge = null
    }

    if (changes.observationLocation && changes.observationLocation.currentValue) {
      // Don't allow new observation if observation create is in progress
      if (this.newObservation) return

      this.createNewObservation(changes.observationLocation.currentValue)
    }
  }

  onTabSwitched(tab: FeedTab): void {
    this.currentTab = tab;

    this.newObservation = null;
    this.editObservation = null;
    this.viewObservation = null;
    this.viewUser = null;
    this.feedItem = null;
    this.viewExport = null;
  }


  createNewObservation(location: any): void {
    const event = this.filterService.getEvent()
    if (!event || !this.eventService.isUserInEvent(this.sessionService.user, event)) {
      this.dialog.open(ContactDialogComponent, {
        width: '500px',
        data: {
          info: {
            statusTitle: this.statusTitle,
            statusMessage: this.statusMessage,
            id: this.sessionService.user.username
          }
        }
      })

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
        forms: [] as Pick<FormProperties, 'formId'>[]
      }
    }

    this.eventService.getFormsForEvent(event, { archived: false }).forEach(form => {
      for (let i = 0; i < (form.min ?? 0); i++) {
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
    if (this.viewUser) this.mapService.deselectFeatureInLayer(this.viewUser, 'people');
    this.viewUser = null;
  }

  onObservationViewClose(): void {
    if (this.viewObservation) this.mapService.deselectFeatureInLayer(this.viewObservation, 'observations');
    this.viewObservation = null;
  }

  onObservationEditClose(observation?: any): void {
    this.newObservation = null;
    this.editObservation = null;

    if (observation && this.viewObservation && this.viewObservation.id === observation.id) {
      this.viewObservation = observation
    }
  }

  onObservationDelete(event: { observation: Observation }): void {
    this.newObservation = null;
    this.editObservation = null;
    this.viewObservation = null;
    this.mapService.removeFeatureFromLayer(event.observation, 'observations');
  }

  onExportViewClose(): void {
    this.viewExport = null;
  }

  tabChanged(event: number): void {
    if (event === 0) {
      this.observationBadge = null
    }
  }

  onContactClose(): void {
    this.contactOpen = { opened: false };
  }

  onFeedsChanged(feeds: Feed[]): void {
    this.tabs = this.defaultTabs.concat(feeds.map(feed => {
      return {
        id: `feed-${feed.id}`,
        title: feed.title,
        feed: feed,
        icon: feed.icon
      }
    }))
  }

  onFeedItemEvent(event: FeedItemEvent): void {
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
