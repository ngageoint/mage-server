import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FeedPanelService } from '../../feed-panel/feed-panel.service';
import * as moment from 'moment';
import { MapService } from '../../map/map.service';
import { EventService } from '../../event/event.service';

@Component({
  selector: 'observation-map-popup',
  templateUrl: './observation-popup.component.html',
  styleUrls: ['./observation-popup.component.scss']
})
export class ObservationPopupComponent implements OnInit, OnChanges {
  @Input() observation: any;

  hasContent = false;
  date: string;
  primary: string;
  primaryField: any;
  secondary: string;
  secondaryField: any;

  constructor(
    private feedPanelService: FeedPanelService,
    private mapService: MapService,
    private eventService: EventService) { }

  ngOnInit(): void {
    this.updateView();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.updateView();
  }

  private updateView(): void {
    if (!this.observation) return

    if (this.observation.properties.forms.length > 0) {
      const firstForm = this.observation.properties.forms[0]

      const forms = this.eventService.getForms(this.observation) || []
      const observationForm = forms.find(form => {
        return form.id === this.observation.properties.forms[0].formId;
      })

      if (observationForm.primaryFeedField && firstForm[observationForm.primaryFeedField]) {
        const field = observationForm.fields.find(field => field.name === observationForm.primaryFeedField)
        this.primaryField = {
          field: field,
          value: firstForm[observationForm.primaryFeedField]
        }
      }

      if (observationForm.secondaryFeedField && firstForm[observationForm.secondaryFeedField]) {
        const field = observationForm.fields.find(field => field.name === observationForm.secondaryFeedField)
        this.secondaryField = {
          field: field,
          value: firstForm[observationForm.secondaryFeedField]
        }
      }
    }

    this.date = moment(this.observation.properties.timestamp).format("YYYY-MM-DD HH:mm:ss");
  }

  onInfo(): void {
    this.feedPanelService.viewObservation(this.observation)
  }

  onZoom(): void {
    this.mapService.zoomToFeatureInLayer(this.observation, 'observations');
  }
}