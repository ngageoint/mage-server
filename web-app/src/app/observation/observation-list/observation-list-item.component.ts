import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core'
import moment from 'moment';
import { MatRipple } from '@angular/material/core';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import { animate, style, transition, trigger } from '@angular/animations'
import { SidebarService } from '../../sidebar/sidebar.service'
import { MapService } from '../../map/map.service';
import { EventService } from '../../event/event.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { AttachmentProcessingStatus } from '../../filter/filter.types';

@Component({
    selector: 'observation-list-item',
    templateUrl: './observation-list-item.component.html',
    styleUrls: ['./observation-list-item.component.scss'],
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
export class ObservationListItemComponent implements OnChanges {
  @Input() event: any
  @Input() form: any
  @Input() observation: any

  @ViewChild(MatRipple) ripple: MatRipple

  edit = false
  canEdit = false
  canEditImportant = false

  favorites = 0
  isUserFavorite = false

  importantEditor: {
    open: boolean,
    description?: string
  } = { open: false }

  // TODO: define some types for these
  observationForm: any
  primaryFeedField: any = {}
  secondaryFeedField: any = {}

  attachments = []

  constructor(
    private mapService: MapService,
    private sessionService: SessionService,
    private eventService: EventService,
    private sidebarService: SidebarService,
    private snackBar: MatSnackBar) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.event?.currentValue || changes.form?.currentValue || changes.observation?.currentValue) {
      this.updateItem()
    }

    if (changes.observation?.currentValue) {
      this.updateFavorites()
      this.importantEditor.description = this.observation.important ? this.observation.important.description : null
    }
  }

  toggleFavorite(): void {
    if (this.isUserFavorite) {
      this.eventService.removeObservationFavorite(this.observation).subscribe({
        next: observation => {
          this.observation.favoriteUserIds = observation.favoriteUserIds
          this.isUserFavorite = false
          this.updateFavorites()
        },
        error: () => {
          this.snackBar.open('Failed to remove observation from favorites.', null, { duration: 4000 })
        }
      })
    } else {
      this.eventService.addObservationFavorite(this.observation).subscribe({
        next: observation => {
          this.observation.favoriteUserIds = observation.favoriteUserIds
          this.isUserFavorite = true
          this.updateFavorites()
        },
        error: () => {
          this.snackBar.open('Failed to add observation to favorites.', null, { duration: 4000 })
        }
      })
    }
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

  downloadUrl(): string {
    return `/api/events/${this.observation?.eventId}/observations/${this.observation?.id}.zip?access_token=${this.sessionService.getToken()}`
  }

  onRipple(): void {
    this.ripple.launch({
      centered: true
    })
  }

  viewObservation(): void {
    this.onObservationLocationClick()
    this.sidebarService.viewObservation(this.observation)
  }

  onObservationLocationClick(): void {
    this.mapService.zoomToFeatureInLayer(this.observation, 'observations')
  }

  updateItem(): void {
    if (!this.observation || !this.event) return

    this.isUserFavorite = this.observation.favoriteUserIds && this.observation.favoriteUserIds.includes(this.sessionService.user.id)
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
        value: moment(this.observation?.properties?.timestamp).toDate()
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

    this.attachments = this.observation.attachments.filter(attachment => {
      return this.observationForm.forms.find(observationForm => {
        return observationForm.fields.find(field => {
          return attachment.observationFormId === observationForm.remoteId && attachment.fieldName === field.name
        })
      }) != null
    })

  }

  updateFavorites(): void {
    this.favorites = this.observation.favoriteUserIds.length
  }

  hasFailedAttachment(): boolean {
    return this.attachments.some(attachment => attachment.processingStatus === AttachmentProcessingStatus.Rejected || attachment.processingStatus === AttachmentProcessingStatus.Error)
  }
}
