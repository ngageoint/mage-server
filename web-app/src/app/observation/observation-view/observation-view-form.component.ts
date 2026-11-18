import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, computed, input, linkedSignal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { GeometryModule } from '../../geometry/geometry.module';
import { activeFormFields, FormField } from '../../entities/event/entities.event';
import { ObservationViewAttachmentComponent } from './observation-view-attachment/observation-view-attachment.component';
import { ObservationViewCheckboxComponent } from './observation-view-checkbox/observation-view-checkbox.component';
import { ObservationViewDateComponent } from './observation-view-date/observation-view-date.component';
import { ObservationViewGeometryComponent } from './observation-view-geometry/observation-view-geometry.component';
import { ObservationViewMultiselectdropdownComponent } from './observation-view-multiselectdropdown/observation-view-multiselectdropdown.component';
import { ObservationViewPasswordComponent } from './observation-view-password/observation-view-password.component';
import { ObservationViewTextComponent } from './observation-view-text/observation-view-text.component';
import { ObservationViewTextareaComponent } from './observation-view-textarea/observation-view-textarea.component';

@Component({
    selector: 'observation-view-form',
    templateUrl: './observation-view-form.component.html',
    styleUrls: ['./observation-view-form.component.scss'],
    animations: [
        trigger('expand', [
            transition(':enter', [
                style({ height: 0, opacity: 0 }),
                animate('300ms', style({ height: '*', opacity: 1 })),
            ]),
            transition(':leave', [
                animate('300ms', style({ height: 0, opacity: 0 }))
            ])
        ]),
        trigger('rotate', [
            state('true', style({ transform: 'rotate(180deg)' })),
            state('false', style({ transform: 'rotate(0)' })),
            transition('* <=> *', animate('300ms ease-out'))
        ])
    ],
    imports: [
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        GeometryModule,
        ObservationViewAttachmentComponent,
        ObservationViewCheckboxComponent,
        ObservationViewDateComponent,
        ObservationViewGeometryComponent,
        ObservationViewMultiselectdropdownComponent,
        ObservationViewPasswordComponent,
        ObservationViewTextComponent,
        ObservationViewTextareaComponent
    ]
})
export class ObservationViewFormComponent {
  form = input<any>()
  attachments = input<any[]>([])
  geometryStyle = input<any>()

  expand = input(false)
  isExpanded = linkedSignal(() => this.expand())

  primaryField = computed(() => {
    const form = this.form()
    if (!form?.primaryFeedField) return undefined
    return form.fields.find(field => field.name === form.primaryFeedField)
  })

  secondaryField = computed(() => {
    const form = this.form()
    if (!form?.secondaryFeedField) return undefined
    return form.fields.find(field => field.name === form.secondaryFeedField)
  })

  toggleExpand(): void {
    this.isExpanded.update(expanded => !expanded)
  }

  nonArchivedFields(fields: FormField[] | undefined): FormField[] {
    return activeFormFields(fields);
  }

  hasContent(): boolean {
    const form = this.form()
    return activeFormFields(form?.fields)
      .some(field => {
        if (field.type === 'attachment') {
          return this.attachments().filter(attachment => attachment.observationFormId === form?.remoteId).length
        } else {
          return field.value
        }
      })
  }
}
