import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import moment from 'moment';
import { MatRipple, MatRippleModule } from '@angular/material/core';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import { animate, style, transition, trigger } from '@angular/animations';
import { FeedPanelService } from '../../feed-panel/feed-panel.service';
import { MapService } from '../../map/map.service';
import { UserService } from '../../user/user.service';
import { EventService } from '../../event/event.service';
import { LocalStorageService } from '../../http/local-storage.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { GeometryModule } from 'mage-web-app/geometry/geometry.module';
import { MomentModule } from 'mage-web-app/moment/moment.module';
import { AttachmentComponent } from '../attachment/attachment.component';

@Component({
  selector: 'observation-list-item',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatRippleModule,
    MatIconModule,
    MatFormFieldModule,
    MomentModule,
    GeometryModule,
    AttachmentComponent
  ],
  templateUrl: './observation-list-item.component.html',
  styleUrls: ['./observation-list-item.component.scss'],
  animations: [
    trigger('important', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('250ms', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [animate('250ms', style({ height: 0, opacity: 0 }))])
    ])
  ]
})
export class ObservationListItemComponent implements OnChanges {
  @Input() event: any;
  @Input() form: any;
  @Input() observation: any;

  @ViewChild(MatRipple) ripple: MatRipple;

  edit = false;
  canEdit = false;
  canEditImportant = false;

  favorites = 0;
  isUserFavorite = false;

  importantEditor: {
    open: boolean;
    description?: string;
  } = { open: false };

  // TODO: define some types for these
  observationForm: any;
  primaryFeedField: any = {};
  secondaryFeedField: any = {};

  attachments = [];

  constructor(
    private mapService: MapService,
    private userService: UserService,
    private eventService: EventService,
    private localStorageService: LocalStorageService,
    private feedPanelService: FeedPanelService,
    private snackBar: MatSnackBar
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes.event?.currentValue ||
      changes.form?.currentValue ||
      changes.observation?.currentValue
    ) {
      this.updateItem();
    }

    if (changes.observation?.currentValue) {
      this.updateFavorites();
      this.importantEditor.description = this.observation.important
        ? this.observation.important.description
        : null;
    }
  }

  toggleFavorite(): void {
    if (this.isUserFavorite) {
      this.eventService.removeObservationFavorite(this.observation).subscribe({
        next: (observation) => {
          this.observation.favoriteUserIds = observation.favoriteUserIds;
          this.isUserFavorite = false;
          this.updateFavorites();
        },
        error: () => {
          this.snackBar.open(
            'Failed to remove observation from favorites.',
            null,
            { duration: 4000 }
          );
        }
      });
    } else {
      this.eventService.addObservationFavorite(this.observation).subscribe({
        next: (observation) => {
          this.observation.favoriteUserIds = observation.favoriteUserIds;
          this.isUserFavorite = true;
          this.updateFavorites();
        },
        error: () => {
          this.snackBar.open('Failed to add observation to favorites.', null, {
            duration: 4000
          });
        }
      });
    }
  }

  onFlagAsImportant(): void {
    this.importantEditor.open = true;
  }

  markAsImportant(): void {
    this.eventService
      .markObservationAsImportant(this.observation, {
        description: this.importantEditor.description
      })
      .subscribe(() => {
        this.importantEditor.open = false;
      });
  }

  clearImportant(): void {
    this.eventService
      .clearObservationAsImportant(this.observation)
      .subscribe(() => {
        this.importantEditor.open = false;
        delete this.importantEditor.description;
      });
  }

  downloadUrl(): string {
    return `/api/events/${this.observation?.eventId}/observations/${
      this.observation?.id
    }.zip?access_token=${this.localStorageService.getToken()}`;
  }

  onRipple(): void {
    this.ripple.launch({
      centered: true
    });
  }

  viewObservation(): void {
    this.onObservationLocationClick();
    this.feedPanelService.viewObservation(this.observation);
  }

  onObservationLocationClick(): void {
    this.mapService.zoomToFeatureInLayer(this.observation, 'observations');
  }

  updateItem(): void {
    if (!this.observation || !this.event) return;

    this.isUserFavorite =
      this.observation.favoriteUserIds &&
      this.observation.favoriteUserIds.includes(this.userService.myself.id);
    this.canEdit =
      this.userService.hasPermission('UPDATE_OBSERVATION_EVENT') ||
      this.userService.hasPermission('UPDATE_OBSERVATION_ALL');

    const myAccess = this.event.acl[this.userService.myself.id] || {};
    const aclPermissions = myAccess.permissions || [];
    this.canEditImportant =
      this.userService.myself.role.permissions.includes('UPDATE_EVENT') ||
      aclPermissions.includes('update');

    const formMap = this.eventService
      .getFormsForEvent(this.event, {})
      .reduce((map, form) => {
        map[form.id] = form;
        return map;
      }, {});

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
    };

    this.observation.properties.forms.forEach((propertyForm) => {
      const observationForm = this.eventService.createForm(
        propertyForm,
        formMap[propertyForm.formId]
      );
      this.observationForm.forms.push(observationForm);
    });

    this.primaryFeedField = {};
    this.secondaryFeedField = {};

    if (this.observation.properties.forms.length > 0) {
      const firstForm = this.observation.properties.forms[0];
      const observationForm = this.observationForm.forms.find(
        (observationForm) => {
          return observationForm.id === firstForm.formId;
        }
      );

      if (
        observationForm.primaryFeedField &&
        firstForm[observationForm.primaryFeedField]
      ) {
        const field = observationForm.fields.find(
          (field) => field.name === observationForm.primaryFeedField
        );
        this.primaryFeedField = {
          field: field,
          value: firstForm[observationForm.primaryFeedField]
        };
      }

      if (
        observationForm.secondaryFeedField &&
        firstForm[observationForm.secondaryFeedField]
      ) {
        const field = observationForm.fields.find(
          (field) => field.name === observationForm.secondaryFeedField
        );
        this.secondaryFeedField = {
          field: field,
          value: firstForm[observationForm.secondaryFeedField]
        };
      }
    }

    this.isUserFavorite = this.observation.favoriteUserIds.includes(
      this.userService.myself.id
    );

    this.attachments = this.observation.attachments.filter((attachment) => {
      return (
        this.observationForm.forms.find((observationForm) => {
          return observationForm.fields.find((field) => {
            return (
              attachment.observationFormId === observationForm.remoteId &&
              attachment.fieldName === field.name
            );
          });
        }) != null
      );
    });
  }

  updateFavorites(): void {
    this.favorites = this.observation.favoriteUserIds.length;
  }
}
