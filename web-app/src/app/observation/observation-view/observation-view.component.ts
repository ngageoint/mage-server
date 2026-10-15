import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { ObservationFavoritesComponent } from '../observation-favorites/observation-favorites.component';
import { SidebarService } from '../../sidebar/sidebar.service';
import moment from 'moment';
import { ObservationOption, ObservationOptionsComponent } from './observation-options.component';
import { ObservationDeleteComponent } from '../observation-delete/observation-delete.component';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MapService } from '../../map/map.service';
import { EventService } from '../../event/event.service';
import { SessionService } from 'mage-web-app/http/session.service';

@Component({
    selector: 'observation-view',
    templateUrl: './observation-view.component.html',
    styleUrls: ['./observation-view.component.scss'],
    animations: [
        trigger('important', [
            transition(':enter', [
                style({ height: 0, opacity: 0 }),
                animate('250ms', style({ height: '*', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('250ms', style({ height: 0, opacity: 0 }))
            ])
        ])
    ],
    standalone: false
})
export class ObservationViewComponent implements OnChanges {
  @Input() event: any
  @Input() observation: any

  @Output() close = new EventEmitter<void>()
  @Output() delete = new EventEmitter<any>()

  edit = false
  canEdit = false
  canEditImportant = false

  favorites = 0
  isUserFavorite = false

  importantEditor: {
    open: boolean,
    description?: string
  } = { open: false }

  observationForm: any
  primaryFeedField: any = {}
  secondaryFeedField: any = {}

  constructor(
    private dialog: MatDialog,
    private bottomSheet: MatBottomSheet,
    private mapService: MapService,
    private eventService: EventService,
    private sessionService: SessionService,
    private sidebarService: SidebarService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    // TODO why did this not change after edit?
    if (changes.event || changes.observation) {
      this.updateObservation()
    }

    if (changes.observation) {
      this.updateFavorites()
      this.importantEditor.description = this.observation.important ? this.observation.important.description : null
    }
  }

  onClose(): void {
    this.close.emit()
  }

  toggleFavorite(): void {
    if (this.isUserFavorite) {
      this.eventService.removeObservationFavorite(this.observation).subscribe(observation => {
        this.observation.favoriteUserIds = observation.favoriteUserIds
        this.isUserFavorite = false
      });
    } else {
      this.eventService.addObservationFavorite(this.observation).subscribe(observation => {
        this.observation.favoriteUserIds = observation.favoriteUserIds
        this.isUserFavorite = true
      })
    }
  }

  showFavoriteUsers(): void {
    this.dialog.open(ObservationFavoritesComponent, {
      width: '500px',
      data: {
        event: this.event,
        form: this.observationForm,
        userIds: this.observation.favoriteUserIds || []
      },
      autoFocus: false
    })
  }

  onFlagAsImportant(): void {
    this.importantEditor.open = true
  }

  markAsImportant(): void {
    this.eventService.markObservationAsImportant(this.observation, { description: this.importantEditor.description }).subscribe(() => {
      this.importantEditor.open = false
    })
  }

  clearImportant(): void {
    this.eventService.clearObservationAsImportant(this.observation).subscribe(() => {
      this.importantEditor.open = false
      delete this.importantEditor.description
    })
  }

  onOptions(): void {
    this.bottomSheet.open(ObservationOptionsComponent, {
      panelClass: 'sidebar',
      autoFocus: false
    }).afterDismissed().subscribe((option: ObservationOption) => {
      switch(option) {
        case ObservationOption.DOWNLOAD:
          this.downloadObservation()
          break;
        case ObservationOption.DELETE:
          this.checkDelete()
          break;
      }
    })
  }

  editObservation(): void {
    this.onObservationLocationClick();
    this.sidebarService.edit(this.observation)
  }

  downloadObservation(): void {
    window.location.href = `/api/events/${this.observation.eventId}/observations/${this.observation.id}.zip?access_token=${this.sessionService.getToken()}`;
  }

  checkDelete(): void {
    this.dialog.open(ObservationDeleteComponent, {
      width: '500px',
      data: this.observation,
      autoFocus: false
    }).afterClosed().subscribe(result => {
      if (result === 'delete') {
        this.delete.emit({
          observation: this.observation
        })
      }
    })
  }

  onObservationLocationClick(): void {
    this.mapService.zoomToFeatureInLayer(this.observation, 'observations');
  }

  updateObservation(): void {
    if (!this.observation || !this.event) return;

    this.isUserFavorite = this.observation.favoriteUserIds.includes(this.sessionService.user.id)
    this.canEdit = this.sessionService.hasPermission('UPDATE_OBSERVATION_EVENT') || this.sessionService.hasPermission('UPDATE_OBSERVATION_ALL')

    const myAccess = this.event.acl[this.sessionService.user.id] || {}
    const aclPermissions = myAccess.permissions || []
    this.canEditImportant = this.sessionService.user.role.permissions.includes('UPDATE_EVENT') || aclPermissions.includes('update')

    const formMap = this.eventService.getFormsForEvent(this.event, {}).reduce((map, form) => {
      map[form.id] = form
      return map
    }, {})

    this.observationForm = {
      geometryField: {
        title: 'Location',
        type: 'geometry',
        value: this.observation.geometry
      },
      timestampField: {
        title: '',
        type: 'date',
        value: moment(this.observation.properties.timestamp).toDate()
      },
      forms: []
    }

    this.observation.properties.forms.forEach(propertyForm => {
      const observationForm = this.eventService.createForm(propertyForm, formMap[propertyForm.formId])
      this.observationForm.forms.push(observationForm)
    })

    this.primaryFeedField = {}
    this.secondaryFeedField = {}

    if (this.observation.properties.forms.length > 0) {
      const firstForm = this.observation.properties.forms[0]
      const observationForm = this.observationForm.forms.find(observationForm => {
        return observationForm.id === firstForm.formId
      })

      if (observationForm.primaryFeedField && firstForm[observationForm.primaryFeedField]) {
        const field = observationForm.fields.find(field => field.name === observationForm.primaryFeedField)
        this.primaryFeedField = {
          field: field,
          value: firstForm[observationForm.primaryFeedField]
        }
      }

      if (observationForm.secondaryFeedField && firstForm[observationForm.secondaryFeedField]) {
        const field = observationForm.fields.find(field => field.name === observationForm.secondaryFeedField)
        this.secondaryFeedField = {
          field: field,
          value: firstForm[observationForm.secondaryFeedField]
        }
      }
    }

    this.isUserFavorite = this.observation.favoriteUserIds.includes(this.sessionService.user.id)
  }

  updateFavorites(): void {
    this.favorites = this.observation.favoriteUserIds.length
  }
}
