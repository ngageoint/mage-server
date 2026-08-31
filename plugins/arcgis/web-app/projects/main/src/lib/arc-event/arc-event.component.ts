import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
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
import { Observable, Subscription } from 'rxjs';

@Component({
  standalone: false,
  selector: 'arc-event',
  templateUrl: './arc-event.component.html',
  styleUrls: ['./arc-event.component.scss']
})
export class ArcEventComponent implements OnInit, OnChanges, OnDestroy {

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

  isLoading: boolean;
  currentEditingEvent: ArcEvent;
  layers: ArcEventLayer[];

  @ViewChild('editEventDialog', { static: true })
  private editEventTemplate: TemplateRef<unknown>

  private configChangedSubscription?: Subscription;
  isSaving: boolean;
  private savedSnapshot: string = '[]';

  constructor(private arcService: ArcService, private dialog: MatDialog) {
    this.config = defaultArcGISPluginConfig;
    this._model = new ArcEventsModel();
  }

  ngOnInit(): void {
    // detect changes in other tabs
    this.configChangedSubscription = this.configChangedNotifier?.subscribe(() => this.refreshEventLayers());
  }

  ngOnDestroy(): void {
    this.configChangedSubscription?.unsubscribe();
  }

  // re-derives each event's layer list from the current config, so layers belonging to a feature
  // service that was since deleted no longer appear as selectable/selected for any event
  private refreshEventLayers(): void {
    for (const event of this.model.allEvents) {
      event.layers = this.eventLayers(event.name);
      if (event.layers.length === 0) {
        event.selected = false;
      }
    }
    this.captureSnapshot();
  }

  // true once this.config has actually been replaced with fetched data, rather than still being
  // the shared default placeholder the parent starts with before its own config fetch resolves
  private get configReady(): boolean {
    return this.config !== defaultArcGISPluginConfig;
  }

  // applying the persisted event selection depends on both the events list (from this component's
  // own fetchEvents() call) and the real config (fetched independently by the parent) being ready;
  // whichever of those two async loads finishes last calls this to do the one-time initial application,
  // so it works correctly regardless of which one happens to resolve first
  private tryApplyInitialSelection(): void {
    if (this.eventSet || this.model.allEvents.length === 0 || !this.configReady) {
      return;
    }
    this.eventSet = true;
    this.refreshEventLayers();
    this.LoadSelectedEvents();
    this.loadEventFilters();
    this.captureSnapshot();
  }

  // seeds each event's sync-after filter from the persisted config
  private loadEventFilters(): void {
    for (const event of this.model.allEvents) {
      event.syncAfter = this.config.syncAfterByEventId?.[event.id];
    }
  }

  // serializes the event/layer selection state so it can be compared against or restored later
  private serializeEventsState(): string {
    return JSON.stringify(
      this.model.allEvents.map(event => ({
        name: event.name,
        selected: event.selected,
        syncAfter: event.syncAfter,
        layers: event.layers.map(layer => ({ name: layer.name, isSelected: layer.isSelected }))
      }))
    );
  }

  // captures the current event/layer selection state as the baseline to compare pending changes against
  private captureSnapshot(): void {
    this.savedSnapshot = this.serializeEventsState();
  }

  get hasChanges(): boolean {
    return this.serializeEventsState() !== this.savedSnapshot;
  }

  // reverts all pending event/layer selection changes back to the last saved state
  cancelChanges(): void {
    const snapshot: { name: string, selected: boolean, syncAfter?: string, layers: { name: string, isSelected: boolean }[] }[] = JSON.parse(this.savedSnapshot);
    for (const saved of snapshot) {
      const event = this.model.allEvents.find(e => e.name === saved.name);
      if (!event) continue;
      event.selected = saved.selected;
      event.syncAfter = saved.syncAfter;
      for (const savedLayer of saved.layers) {
        const layer = event.layers.find(l => l.name === savedLayer.name);
        if (layer) layer.isSelected = savedLayer.isSelected;
      }
    }
  }

  /// Activates On Every View Change, Is Configured to Set Initial State
  /// As Soon As Data is Available, Then locks Changes to Not Activate Unless
  /// A State Change is made that requires an update.
  ngOnChanges(changes: SimpleChanges): void {
    if (
      !this.configSet &&
      this.model.allEvents.length === 0
    ) {
      this.configSet = true;
      this.arcService.fetchEvents().subscribe(x => this.setAllEvents(x));
      return;
    }

    if (this.model.allEvents.length > 0 && changes['config'] && !changes['config'].firstChange) {
      if (this.eventSet) {
        // already applied the initial selection - just recompute layer availability from the
        // updated config, preserving any pending (unsaved) selection the user has made
        this.refreshEventLayers();
      } else {
        // the real config arrived after events were already loaded from the placeholder config
        this.tryApplyInitialSelection();
      }
    }
  }

  /// This Returns if Something should be shown when the Filter Text Box is used
  getVisibility(item: ArcEvent): boolean {
    return item.name.toLocaleLowerCase().includes(this.filterValue.toLocaleLowerCase());
  }

  get sortedEvents(): ArcEvent[] {
    return [...this.model.allEvents].sort((a, b) => a.name.localeCompare(b.name));
  }

  clearFilterValue() {
    this.filterValue = "";
  }

  /// On Initial Load this will store all available events into model.allEvents
  setAllEvents(x: MageEvent[]) {
    if (this.model.allEvents.map((aE) => aE.name).filter((eN) =>
      x.map((mE) => mE.name).includes(eN)).length) return;
    console.log("Loading All Available Events")
    const allEvents = new Array<ArcEvent>();
    for (const event of x) {
      const eventsLayers = this.eventLayers(event.name)
      allEvents.push(new ArcEvent(event.name, event.id, eventsLayers));
    }
    this.model.allEvents = allEvents;
    this.eventSet = false;
    // config may already be real by the time this async call resolves (or may still be the
    // placeholder, in which case ngOnChanges will pick this up once the real config arrives)
    this.tryApplyInitialSelection();
  }

  /// On Initial Load, this checks the database loaded value for selected events
  /// And marks the matching entries in model.allEvents as selected/on
  LoadSelectedEvents() {
    console.log("Loading Previously Selected Events")
    let events: (string | number)[] = [];
    for (const fs of this.config.featureServices) {
      for (const l of fs.layers) {
        l.events?.forEach(x => events.push(x))
      }
    }
    events = [...new Set(events)]; /// needs to be distinct.
    for (const event of events) {
      let e = null;
      if (typeof (event) == "string") {
        e = this.model.allEvents.find((x) => x.name === event);
      } else if (typeof (event) == "number") {
        e = this.model.allEvents.find((x) => x.id === event);
      }
      if (!e) {
        console.log(`${event} not found!`)
        continue;
      }
      e.selected = true;
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

  filterEnabled = false;
  editingSyncAfterDate: Date | null = null;
  editingSyncAfterTime = '';

  onEditEvent(event: ArcEvent) {
    console.log('Editing event synchronization for event ' + event.name);
    this.layers = event.layers;
    this.currentEditingEvent = event;
    this.filterEnabled = !!event.syncAfter;
    const syncAfterDate = event.syncAfter ? new Date(event.syncAfter) : null;
    this.editingSyncAfterDate = syncAfterDate;
    this.editingSyncAfterTime = syncAfterDate ? this.toTimeString(syncAfterDate) : '';
    this.dialog.open<unknown, unknown, string>(this.editEventTemplate)
  }

  onFilterToggle(checked: boolean): void {
    this.filterEnabled = checked;
    if (checked) {
      if (!this.editingSyncAfterDate) {
        this.editingSyncAfterDate = new Date();
        this.editingSyncAfterTime = this.toTimeString(this.editingSyncAfterDate);
      }
      this.applySyncAfter();
    } else if (this.currentEditingEvent) {
      this.currentEditingEvent.syncAfter = undefined;
    }
  }

  onSyncAfterDateChange(value: Date | null): void {
    this.editingSyncAfterDate = value;
    this.applySyncAfter();
  }

  onSyncAfterTimeChange(value: string): void {
    this.editingSyncAfterTime = value;
    this.applySyncAfter();
  }

  private applySyncAfter(): void {
    if (!this.currentEditingEvent || !this.editingSyncAfterDate) return;
    const combined = new Date(this.editingSyncAfterDate);
    const [hours, minutes] = this.editingSyncAfterTime
      ? this.editingSyncAfterTime.split(':').map(Number)
      : [0, 0];
    combined.setHours(hours || 0, minutes || 0, 0, 0);
    this.currentEditingEvent.syncAfter = combined.toISOString();
  }

  private toTimeString(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  /// Turns an event's synchronization on or off
  onToggleEvent(event: ArcEvent, on: boolean) {
    console.log(`Turning event synchronization ${on ? 'on' : 'off'} for event ${event.name}`);
    event.selected = on;
  }

  getSelectedLayers(event: ArcEvent) {
    return event.layers.filter((x) => x.isSelected)
  }

  layerSyncSummary(event: ArcEvent): string {
    const layers = this.getSelectedLayers(event)
    if (layers.length === 0) {
      return 'This event is not synchronizing to any ArcGIS layers.'
    }
    if (layers.length === 1) {
      return this.layerDisplay(layers[0])
    }
    return `Synchronizing ${layers.length} layers...`
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
      // layer identifiers may be numbers (once ArcGIS sync normalizes them to the layer id) while
      // ArcEventLayer.name is always a string, so compare as strings to avoid a silent type mismatch
      const layerName = String(l.layer);
      values.push({
        layer: l.layer,
        geometryType: l.geometryType,
        events: this.model.events
          .filter((x) => x.layers.some((y) => y.name === layerName && y.isSelected))
          .map((z) => z.name)
      })
    }
    return values;
  }

  saveChanges() {
    console.log('Saving changes to event sync');
    this.isSaving = true;
    for (const featureService of this.config.featureServices) {
      featureService.layers = this.getEventsInFeatureFormat(featureService);
    }
    this.config.syncAfterByEventId = {};
    for (const event of this.model.allEvents) {
      if (event.syncAfter) {
        this.config.syncAfterByEventId[event.id] = event.syncAfter;
      }
    }
    this.configChanged.emit(this.config);
    this.captureSnapshot();
    this.isSaving = false;

    this.arcService.putArcConfig(this.config).subscribe({
      error: (error) => console.error('Failed to save event synchronization:', error)
    });
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