import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from '../ArcGISPluginConfig'
import { FeatureServiceConfig } from "../ArcGISConfig"
import { ArcService } from '../arc.service'
import { MatDialog } from '@angular/material/dialog'
import { ArcEventsModel } from './ArcEventsModel';
import { ArcEvent } from './ArcEvent';
import { ArcEventLayer } from './ArcEventLayer';
import { Observable, Subscription } from 'rxjs';
import { EventResult } from '../EventsResult';


@Component({
  selector: 'arc-event',
  templateUrl: './arc-event.component.html',
  styleUrls: ['./arc-event.component.scss']
})
export class ArcEventComponent implements OnInit, OnChanges {

  private eventsSubscription: Subscription;

  @Input('config') config: ArcGISPluginConfig;
  private configSet = false;

  @Input() configChangedNotifier: Observable<void>;

  @Output() configChanged = new EventEmitter<ArcGISPluginConfig>();

  model: ArcEventsModel;
  isLoading: boolean;
  currentEditingEvent: ArcEvent;
  layers: ArcEventLayer[];
  private layersCount: Map<string, Map<string, Set<string>>>

  @ViewChild('editEventDialog', { static: true })
  private editEventTemplate: TemplateRef<unknown>

  constructor(private arcService: ArcService, private dialog: MatDialog) {
    this.config = defaultArcGISPluginConfig;
    this.model = new ArcEventsModel();
    this.layersCount = new Map();
  }

  ngOnInit(): void {
    this.eventsSubscription = this.configChangedNotifier.subscribe(() => this.handleConfigChanged());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(!this.configSet) {
      this.configSet = true;
      this.arcService.fetchEvents().subscribe(x => this.handleEventResults(x));
    }
  }

  handleConfigChanged() {
    let eventResults = new Array<EventResult>();
    if (this.model.events.length > 0) {
      for (const arcEvent of this.model.events) {
        const result = new EventResult();
        result.name = arcEvent.name;
        result.id = arcEvent.id;
        eventResults.push(result);
      }

      this.model.events.splice(0, this.model.events.length);
      this.handleEventResults(eventResults);
    }
  }

  handleEventResults(x: EventResult[]) {
    let activeEventMessage = 'Active events: ';
    this.updateLayersCount();
    for (const event of x) {
      activeEventMessage += event.name + ' ';
      let eventsLayers = this.eventLayers(event.name)
      const arcEvent = new ArcEvent(event.name, event.id, eventsLayers);
      this.model.events.push(arcEvent);
    }
    console.log(activeEventMessage);
  }

  private eventLayers(event: string): ArcEventLayer[] {
    const eventsLayers = [];
    for (const featureService of this.config.featureServices) {
      const domain = this.domain(featureService);
      const service = this.service(featureService);
      for (const featureLayer of featureService.layers) {
        if (featureLayer.events == null
          || featureLayer.events.indexOf(event) >= 0) {
          const layer = String(featureLayer.layer);
          const eventLayer = new ArcEventLayer(domain, service, layer);
          eventsLayers.push(eventLayer);
        }
      }
    }
    return eventsLayers
  }

  onEditEvent(event: ArcEvent) {
    console.log('Editing event synchronization for event ' + event.name);
    this.currentEditingEvent = event;
    this.layers = [];
    this.updateLayersCount();

    for (const featureService of this.config.featureServices) {
      const domain = this.domain(featureService);
      const service = this.service(featureService);
      for (const featureLayer of featureService.layers) {
        const layer = String(featureLayer.layer);
        const selectableLayer = new ArcEventLayer(domain, service, layer);
        const index = event.layers.findIndex((element) => {
          return element.name === layer && element.domain === domain && element.service === service;
        })
        selectableLayer.isSelected = index >= 0;
        this.layers.push(selectableLayer);
      }
    }

    this.dialog.open<unknown, unknown, string>(this.editEventTemplate)
  }

  private updateLayersCount() {
    const counts = new Map();
    for (const featureService of this.config.featureServices) {
      const domain = this.domain(featureService);
      const service = this.service(featureService);
      for (const featureLayer of featureService.layers) {
        const layer = String(featureLayer.layer);
        let serviceMap = counts.get(layer);
        if (serviceMap == null) {
          serviceMap = new Map();
          counts.set(layer, serviceMap);
        }
        let domainSet = serviceMap.get(service);
        if (domainSet == null) {
          domainSet = new Set();
          serviceMap.set(service, domainSet)
        }
        domainSet.add(domain)
      }
    }
    this.layersCount = counts
  }

  layerDisplay(layer: ArcEventLayer): string {
    let displayName = layer.name
    const serviceMap = this.layersCount.get(layer.name)
    if (serviceMap != null) {
      if (serviceMap.size > 1) {
        displayName += " (" + layer.service
        const domainSet = serviceMap.get(layer.service)
        if (domainSet != null && domainSet.size > 1) {
          displayName += ", " + layer.domain
        }
        displayName += ")"
      } else if (serviceMap.size == 1) {
        const domainSet = serviceMap.get(layer.service)
        if (domainSet != null && domainSet.size > 1) {
          displayName += " (" + layer.domain + ")"
        }
      }
    }
    return displayName
  }

  selectedChanged(layer: ArcEventLayer) {
    console.log('Selection changed for ' + layer.name);
    layer.isSelected = !layer.isSelected;
  }

  saveChanges() {
    console.log('Saving changes to event sync');
    for (const featureService of this.config.featureServices) {
      const domain = this.domain(featureService);
      const service = this.service(featureService);
      for (const featureLayer of featureService.layers) {

        const index = this.layers.findIndex((element) => {
          return element.name === featureLayer.layer && element.domain === domain && element.service === service;
        })

        if (index != -1) {
          const layer = this.layers[index];
          if (layer.isSelected) {
            // Only add the event if layer events are specified and do not contain the event
            if (featureLayer.events != null
              && featureLayer.events.indexOf(this.currentEditingEvent.name) == -1) {
                featureLayer.events.push(this.currentEditingEvent.name);
            }
          } else if (featureLayer.events != null) {
            const indexOf = featureLayer.events.indexOf(this.currentEditingEvent.name);
            if (indexOf >= 0) {
              featureLayer.events.splice(indexOf, 1);
            }
          } else {
            // Specify all other events to remove the event from the layer
            featureLayer.events = []
            for (const event of this.model.events) {
              if (event.name != this.currentEditingEvent.name) {
                featureLayer.events.push(event.name)
              }
            }
          }

        }
      }
    }
    this.currentEditingEvent.layers = this.eventLayers(this.currentEditingEvent.name)

    this.configChanged.emit(this.config);
    this.arcService.putArcConfig(this.config);
  }

  private domain(featureService: FeatureServiceConfig): string {
    const url = new URL(featureService.url)
    return url.hostname
  }

  private service(featureService: FeatureServiceConfig): string {
    const url = new URL(featureService.url)
    let service = url.pathname
    let index = service.indexOf('/FeatureServer')
    if (index != -1) {
      service = service.substring(0, index)
    }
    index = service.lastIndexOf('/')
    if (index != -1) {
      service = service.substring(index + 1)
    }
    return service
  }

}