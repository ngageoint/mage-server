import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from '../ArcGISPluginConfig'
import { FeatureLayerConfig, FeatureServiceConfig } from "../ArcGISConfig"
import { ArcService, MageEvent } from '../arc.service'
import { MatDialog } from '@angular/material/dialog'
import { ArcEventsModel } from './ArcEventsModel';
import { ArcEvent } from './ArcEvent';
import { ArcEventLayer } from './ArcEventLayer';
import { Observable } from 'rxjs';
import { MatSelect } from '@angular/material/select';
import { MatOption, MatOptionSelectionChange } from '@angular/material/core';

@Component({
  selector: 'arc-event',
  templateUrl: './arc-event.component.html',
  styleUrls: ['./arc-event.component.scss']
})
export class ArcEventComponent implements OnInit, OnChanges {

  @Input('config') config: ArcGISPluginConfig = defaultArcGISPluginConfig;
  private configSet = false;
  private _eventSet = false;
  filterValue: string = "";

  @Input()
  set eventSet(value: boolean) {
    this._eventSet = value;
  }
  get eventSet() {
    return this._eventSet;
  }

  @Input() configChangedNotifier: Observable<void>;

  @Output() configChanged = new EventEmitter<ArcGISPluginConfig>();

  private _model: ArcEventsModel = new ArcEventsModel()

  @Input()
  set model(value: ArcEventsModel) {
    this._model = value;
  }
  get model() {
    return this._model;
  }

  selectedValues: number[] = [];

  isLoading: boolean;
  currentEditingEvent: ArcEvent;
  layers: ArcEventLayer[];

  @ViewChild('editEventDialog', { static: true })
  private editEventTemplate: TemplateRef<unknown>

  @ViewChild('selectEvents', { static: true })
  private selectEventTemplate: TemplateRef<unknown>

  @ViewChild('matRef') matSelect: MatSelect;

  constructor(private arcService: ArcService, private dialog: MatDialog) {
    this.config = defaultArcGISPluginConfig;
    this._model = new ArcEventsModel();
  }

  ngOnInit(): void { }

  /// Activates On Every View Change, Is Configured to Set Initial State
  /// As Soon As Data is Available, Then locks Changes to Not Activate Unless
  /// A State Change is made that requires an update.
  ngOnChanges(changes: SimpleChanges): void {
    if (
      !this.configSet &&
      this.config.featureServices.length > 0 &&
      this.model.allEvents.length === 0
    ) {
      this.configSet = true;
      this.arcService.fetchEvents().subscribe(x => this.setAllEvents(x));
    }
    else if (!this.eventSet && this.configSet && this.model.allEvents.length > 0) {
      this.eventSet = true;
      this.LoadSelectedEvents();
    }
  }

  /// Returns a list of values that differ between two lists of ArcEvents
  getDifferences(left: ArcEvent[], right: ArcEvent[]): ArcEvent[] {
    return left.filter(l =>
      !right.some(r =>
        l.id === r.id));
  }

  /// This Returns if Something should be shown when the Filter Text Box is used
  getVisibility(item: ArcEvent) {
    let isNotFiltered = this.model.allEvents.find((x) =>
      x.name === item.name)?.name.toLocaleLowerCase().includes(this.filterValue);
    return isNotFiltered
  }

  clearFilterValue() {
    this.filterValue = "";
  }

  getSelections() {
    return this._model.events.map((x) => x.id);
  }

  /// On Initial Load this will store all available events into model.allEvents
  setAllEvents(x: MageEvent[]) {
    if (this.model.allEvents.map((aE) => aE.name).filter((eN) =>
      x.map((mE) => mE.name).includes(eN)).length) return;
    console.log("Loading All Available Events")
    let temp = new ArcEventsModel();
    for (const event of x) {
      let eventsLayers = this.eventLayers(event.name)
      const arcEvent = new ArcEvent(event.name, event.id, eventsLayers);
      temp.allEvents.push(arcEvent);
    }
    this.model = Object.assign({}, temp);
    this.eventSet = false;
  }

  /// On Initial Load, this checks the database loaded value for selected events
  /// And Adds them to the list of select box selected values, which in turn adds them
  /// to model.events
  LoadSelectedEvents() {
    console.log("Loading Previously Selected Events")
    let events: (string | number)[] = [];
    for (const fs of this.config.featureServices) {
      for (const l of fs.layers) {
        events.push(...<[]>l.events?.map(x => x))
      }
    }
    if (!events) {
      console.log("No Events Found!")
      return;
    }
    else events = [...new Set(events)]; /// needs to be distinct.
    let e = null;
    for (const event of events) {
      if (typeof (event) == "string") {
        e = this.model.allEvents.find((x) => x.name === event);
      } else if (typeof (event) == "number") {
        e = this.model.allEvents.find((x) => x.id === event);
      }
      if (!e) {
        console.log(`${event} not found!`)
        continue;
      }
      let eventsLayers = this.eventLayers(e.name)
      const arcEvent = new ArcEvent(e.name, e.id, eventsLayers);
      this.selectedValues.push(arcEvent.id)
    }
  }

  // Returns a list of all Layers possible for events, and sets selected status
  private eventLayers(event: string): ArcEventLayer[] {
    const eventsLayers = [];
    for (const featureService of this.config.featureServices) {
      const domain = this.domain(featureService);
      const service = this.service(featureService);
      for (const featureLayer of featureService.layers) {
        const layer = String(featureLayer.layer);
        const eventLayer = new ArcEventLayer(domain, service, layer);
        eventLayer.isSelected = (
          featureLayer.events !== undefined &&
          featureLayer.events?.indexOf(event) >= 0
        );
        eventsLayers.push(eventLayer);
      }
    }
    return eventsLayers
  }

  onEditEvent(event: ArcEvent) {
    console.log('Editing event synchronization for event ' + event.name);
    this.layers = event.layers;
    this.currentEditingEvent = event;
    this.dialog.open<unknown, unknown, string>(this.editEventTemplate)
  }

  onSelectEvents() {
    this.dialog.open<unknown, unknown, string>(this.selectEventTemplate);
  }

  onSelectionChange(arcEventModified: ArcEvent, e: MatOptionSelectionChange) {
    let option: MatOption = e.source;
    if (!option) return
    if (option.selected) this.onAddEvent(arcEventModified);
    else this.onRemoveEvent(arcEventModified)
  }

  onAddEvent(event: ArcEvent) {
    console.log('Adding Event to List of Selected Events');
    let temp: ArcEventsModel = { ...this.model }
    temp.events.push(event);
    this.model = Object.assign({}, temp);
  }

  onRemoveEvent(event: ArcEvent) {
    console.log('Removing Event to List of Selected Events');
    let temp: ArcEventsModel = { ...this.model }
    temp.events = temp.events.filter((e) => e != event);
    this.model = Object.assign({}, temp);
  }

  getSelectedLayers(event: ArcEvent) {
    return event.layers.filter((x) => x.isSelected)
  }

  layerDisplay(layer: ArcEventLayer): string {
    let displayName = layer.name
    return displayName
  }

  selectedChanged(layer: ArcEventLayer) {
    console.log('Selection changed for ' + layer.name);
    layer.isSelected = !layer.isSelected;
  }

  /// This translates model.events to database format, which allows them to ber easily saved
  /// Directly from the stated value
  getEventsInFeatureFormat(featureService: FeatureServiceConfig): FeatureLayerConfig[] {
    let values: FeatureLayerConfig[] = [];
    for (let l of featureService.layers) {
      values.push({
        layer: l.layer,
        geometryType: l.geometryType,
        events: [...this.model.events.filter((x) => x.layers.map((y) => {
          if (y.name === l.layer && y.isSelected) {
            return y.name
          } else return ""
        }).indexOf(l.layer as string) >= 0)
          .map((z) => z.name)]
      })
    }
    return values;
  }

  saveChanges() {
    console.log('Saving changes to event sync');
    for (const featureService of this.config.featureServices) {
      featureService.layers = this.getEventsInFeatureFormat(featureService);
    }
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