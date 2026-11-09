import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal, linkedSignal } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ObservationFavoritesComponent } from '../observation-favorites/observation-favorites.component';
import { SidebarService } from '../../sidebar/sidebar.service';
import moment from 'moment';
import { ObservationOption, ObservationOptionsComponent } from './observation-options.component';
import { ObservationDeleteComponent } from '../observation-delete/observation-delete.component';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MapService } from '../../map/map.service';
import { EventService } from '../../event/event.service';
import { Form } from '../../entities/event/entities.event';
import { FormProperties, Observation } from '../../entities/observation/entities.observation';
import { SessionService } from 'mage-web-app/http/session.service';
import { GeometryModule } from '../../geometry/geometry.module';
import { MomentModule } from '../../moment/moment.module';
import { MapClipComponent } from '../../map/clip/clip.component';
import { ObservationViewFormComponent } from './observation-view-form.component';

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
    imports: [
        DecimalPipe,
        FormsModule,
        MatButtonModule,
        MatCardModule,
        MatDividerModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatToolbarModule,
        MatTooltipModule,
        GeometryModule,
        MomentModule,
        MapClipComponent,
        ObservationViewFormComponent
    ]
})
export class ObservationViewComponent {
  private dialog = inject(MatDialog)
  private bottomSheet = inject(MatBottomSheet)
  private mapService = inject(MapService)
  private eventService = inject(EventService)
  private sessionService = inject(SessionService)
  private sidebarService = inject(SidebarService)

  event = input<any>()
  observation = input<any>()

  closed = output<void>()
  delete = output<any>()

  isUserFavorite = linkedSignal(() => Boolean(this.observation()?.favoriteUserIds?.includes(this.sessionService.user.id)))
  importantEditorOpen = signal(false)
  importantEditorDescription = linkedSignal<string | undefined>(() => this.observation()?.important?.description)

  canEdit = computed(() => {
    if (!this.observation() || !this.event()) return false
    return this.sessionService.hasPermission('UPDATE_OBSERVATION_EVENT') || this.sessionService.hasPermission('UPDATE_OBSERVATION_ALL')
  })

  canEditImportant = computed(() => {
    const event = this.event()
    if (!this.observation() || !event) return false

    const myAccess = event.acl[this.sessionService.user.id] || {}
    const aclPermissions = myAccess.permissions || []
    return this.sessionService.user.role.permissions.includes('UPDATE_EVENT') || aclPermissions.includes('update')
  })

  observationForm = computed<{
    geometryField: { title: string, type: string, value: Observation['geometry'] },
    timestampField: { title: string, type: string, value: Date },
    forms: Form[]
  } | undefined>(() => {
    const event = this.event()
    const observation = this.observation()
    if (!observation || !event) return undefined

    const formMap = this.eventService.getFormsForEvent(event, {}).reduce<Record<number, Form>>((map, form) => {
      map[form.id] = form
      return map
    }, {})

    const forms: Form[] = observation.properties.forms.map((propertyForm: FormProperties) => {
      return this.eventService.createForm(propertyForm, formMap[propertyForm.formId])
    })

    return {
      geometryField: {
        title: 'Location',
        type: 'geometry',
        value: observation.geometry
      },
      timestampField: {
        title: '',
        type: 'date',
        value: moment(observation.properties.timestamp).toDate()
      },
      forms
    }
  })

  primaryFeedField = computed(() => this.feedField('primaryFeedField'))
  secondaryFeedField = computed(() => this.feedField('secondaryFeedField'))

  onClose(): void {
    this.closed.emit()
  }

  toggleFavorite(): void {
    if (this.isUserFavorite()) {
      this.eventService.removeObservationFavorite(this.observation()).subscribe(observation => {
        this.observation().favoriteUserIds = observation.favoriteUserIds
        this.isUserFavorite.set(false)
      });
    } else {
      this.eventService.addObservationFavorite(this.observation()).subscribe(observation => {
        this.observation().favoriteUserIds = observation.favoriteUserIds
        this.isUserFavorite.set(true)
      })
    }
  }

  showFavoriteUsers(): void {
    this.dialog.open(ObservationFavoritesComponent, {
      width: '500px',
      data: {
        event: this.event(),
        form: this.observationForm(),
        userIds: this.observation().favoriteUserIds || []
      },
      autoFocus: false
    })
  }

  onFlagAsImportant(): void {
    this.importantEditorOpen.set(true)
  }

  markAsImportant(): void {
    this.eventService.markObservationAsImportant(this.observation(), { description: this.importantEditorDescription() }).subscribe(observation => {
      this.observation().important = observation.important
      this.importantEditorOpen.set(false)
    })
  }

  clearImportant(): void {
    this.eventService.clearObservationAsImportant(this.observation()).subscribe(observation => {
      this.observation().important = observation.important
      this.importantEditorOpen.set(false)
      this.importantEditorDescription.set(undefined)
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
    this.sidebarService.edit(this.observation())
  }

  downloadObservation(): void {
    window.location.href = `/api/events/${this.observation().eventId}/observations/${this.observation().id}.zip?access_token=${this.sessionService.getToken()}`;
  }

  checkDelete(): void {
    this.dialog.open(ObservationDeleteComponent, {
      width: '500px',
      data: this.observation(),
      autoFocus: false
    }).afterClosed().subscribe(result => {
      if (result === 'delete') {
        this.delete.emit({
          observation: this.observation()
        })
      }
    })
  }

  onObservationLocationClick(): void {
    this.mapService.zoomToFeatureInLayer(this.observation(), 'observations');
  }

  private feedField(key: 'primaryFeedField' | 'secondaryFeedField'): { field: any, value: any } | undefined {
    const observation = this.observation()
    const forms = this.observationForm()?.forms
    if (!observation || !forms || observation.properties.forms.length === 0) return undefined

    const firstForm = observation.properties.forms[0]
    const observationForm = forms.find(form => form.id === firstForm.formId)

    if (observationForm?.[key] && firstForm[observationForm[key]]) {
      const field = observationForm.fields.find(field => field.name === observationForm[key])
      return {
        field: field,
        value: firstForm[observationForm[key]]
      }
    }
    return undefined
  }
}
