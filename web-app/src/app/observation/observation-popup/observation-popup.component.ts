import { Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GeometryModule } from '../../geometry/geometry.module';
import { MomentModule } from '../../moment/moment.module';
import { SidebarService } from '../../sidebar/sidebar.service';
import { MapService } from '../../map/map.service';
import { EventService } from '../../event/event.service';

@Component({
    selector: 'observation-map-popup',
    templateUrl: './observation-popup.component.html',
    styleUrls: ['./observation-popup.component.scss'],
    imports: [MatButtonModule, MatIconModule, GeometryModule, MomentModule]
})
export class ObservationPopupComponent {
  private readonly sidebarService: SidebarService = inject(SidebarService)
  private readonly mapService: MapService = inject(MapService)
  private readonly eventService: EventService = inject(EventService)

  observation = input<any>();

  primaryField = computed(() => this.feedField('primaryFeedField'))
  secondaryField = computed(() => this.feedField('secondaryFeedField'))

  private feedField(key: 'primaryFeedField' | 'secondaryFeedField'): { field: any, value: any } | undefined {
    const observation = this.observation()
    if (!observation || observation.properties.forms.length === 0) return undefined

    const firstForm = observation.properties.forms[0]
    const forms = this.eventService.getForms(observation) || []
    const observationForm = forms.find(form => {
      return form.id === firstForm.formId;
    })

    if (observationForm[key] && firstForm[observationForm[key]]) {
      const field = observationForm.fields.find(field => field.name === observationForm[key])
      return {
        field: field,
        value: firstForm[observationForm[key]]
      }
    }
    return undefined
  }

  onInfo(): void {
    this.sidebarService.viewObservation(this.observation())
  }

  onZoom(): void {
    this.mapService.zoomToFeatureInLayer(this.observation(), 'observations');
  }
}