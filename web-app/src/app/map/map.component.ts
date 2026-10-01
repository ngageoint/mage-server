import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core'
import { LocationEvent, LocationState } from '../../app/map/controls/location.component'
import { SearchEvent } from '../../app/map/controls/search.component'
import { ZoomDirection, ZoomEvent as ZoomControlEvent } from '../../app/map/controls/zoom.component'
import { LayerService } from '../layer/layer.service'
import { MapLayerService, StyleEvent, ToggleEvent } from './layers/layer.service'
import { MapService } from './map.service'
import { LocalStorageService } from '../http/local-storage.service'
import { EventService } from '../event/event.service'
import { latLng, popup, tileLayer, Icon, Util, marker, TileLayer, geoJSON, GeoJSON as GeoJSONLayer, latLngBounds, LatLng, markerClusterGroup, MarkerClusterGroup, Map, DomEvent, LocationEvent as LeafletLocationEvent } from "leaflet"
import { OpacityEvent, ZoomEvent as LayerZoomEvent } from './layers/layer.service'
import { ReorderEvent } from './layers/layers.component'
import { moveItemInArray } from '@angular/cdk/drag-drop'
import { locationMarker, LocationMarker } from './marker/LocationMarker'
import { observationMarker, ObservationMarker } from './marker/ObservationMarker'
import { COUNTRIES as countries } from './layers/static/layers'
import 'leaflet-editable'
import 'leaflet.markercluster'
import { FeatureEditor } from './edit/FeatureEditor'
import GeoPackageLayers from './geopackage/GeoPackageLayers'
import { FilterService } from '../filter/filter.service'
import { GARSLayer } from './layers/gars/GARSLayer'
import { MGRSLayer } from './layers/mgrs/MGRSLayer'
import { GeoPackageLayer, GridOverlay, MapFeature, MapFeatureLayer, MapLayer, MapLayerId, RasterLayer, RenderedMapLayer, VectorLayer } from './entities.map-layer'
import { MatDialog as MatDialog } from '@angular/material/dialog'
import * as _ from 'lodash'
import moment from 'moment';
import { Subscription, interval } from 'rxjs'
import { ContactDialogComponent } from '../contact/contact-dialog.component'
import { SessionService } from 'mage-web-app/http/session.service'

Icon.Default.imagePath = '/'

@Component({
    selector: 'map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss'],
    providers: [LayerService],
    standalone: false
})
export class MapComponent implements OnDestroy, AfterViewInit {

  public static readonly PANE_Z_INDEX_BUCKET_SIZE = 10000
  public static readonly BASE_PANE_Z_INDEX_OFFSET = 1 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE
  public static readonly TILE_PANE_Z_INDEX_OFFSET = 2 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE
  public static readonly GRID_PANE_Z_INDEX_OFFSET = 3 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE
  public static readonly FEATURE_PANE_Z_INDEX_OFFSET = 6 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE
  public static readonly MAGE_PANE_Z_INDEX_OFFSET = 7 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE

  @Output() addObservation = new EventEmitter<any>()

  @ViewChild('map') mapElement!: ElementRef<any>
  @ViewChild('mapControlsLeft') mapControlsLeft!: ElementRef<HTMLElement>
  @ViewChild('mapControlsRight') mapControlsRight!: ElementRef<HTMLElement>
  mapReizeObserver?: ResizeObserver
  private listenerTimeout?: ReturnType<typeof setTimeout>

  map!: Map
  groups: Record<string, { offset: number, layers: RenderedMapLayer[] }> = {
    'base': {
      offset: MapComponent.BASE_PANE_Z_INDEX_OFFSET,
      layers: []
    },
    'mage': {
      offset: MapComponent.MAGE_PANE_Z_INDEX_OFFSET,
      layers: []
    },
    'feed': {
      offset: MapComponent.MAGE_PANE_Z_INDEX_OFFSET,
      layers: []
    },
    'tile': {
      offset: MapComponent.TILE_PANE_Z_INDEX_OFFSET,
      layers: []
    },
    'feature': {
      offset: MapComponent.FEATURE_PANE_Z_INDEX_OFFSET,
      layers: []
    },
    'grid': {
      offset: MapComponent.GRID_PANE_Z_INDEX_OFFSET,
      layers: []
    }
  }
  layers: Record<string, RenderedMapLayer> = {}
  geoPackageLayers: any
  temporalLayers: Extract<RenderedMapLayer, { type: 'vector' }>[] = []
  currentLocation: any = null
  locationLayer = locationMarker([0, 0], { color: '#136AEC', radius: 16 })
  locationState = LocationState.Off
  searchMarker: any
  featurePanes: string[] = []
  BASE_LAYER_PANE = 'baseLayerPane'

  toggleSubscription: Subscription
  zoomSubscription: Subscription
  opacitySubscription: Subscription
  styleSubscription: Subscription
  temporalLayerSubscription: Subscription

  private static readonly TEMPORAL_LAYER_REFRESH_INTERVAL_MS = 60000

  constructor(
    public dialog: MatDialog,
    private mapService: MapService,
    private sessionService: SessionService,
    mapLayerService: MapLayerService,
    private layerService: LayerService,
    private eventService: EventService,
    private filterService: FilterService,
    private localStorageService: LocalStorageService
  ) {
    this.toggleSubscription = mapLayerService.toggle$.subscribe(event => this.layerTogged(event));
    this.zoomSubscription = mapLayerService.zoom$.subscribe(event => this.zoom(event));
    this.opacitySubscription = mapLayerService.opacity$.subscribe(event => this.opacityChanged(event));
    this.styleSubscription = mapLayerService.style$.subscribe(event => this.styleChanged(event));
    this.temporalLayerSubscription = interval(MapComponent.TEMPORAL_LAYER_REFRESH_INTERVAL_MS)
      .subscribe(() => this.adjustTemporalLayers());

    this.mapReizeObserver = new ResizeObserver(() => {
      this.map.invalidateSize({ pan: false, debounceMoveend: true })
    })
  }

  ngAfterViewInit() {
    this.mapReizeObserver?.observe(this.mapElement.nativeElement)

    DomEvent.disableClickPropagation(this.mapControlsLeft.nativeElement)
    DomEvent.disableClickPropagation(this.mapControlsRight.nativeElement)

    let mapPosition = this.localStorageService.getMapPosition()
    if (!mapPosition) {
      this.localStorageService.setMapPosition({
        center: { lng: 0, lat: 0 },
        zoom: 3
      })
      mapPosition = this.localStorageService.getMapPosition()
    }

     this.map = new Map('map', {
      center: mapPosition.center,
      zoom: mapPosition.zoom,
      zoomControl: false,
      minZoom: 0,
      maxZoom: 18,
      trackResize: true,
      worldCopyJump: true,
      editable: true // turn on Leaflet.Editable
    })

    // Spread out map panes
    // To easily adjust zIndex across all types of layers each feature group,
    // overlay map, etc, will be placed in its own map pane
    const baseLayerPane = this.map.createPane(this.BASE_LAYER_PANE)
    baseLayerPane.style.zIndex = `${100 * 100}`

    const panes = this.map.getPanes()
    panes.tilePane.style.zIndex = `${200 * 100}`
    panes.overlayPane.style.zIndex = `${400 * 100}`
    panes.shadowPane.style.zIndex = `${500 * 100}`
    panes.markerPane.style.zIndex = `${600 * 100}`
    panes.tooltipPane.style.zIndex = `${700 * 100}`
    panes.popupPane.style.zIndex = `${800 * 100}`

    // Add in a base layer of styled GeoJSON in case the tiles do not load
    const FALLBACK_LAYER_PANE = 'fallbackLayerPane'
    const fallbackLayerPane = this.map.createPane(FALLBACK_LAYER_PANE)
    fallbackLayerPane.style.zIndex = '1'

    this.map.addLayer(
      geoJSON(countries, {
        interactive: false,
        style: function () {
          return {
            color: '#BBBBBB',
            weight: 0.5,
            fill: true,
            fillColor: '#F9F9F6',
            fillOpacity: 1
          }
        },
        pane: FALLBACK_LAYER_PANE
      })
    )

    this.map.on('locationfound', this.onLocation, this)
    this.map.on('locationerror', function (err) {
      console.log('LOCATION ERROR', err)
    })

    const saveMapPosition = () => {
      const center = this.map.getCenter()
      this.localStorageService.setMapPosition({
        center: latLng(Util.formatNum(center.lat), Util.formatNum(center.lng)),
        zoom: this.map.getZoom()
      })
    }
    this.map.on('moveend', saveMapPosition)

    this.geoPackageLayers = new GeoPackageLayers(
      this.map,
      this.layerService,
      this.filterService,
      this.sessionService
    )

    // Ensure that any changes made by listener callbacks are processed in a digest cycle
    // TODO this can be removed when the services use rxjs rather than custom change detection w/  callbacks
    this.listenerTimeout = setTimeout(() => {
      this.mapService.setDelegate(this)
      this.mapService.addListener(this)
    })
  }

  ngOnDestroy(): void {
    clearTimeout(this.listenerTimeout)
    this.mapService.removeListener(this)
    this.mapReizeObserver?.unobserve(this.mapElement.nativeElement)

    this.toggleSubscription.unsubscribe()
    this.zoomSubscription.unsubscribe()
    this.opacitySubscription.unsubscribe()
    this.styleSubscription.unsubscribe()
    this.temporalLayerSubscription.unsubscribe()

    this.map?.remove()
  }

  saveMapPosition() {
    const center = this.map.getCenter()
    this.localStorageService.setMapPosition({
      center: latLng(Util.formatNum(center.lat), Util.formatNum(center.lng)),
      zoom: this.map.getZoom()
    })
  }

  opacityChanged(event: OpacityEvent): void {
    const pane = this.map.getPanes()[event.layer.layer.pane]
    pane.style.opacity = `${event.opacity}`
    if (event.layer.layer.setOpacity) {
      event.layer.layer.setOpacity(event.opacity)
    }
  }

  styleChanged(event: StyleEvent): void {
    event.layer.layer.setStyle(event.style);
  }

  reorder($event: ReorderEvent): void {
    moveItemInArray($event.layers, $event.previousIndex, $event.currentIndex)
    const offset =
      $event.type === 'feature'
        ? MapComponent.FEATURE_PANE_Z_INDEX_OFFSET
        : MapComponent.TILE_PANE_Z_INDEX_OFFSET

    $event.layers.forEach((layer: any, index: number) => {
      layer.zIndex = offset + MapComponent.PANE_Z_INDEX_BUCKET_SIZE - (index + 1)
      const pane = this.map.getPanes()[layer.layer.pane]
      pane.style.zIndex = layer.zIndex
    })
  }

  zoom($event: LayerZoomEvent): void {
    const layer = $event.layer.layer
    if (layer.getBounds) {
      const bounds = layer.getBounds()
      this.map.fitBounds(bounds)
    } else if (layer.table && layer.table.bbox) {
      this.map.fitBounds([
        [layer.table.bbox[1], layer.table.bbox[0]],
        [layer.table.bbox[3], layer.table.bbox[2]]
      ])
    }
  }

  onZoom($event: ZoomControlEvent) {
    if ($event.direction === ZoomDirection.IN) {
      this.map.zoomIn(1)
    } else {
      this.map.zoomOut(1)
    }
  }

  onSearch($event: SearchEvent) {
    this.onSearchClear()

    this.map.fitBounds(
      latLngBounds(
        latLng($event.result.bbox[1], $event.result.bbox[0]),
        latLng($event.result.bbox[3], $event.result.bbox[2])
      )
    )

    const markerPopup = popup({ className: 'leaflet-material-popup' }).setContent($event.result.name)
    this.searchMarker = marker([$event.result.position[1], $event.result.position[0]])
      .addTo(this.map)
      .bindPopup(markerPopup)
      .openPopup()
  }

  onSearchClear() {
    if (this.searchMarker) {
      this.map.removeLayer(this.searchMarker)
    }
  }

  onAddObservation() {
    this.addObservation.emit({
      latLng: this.map.getCenter()
    })
  }

  onLocationState($event: LocationEvent) {
    if ($event.state === LocationState.Broadcast &&
      !this.eventService.isUserInEvent(this.sessionService.user, this.filterService.getEvent())
    ) {
      const data = {
        info: {
          statusTitle: 'Cannot Send Your Location',
          statusMessage: 'You are not part of this event.'
        }
      };

      this.dialog.open(ContactDialogComponent, {
        width: '500px',
        data: data
      })

      return
    }

    this.locationState = $event.state
    if ($event.state === LocationState.Off) {
      this.map.stopLocate()

      if (this.map.hasLayer(this.locationLayer)) {
        this.map.removeLayer(this.locationLayer)
      }
      this.currentLocation = null
    } else {
      this.map.locate({
        watch: true,
        setView: false
      })
    }
  }

  onLocation(location: LeafletLocationEvent) {
    // skip if the location has not changed
    if (
      this.locationState === LocationState.Off ||
      (this.currentLocation &&
        this.currentLocation.latitude === location.latlng.lat &&
        this.currentLocation.longitude === location.latlng.lng &&
        this.currentLocation.accuracy === location.accuracy)
    ) {
      return
    }

    this.currentLocation = location
    this.map.fitBounds(location.bounds)
    this.locationLayer.setLatLng(location.latlng).setAccuracy(location.accuracy)
    if (!this.map.hasLayer(this.locationLayer)) {
      this.map.addLayer(this.locationLayer)
    }

    if (this.locationState === LocationState.Broadcast) {
      this.mapService.onLocation(location)
    }
  }

  onLayersChanged({ added = [] }: { added?: MapLayer[] }) {
    added.forEach(added => {
      switch (added.type) {
        case 'GeoPackage':
          this.createGeoPackageLayer(added)
          break
        case 'Imagery':
          this.createRasterLayer(added)
          break
        case 'vector':
          this.createGeoJsonLayer(added)
          break
        case 'grid':
          this.createGridLayer(added)
          break
      }
    })
  }

  // TODO move into leaflet service, this and map clip both use it
  createRasterLayer(layerInfo: RasterLayer) {
    let paneName = this.BASE_LAYER_PANE
    if (!layerInfo.base) {
      paneName = `pane-${layerInfo.id}`
      this.map.createPane(paneName)
    }

    let layer: TileLayer | TileLayer.WMS
    if (layerInfo.format === 'WMS') {
      const options: any = {
        layers: layerInfo.wms.layers,
        version: layerInfo.wms.version,
        format: layerInfo.wms.format,
        transparent: layerInfo.wms.transparent,
        pane: paneName
      }

      if (layerInfo.wms.styles) options.styles = layerInfo.wms.styles
      layer = new TileLayer.WMS(layerInfo.url, options)
    } else {
      const options = { tms: layerInfo.format === 'TMS', maxZoom: 18, pane: paneName }
      layer = tileLayer(layerInfo.url, options)
    }

    const rendered = { ...layerInfo, layer } as RenderedMapLayer
    this.layers[layerInfo.id] = rendered
    this.addLayer(rendered)
  }

  createGeoPackageLayer(layerInfo: GeoPackageLayer) {
    const pane = `pane-${layerInfo.id}`
    this.map.createPane(pane)
    if (layerInfo.renderAs === 'feature') {
      this.featurePanes.push(pane)
    }

    const layer = this.geoPackageLayers.createGeoPackageLayer(layerInfo, pane)
    const rendered = { ...layerInfo, layer } as RenderedMapLayer
    this.layers[layerInfo.id] = rendered
    this.addLayer(rendered)
  }

  createGeoJsonLayer(layerInfo: VectorLayer) {
    const pane = `pane-${layerInfo.id}`
    this.map.createPane(pane)
    this.featurePanes.push(pane)

    const withFeatures = { ...layerInfo, featureIdToLayer: {} }
    const geojson = this.createGeoJsonForLayer(null, withFeatures, pane)

    let layer: GeoJSONLayer | MarkerClusterGroup
    if (layerInfo.cluster) {
      layer = markerClusterGroup({
        pane: pane,
        clusterPane: pane
      }).addLayer(geojson)
    } else {
      layer = geojson
    }

    const rendered = { ...withFeatures, layer } as Extract<RenderedMapLayer, { type: 'vector' }>
    this.layers[layerInfo.id] = rendered

    if (layerInfo.temporal) {
      this.temporalLayers.push(rendered)
    }

    if (!layerInfo.hidden) {
      this.addLayer(rendered)
    }
  }

  createGeoJsonForLayer(json: GeoJSON.GeoJsonObject | null, layerInfo: VectorLayer & { featureIdToLayer: Record<string, MapFeatureLayer> }, pane: string, editMode?: any) {
    const popup = layerInfo.renderHooks.popup
    const geojson = geoJSON(json ?? undefined, {
      pane: pane,
      onEachFeature: (feature: MapFeature, layer) => {
        if (popup) {
          if (_.isFunction((popup as any).html)) {
            const options: any = { autoPan: false, maxWidth: 400 }
            if ((popup as any).closeButton !== undefined) options.closeButton = (popup as any).closeButton
            layer.bindPopup((popup as any).html(feature, layer), options)
          }
          if (_.isFunction((popup as any).onOpen)) {
            layer.on('popupopen', function () {
              (popup as any).onOpen(feature)
            })
          }
          if (_.isFunction((popup as any).onClose)) {
            layer.on('popupclose', function () {
              (popup as any).onClose(feature)
            })
          }
        }
        if (layerInfo.renderHooks.onLayer) {
          layerInfo.renderHooks.onLayer(layer as any, feature)
        }
        layerInfo.featureIdToLayer[feature.id] = layer as any
      },
      pointToLayer: (geoJsonPoint: GeoJSON.Feature<GeoJSON.Point>, latlng: LatLng) => {
        const feature = geoJsonPoint as MapFeature
        let layer: MapFeatureLayer

        if (layerInfo.temporal) {
          const temporalOptions: any = {
            pane: pane,
            accuracy: (feature.properties as any)?.accuracy,
            color: this.colorForFeature(feature, layerInfo.temporal)
          }
          if (feature.style?.iconUrl) {
            temporalOptions.iconUrl = feature.style.iconUrl
          }
          layer = locationMarker(latlng, temporalOptions)
        } else {
          const options: any = {
            pane: pane,
            accuracy: (feature.properties as any)?.accuracy
          }
          if (layerInfo.iconUrl) {
            options.iconUrl = layerInfo.iconUrl
          } else if (feature.style?.iconUrl) {
            options.iconUrl = feature.style.iconUrl
          }

          if (layerInfo.iconWidth) {
            options.iconWidth = 24
          }
          options.tooltip = editMode
          layer = observationMarker(latlng, options)
        }

        if (layerInfo.renderHooks.onLayer) {
          layerInfo.renderHooks.onLayer(layer, feature)
        }

        return layer
      },
      style: function (feature: any) {
        return feature.style
      }
    })

    return geojson
  }

  createGridLayer(layerInfo: GridOverlay) {
    const pane = `pane-${layerInfo.id}`
    this.map.createPane(pane)

    const layer = layerInfo.id === 'gars' ? new GARSLayer({ pane }) : new MGRSLayer({ pane })
    const rendered = { ...layerInfo, layer } as RenderedMapLayer
    this.layers[layerInfo.id] = rendered
    this.addLayer(rendered)
  }

  addLayer(layerInfo: RenderedMapLayer) {
    if (this.isSelected(layerInfo)) {
      layerInfo.selected = true
      const toggleEvent: ToggleEvent = {
        layer: layerInfo,
        value: true
      }
      this.layerTogged(toggleEvent)
    }

    const groupName = this.getGroup(layerInfo)
    const group = this.groups[groupName]
    layerInfo.zIndex = group.offset + MapComponent.PANE_Z_INDEX_BUCKET_SIZE - (group.layers.length + 1)
    const pane = this.map.getPanes()[layerInfo.layer.options.pane]
    pane.style.zIndex = `${layerInfo.zIndex}`
    group.layers.push(layerInfo)
  }

  onFeaturesChanged({ id, added = [], updated = [], removed = [] }: { id: string, added?: MapFeature[], updated?: MapFeature[], removed?: Pick<MapFeature, 'id'>[] }) {
    const featureLayer = this.layers[id] as Extract<RenderedMapLayer, { type: 'vector' }>
    const layer = featureLayer.layer
    const pane = layer.options.pane
    added.forEach(feature => {
      if (featureLayer.cluster) {
        const created = this.createGeoJsonForLayer(feature, featureLayer, pane)
        layer.addLayer(created)
      } else {
        (layer as GeoJSONLayer).addData(feature)
      }
    })

    updated.forEach(feature => {
      const existing = featureLayer.featureIdToLayer[feature.id]
      if (existing) {
        layer.removeLayer(existing)
      }

      if (featureLayer.cluster) {
        layer.addLayer(this.createGeoJsonForLayer(feature, featureLayer, pane))
      } else {
        (layer as GeoJSONLayer).addData(feature)
      }
    })

    removed.forEach(feature => {
      const existing = featureLayer.featureIdToLayer[feature.id]
      if (existing) {
        delete featureLayer.featureIdToLayer[feature.id]
        layer.removeLayer(existing)
      }
    })
  }

  onFeatureZoom(zoom: { id: string, feature: Pick<MapFeature, 'id'> }) {
    const featureLayer = this.layers[zoom.id] as Extract<RenderedMapLayer, { type: 'vector' }>
    const layer = featureLayer.featureIdToLayer[zoom.feature.id]
    if (!layer || !this.map.hasLayer(featureLayer.layer)) return

    if (featureLayer.cluster) {
      const clusterLayer = featureLayer.layer as MarkerClusterGroup
      if (this.map.getZoom() < 17) {
        if ('getBounds' in layer) {
          // Zoom and center polyline/polygon
          this.map.fitBounds(layer.getBounds(), {
            maxZoom: 17
          })
          this.openPopup(layer, {})
        } else {
          // Zoom and center point
          this.map.once('zoomend', () => {
            clusterLayer.zoomToShowLayer(layer, () => {
              this.openPopup(layer, { zoomToLocation: false })
            })
          })
          this.map.setView(layer.getLatLng(), 17)
        }
      } else {
        if ('getBounds' in layer) {
          this.map.fitBounds(layer.getBounds(), {
            maxZoom: 17
          })
          this.openPopup(layer, {})
        } else {
          clusterLayer.zoomToShowLayer(layer, () => {
            this.openPopup(layer, { zoomToLocation: false })
          })
        }
      }
    } else {
      this.openPopup(layer, { zoomToLocation: true })
    }
  }

  onFeatureDeselect(deselected: { id: string, feature: Pick<MapFeature, 'id'> }) {
    const featureLayer = this.layers[deselected.id] as Extract<RenderedMapLayer, { type: 'vector' }>
    const layer = featureLayer.featureIdToLayer[deselected.feature.id]
    if (!layer || !this.map.hasLayer(featureLayer.layer)) return
    layer.closePopup()
  }

  onFeedRemoved(feed: { id: string }) {
    if (this.layers[feed.id]) {
      this.removeLayer(feed.id)
    }
  }

  onLayerRemoved(layer: MapLayer) {
    this.removeLayer(layer.id)
  }

  removeLayer(id: MapLayerId) {
    const layerInfo = this.layers[id]
    if (layerInfo) {
      this.map.removeLayer(layerInfo.layer)
      delete this.layers[id]

      Object.values(this.groups).forEach((group) => {
        group.layers = group.layers.filter(groupLayer => {
          return layerInfo.layer !== groupLayer.layer;
        });
      });
    }
  }

  adjustTemporalLayers() {
    this.temporalLayers.forEach(temporalLayer => {
      Object.values(temporalLayer.featureIdToLayer).forEach((layer) => {
        if (temporalLayer.temporal && 'feature' in layer && 'setColor' in layer) {
          const color = this.colorForFeature(layer.feature as MapFeature, temporalLayer.temporal)
          layer.setColor(color)
        }
      })
    })
  }

  openPopup(layer: MapFeatureLayer, options: { zoomToLocation?: boolean } = {}) {
    if (options.zoomToLocation) {
      this.map.once('moveend', function () {
        layer.fire('click')
      })
      this.map.setView((layer as LocationMarker | ObservationMarker).getLatLng(), 17)
    } else {
      layer.fire('click')
    }
  }

  colorForFeature(feature: MapFeature, options: { property: string, colorBuckets: any[] }) {
    const age = Date.now() - moment((feature.properties as any)?.[options.property]).valueOf()
    const bucket = _.find(options.colorBuckets, function (bucket: any) {
      return age > bucket.min && age <= bucket.max
    })
    return bucket ? bucket.color : null
  }

  createFeature(feature: MapFeature, delegate: { geometryChanged?: (geometry: any) => void, vertexClick?: (vertex: any) => void }) {
    // TODO put Observations in its own pane maybe??
    // TODO pass in layer collection id 'Observations'
    let editor = new FeatureEditor(this.map, feature, delegate)

    // TODO save feature pane opacitis
    const featurePaneOpacities = this.featurePanes.map(pane => {
      const mapPane = this.map.getPanes()[pane]
      return mapPane.style.opacity || "1"
    })
    this.setPaneOpacity(this.featurePanes, 0.5)

    const observations = this.layers['observations'] as Extract<RenderedMapLayer, { type: 'vector' }>
    const layer = observations.featureIdToLayer[feature.id]
    if (layer) {
      this.map.removeLayer(layer)
    }

    return {
      update: (feature: MapFeature) => {
        editor.stopEdit()
        editor = new FeatureEditor(this.map, feature, delegate)
      },
      cancel: () => {
        editor.stopEdit()
        if (layer?.feature) {
          this.onFeaturesChanged({
            id: 'observations',
            updated: [layer.feature as MapFeature]
          })
        }

        this.resetPaneOpacity(this.featurePanes, featurePaneOpacities)
      },
      save: () => {
        const newFeature = editor.stopEdit()
        if (layer?.feature) {
          (layer.feature as MapFeature).geometry = newFeature.geometry
          this.onFeaturesChanged({
            id: 'observations',
            updated: [layer.feature as MapFeature]
          })
        }

        this.resetPaneOpacity(this.featurePanes, featurePaneOpacities)
      }
    }
  }

  setPaneOpacity(panes: string[], opacityFactor: number) {
    panes.forEach(pane => {
      const mapPane = this.map.getPanes()[pane]
      const opacity = mapPane.style.opacity || "1"
      mapPane.style.opacity = `${parseFloat(opacity) * opacityFactor}`
    })
  }

  resetPaneOpacity(panes: string[], opacities: string[]) {
    panes.forEach((pane, index) => {
      const mapPane = this.map.getPanes()[pane]
      mapPane.style.opacity = opacities[index]
    })
  }

  layerTogged(event: ToggleEvent): void {
    if (event.layer.base) {
      this.baseToggled(event)
    } else {
      this.overlayToggled(event)
    }
  }

  baseToggled(event: ToggleEvent): void {
    const baseLayers = this.groups['base'].layers
    const previousBaseLayer = baseLayers.find((layer: any) => layer.selected)
    if (previousBaseLayer) {
      previousBaseLayer.selected = false
      this.map.removeLayer(previousBaseLayer.layer)
    }

    event.layer.selected = true
    this.map.addLayer(event.layer.layer)

    this.mapService.selectBaseLayer(event.layer)
  }

  overlayToggled(event: ToggleEvent): void {
    if (event.value) {
      this.map.addLayer(event.layer.layer)
    } else {
      this.map.removeLayer(event.layer.layer)
    }
  }

  private getGroup(layer: RenderedMapLayer): string {
    switch (layer.type) {
      case 'GeoPackage':
        return layer.renderAs === 'tile' ? 'tile' : 'feature'
      case 'Imagery':
        return layer.base ? 'base' : 'tile'
      case 'vector':
        return layer.group
      case 'grid':
        return 'grid'
    }
  }

  private isSelected(layer: RenderedMapLayer): boolean {
    return layer.selectedByDefault ?? false
  }
}