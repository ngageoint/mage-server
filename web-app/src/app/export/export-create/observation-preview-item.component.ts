import { Component, computed, input } from '@angular/core'
import { EventService } from '../../event/event.service'
import { Observation } from '../../entities/observation/entities.observation'
import { MageEvent, Form, FormField } from '../../entities/event/entities.event'
import { GeometryModule } from '../../geometry/geometry.module'
import { MomentModule } from '../../moment/moment.module'

type ObservationForm = Form & { remoteId: string }

interface FeedField {
  field?: FormField
  value?: any
}

@Component({
  selector: 'observation-preview-item',
  templateUrl: './observation-preview-item.component.html',
  styleUrls: ['./observation-preview-item.component.scss'],
  standalone: true,
  imports: [GeometryModule, MomentModule]
})
export class ObservationPreviewItemComponent {
  event = input<MageEvent>()
  observation = input<Observation>()

  private observationForms = computed<ObservationForm[]>(() => this.buildObservationForms())

  primaryFeedField = computed<FeedField>(() => this.computeFeedField('primaryFeedField'))
  secondaryFeedField = computed<FeedField>(() => this.computeFeedField('secondaryFeedField'))

  constructor(private eventService: EventService) { }

  private buildObservationForms(): ObservationForm[] {
    const event = this.event()
    const observation = this.observation()
    if (!observation || !event) return []

    const formMap = this.eventService.getFormsForEvent(event, {}).reduce((map, form) => {
      map[form.id] = form
      return map
    }, {} as Record<number, Form>)

    return observation.properties.forms.map(propertyForm => this.eventService.createForm(propertyForm, formMap[propertyForm.formId])) as ObservationForm[]
  }

  private computeFeedField(key: 'primaryFeedField' | 'secondaryFeedField'): FeedField {
    const observation = this.observation()
    const propertyForms = observation?.properties?.forms
    if (!propertyForms?.length) return {}

    const firstPropertyForm = propertyForms[0]
    const observationForm = this.observationForms().find(form => form.id === firstPropertyForm.formId)
    const fieldName = observationForm?.[key]
    if (!fieldName || !firstPropertyForm[fieldName]) return {}

    const field = observationForm.fields.find(field => field.name === fieldName)
    return { field, value: firstPropertyForm[fieldName] }
  }
}
