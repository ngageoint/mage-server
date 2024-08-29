import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core'
import { LocationState } from '../../app/map/controls/location.component'
import { ZoomDirection } from '../../app/map/controls/zoom.component'
import { LayerService } from '../layer/layer.service'
import { MapLayerService, StyleEvent, ToggleEvent } from './layers/layer.service'
import { MapService } from './map.service'
import { LocalStorageService } from '../http/local-storage.service'
import { EventService } from '../event/event.service'
import { map, latLng, popup,tileLayer, Icon, Util, marker, TileLayer, geoJSON, latLngBounds, LatLng, markerClusterGroup, Layer, Map, LeafletEvent } from "leaflet"
import { OpacityEvent, ZoomEvent } from './layers/layer.service'
import { ReorderEvent } from './layers/layers.component'
import { moveItemInArray } from '@angular/cdk/drag-drop'
import { locationMarker } from './marker/LocationMarker'
import { observationMarker } from './marker/ObservationMarker'
import { COUNTRIES as countries } from './layers/static/layers'

import _ from 'underscore'
import * as moment from 'moment'

import 'leaflet-editable'
import 'leaflet.markercluster'
import { FeatureEditor } from './edit/FeatureEditor'
import GeoPackageLayers from './geopackage/GeoPackageLayers'
import { FilterService } from '../filter/filter.service'
import { GARSLayer } from './layers/gars/GARSLayer'
import { MGRSLayer } from './layers/mgrs/MGRSLayer'
import { UserService } from '../user/user.service'

Icon.Default.imagePath = '/'

@Component({
  selector: 'map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  providers: [LayerService]
})
export class MapComponent implements OnDestroy, AfterViewInit {

  public static readonly PANE_Z_INDEX_BUCKET_SIZE = 10000
  public static readonly BASE_PANE_Z_INDEX_OFFSET = 1 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE
  public static readonly TILE_PANE_Z_INDEX_OFFSET = 2 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE
  public static readonly GRID_PANE_Z_INDEX_OFFSET = 3 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE
  public static readonly FEATURE_PANE_Z_INDEX_OFFSET = 6 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE
  public static readonly MAGE_PANE_Z_INDEX_OFFSET = 7 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE
  
  @Output() addObservation = new EventEmitter<any>()

  @ViewChild('map') mapElement: ElementRef<any>
  mapReizeObserver?: ResizeObserver

  map: Map
  groups: any = {
    'base': {
      offset: MapComponent.BASE_PANE_Z_INDEX_OFFSET,
      layers: []
    },
    'MAGE': {
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
  layers: any = {}
  geoPackageLayers: any
  temporalLayers: any = []
  spiderfyState: any = null
  currentLocation: any = null
  locationLayer = locationMarker([0, 0], { color: '#136AEC' })
  locate = LocationState.OFF
  broadcast = LocationState.OFF
  searchMarker: any
  featurePanes = []
  BASE_LAYER_PANE = 'baseLayerPane'
  listener: any
  pollListener: any

  constructor(
    private mapService: MapService,
    private userService: UserService,
    private layerService: MapLayerService,
    private eventService: EventService,
    private filterService: FilterService,
    private localStorageService: LocalStorageService
  ) {
    layerService.toggle$.subscribe(event => this.layerTogged(event));
    layerService.zoom$.subscribe(event => this.zoom(event));
    layerService.opacity$.subscribe(event => this.opacityChanged(event));
    layerService.style$.subscribe(event => this.styleChanged(event));

    this.mapReizeObserver = new ResizeObserver(() => {
      this.map.invalidateSize({ pan: false, debounceMoveend: true })
    })
  }

  ngAfterViewInit() {
    this.mapReizeObserver?.observe(this.mapElement.nativeElement)

    let mapPosition = this.localStorageService.getMapPosition()
    if (!mapPosition) {
      this.localStorageService.setMapPosition({
        center: { lng: 0, lat: 0 },
        zoom: 3
      })
      mapPosition = this.localStorageService.getMapPosition()
    }

    this.map = map('map', {
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
    this.map.createPane(this.BASE_LAYER_PANE)
    this.map.getPane(this.BASE_LAYER_PANE).style.zIndex = `${100 * 100}`

    this.map.getPane('tilePane').style.zIndex = `${200 * 100}`
    this.map.getPane('overlayPane').style.zIndex = `${400 * 100}`
    this.map.getPane('shadowPane').style.zIndex = `${500 * 100}`
    this.map.getPane('markerPane').style.zIndex = `${600 * 100}`
    this.map.getPane('tooltipPane').style.zIndex = `${700 * 100}`
    this.map.getPane('popupPane').style.zIndex = `${800 * 100}`

    // Add in a base layer of styled GeoJSON in case the tiles do not load
    const FALLBACK_LAYER_PANE = 'fallbackLayerPane'
    this.map.createPane(FALLBACK_LAYER_PANE)
    this.map.getPane(FALLBACK_LAYER_PANE).style.zIndex = '1'

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

    function saveMapPosition() {
      const center = this.map.getCenter()
      this.localStorageService.setMapPosition({
        center: latLng(Util.formatNum(center.lat), Util.formatNum(center.lng)),
        zoom: this.map.getZoom()
      })
    }
    this.map.on('moveend', saveMapPosition, this)

    this.geoPackageLayers = new GeoPackageLayers(
      this.map,
      this.layerService,
      this.filterService,
      this.localStorageService
    )

    this.pollListener = {
      onPoll: this.onPoll.bind(this)
    }

    // Ensure that any changes made by listener callbacks are processed in a digest cycle
    // TODO this can be removed when the services use rxjs rather than custom change detection w/  callbacks
    setTimeout(() => {
      this.mapService.setDelegate(this)
      this.mapService.addListener(this)
      this.eventService.addPollListener(this.pollListener)
    })
  }

  ngOnDestroy(): void {
    this.mapService.removeListener(this)
    this.mapReizeObserver?.unobserve(this.mapElement.nativeElement);
  }

  saveMapPosition() {
    const center = this.map.getCenter()
    this.localStorageService.setMapPosition({
      center: latLng(Util.formatNum(center.lat), Util.formatNum(center.lng)),
      zoom: this.map.getZoom()
    })
  }

  $onDestroy() {
    this.mapService.removeListener(this.listener)
    this.eventService.removePollListener(this.pollListener)
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

  zoom($event: ZoomEvent): void {
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

  onZoom($event) {
    if ($event.direction === ZoomDirection.IN) {
      this.map.zoomIn(1)
    } else {
      this.map.zoomOut(1)
    }
  }

  onSearch($event) {
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

  onPoll() {
    this.adjustTemporalLayers()
  }
  
  onAddObservation() {
    this.addObservation.emit({
      latLng: this.map.getCenter()
    })
  }

  onLocate($event) {
    this.locate = $event.state
    if (this.locate === LocationState.ON) {
      this.map.locate({
        watch: true,
        setView: false
      })
    } else {
      this.map.stopLocate()

      if (this.map.hasLayer(this.locationLayer)) {
        this.map.removeLayer(this.locationLayer)
      }
      this.currentLocation = null
    }
  }

  onLocation(location) {
    // skip if the location has not changed
    if (
      this.currentLocation &&
      this.currentLocation.latitude === location.latlng.lat &&
      this.currentLocation.longitude === location.latlng.lng &&
      this.currentLocation.accuracy === location.accuracy
    ) {
      return
    }

    this.currentLocation = location
    this.map.fitBounds(location.bounds)
    this.locationLayer.setLatLng(location.latlng).setAccuracy(location.accuracy)
    if (!this.map.hasLayer(this.locationLayer)) {
      this.map.addLayer(this.locationLayer)
    }

    if (this.broadcast === LocationState.ON) {
      this.mapService.onLocation(location)
    }
  }

  onBroadcast($event) {
    if (this.eventService.isUserInEvent(this.userService.myself, this.filterService.getEvent())) {
      this.broadcast = $event.state
      if (this.locate !== LocationState.ON) {
        this.map.locate({
          watch: true,
          setView: false
        })
      }
    } else {
      //Dialog
      // this.$uibModal.open({
      //   template: require('../error/not.in.event.html'),
      //   controller: 'NotInEventController',
      //   resolve: {
      //     title: function () {
      //       return 'Cannot Broadcast Location';
      //     }
      //   }
      // });
      console.log('show not in event dialog')
    }
  }

  onLocationStop() {
    // TODO is this used
    // this.userLocationControl.stopBroadcast()
  }

  onLayersChanged({ id, added = [], removed = [] }) {
    added.forEach(added => {
      switch (added.type) {
        case 'GeoPackage':
          this.createGeoPackageLayer(added)
          break
        case 'Imagery':
          this.createRasterLayer(added)
          break
        case 'geojson':
          this.createGeoJsonLayer(added)
          break
        case 'grid':
          this.createGridLayer(added)
          break
      }
    })

    removed.forEach(removed => {
      const layer = this.layers[id]
      if (layer) {
        this.map.removeLayer(layer.layer)
        delete layer.layer
        delete this.layers[removed.layerId]
        this.removeLayer(layer)
      }
    })
  }

  // TODO move into leaflet service, this and map clip both use it
  createRasterLayer(layerInfo) {
    let paneName = this.BASE_LAYER_PANE
    if (!layerInfo.base) {
      paneName = `pane-${layerInfo.id}`
      this.map.createPane(paneName)
    }

    let options: any = {}
    if (layerInfo.format === 'XYZ' || layerInfo.format === 'TMS') {
      options = { tms: layerInfo.format === 'TMS', maxZoom: 18, pane: paneName }
      layerInfo.layer = tileLayer(layerInfo.url, options)
    } else if (layerInfo.format === 'WMS') {
      options = {
        layers: layerInfo.wms.layers,
        version: layerInfo.wms.version,
        format: layerInfo.wms.format,
        transparent: layerInfo.wms.transparent,
        pane: paneName
      }

      if (layerInfo.wms.styles) options.styles = layerInfo.wms.styles
      layerInfo.layer = new TileLayer.WMS(layerInfo.url, options)
    }

    layerInfo.layer.pane = paneName
    this.layers[layerInfo.id] = layerInfo
    this.addLayer(layerInfo)
  }

  createGeoPackageLayer(layerInfo) {
    layerInfo.tables.forEach(table => {
      const pane = `pane-${layerInfo.id}-${table.name}`
      this.map.createPane(pane)
      if (table.type === 'feature') {
        this.featurePanes.push(pane)
      }

      table.layer = this.geoPackageLayers.createGeoPackageLayer(table, layerInfo.id, pane)
      this.layers[layerInfo.id + table.name] = table

      this.addLayer({
        type: 'GeoPackage',
        name: table.name,
        table: table,
        layer: table.layer
      })
    })
  }

  createGeoJsonLayer(layerInfo) {
    const pane = `pane-${layerInfo.id}`
    this.map.createPane(pane)
    this.featurePanes.push(pane)

    layerInfo.featureIdToLayer = {}
    const geojson = this.createGeoJsonForLayer(layerInfo.geojson, layerInfo, pane)

    if (layerInfo.options.cluster) {
      layerInfo.layer = markerClusterGroup({
        pane: pane,
        clusterPane: pane
      }).addLayer(geojson)

      layerInfo.layer.on('spiderfied', function () {
        if (this.spiderfyState) {
          this.spiderfyState.layer.openPopup()
        }
      })
    } else {
      layerInfo.layer = geojson
    }

    layerInfo.layer.pane = pane
    this.layers[layerInfo.id] = layerInfo

    if (layerInfo.options.temporal) {
      this.temporalLayers.push(layerInfo)
    }

    if (!layerInfo.options.hidden) {
      this.addLayer(layerInfo)
    }
  }

  createGeoJsonForLayer(json, layerInfo, pane, editMode?: any) {
    const popup = layerInfo.options.popup
    const geojson = geoJSON(json, {
      pane: pane,
      onEachFeature: function (feature, layer) {
        if (popup) {
          if (_.isFunction(popup.html)) {
            const options: any = { autoPan: false, maxWidth: 400 }
            if (popup.closeButton !== undefined) options.closeButton = popup.closeButton
            layer.bindPopup(popup.html(feature, layer), options)
          }
          if (_.isFunction(popup.onOpen)) {
            layer.on('popupopen', function () {
              popup.onOpen(feature)
            })
          }
          if (_.isFunction(popup.onClose)) {
            layer.on('popupclose', function () {
              popup.onClose(feature)
            })
          }
        }
        if (layerInfo.options.onLayer) {
          layerInfo.options.onLayer(layer, feature)
        }
        layerInfo.featureIdToLayer[feature.id] = layer
      },
      pointToLayer: (feature: any, latlng: LatLng) => {
        let layer: Layer

        if (layerInfo.options.temporal) {
          const temporalOptions: any = {
            pane: pane,
            accuracy: feature.properties.accuracy,
            color: this.colorForFeature(feature, layerInfo.options.temporal)
          }
          if (feature.style && feature.style.iconUrl) {
            temporalOptions.iconUrl = feature.style.iconUrl
          }
          layer = locationMarker(latlng, temporalOptions)
        } else {
          const options: any = {
            pane: pane,
            accuracy: feature.properties.accuracy
          }
          if (layerInfo.options.iconUrl) {
            options.iconUrl = layerInfo.options.iconUrl
          } else if (feature.style && feature.style.iconUrl) {
            options.iconUrl = feature.style.iconUrl
          }
          
          if (layerInfo.options.iconWidth) {
            options.iconWidth = 24
          }
          options.tooltip = editMode
          layer = observationMarker(latlng, options)
        }

        if (layerInfo.options.onLayer) {
          layerInfo.options.onLayer(layer, feature)
        }

        return layer
      },
      style: function (feature: any) {
        return feature.style
      }
    })

    return geojson
  }

  createGridLayer(layerInfo) {
    const pane = `pane-${layerInfo.id}`
    this.map.createPane(pane)

    this.layers[layerInfo.id] = layerInfo
    if (layerInfo.id === 'gars') {
      layerInfo.layer = new GARSLayer()
      layerInfo.layer.pane = pane
    } else if (layerInfo.id === 'mgrs') {
      layerInfo.layer = new MGRSLayer()
      layerInfo.layer.pane = pane
    }

    this.addLayer(layerInfo)
  }

  addLayer(layerInfo: any) {
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
    const pane = this.map.getPanes()[layerInfo.layer.pane]
    pane.style.zIndex = layerInfo.zIndex
    group.layers.push(layerInfo)
  }

  onFeaturesChanged({ id, added = [], updated = [], removed = [] }) {
    const featureLayer = this.layers[id]
    const pane = featureLayer.layer.pane
    added.forEach(feature => {
      if (featureLayer.options.cluster) {
        const layer = this.createGeoJsonForLayer(feature, featureLayer, pane)
        featureLayer.layer.addLayer(layer)
      } else {
        featureLayer.layer.addData(feature)
      }
    })

    updated.forEach(feature => {
      const layer = featureLayer.featureIdToLayer[feature.id]
      if (layer) {
        featureLayer.layer.removeLayer(layer)
      }

      if (featureLayer.options.cluster) {
        featureLayer.layer.addLayer(this.createGeoJsonForLayer(feature, featureLayer, pane))
      } else {
        featureLayer.layer.addData(feature)
      }
    })

    removed.forEach(feature => {
      const layer = featureLayer.featureIdToLayer[feature.id]
      if (layer) {
        delete featureLayer.featureIdToLayer[feature.id]
        featureLayer.layer.removeLayer(layer)
      }
    })
  }

  onFeatureZoom(zoom) {
    const featureLayer = this.layers[zoom.id]
    const layer = featureLayer.featureIdToLayer[zoom.feature.id]
    if (!this.map.hasLayer(featureLayer.layer)) return

    if (featureLayer.options.cluster) {
      if (this.map.getZoom() < 17) {
        if (layer.getBounds) {
          // Zoom and center polyline/polygon
          this.map.fitBounds(layer.getBounds(), {
            maxZoom: 17
          })
          this.openPopup(layer, {})
        } else {
          // Zoom and center point
          this.map.once('zoomend', () => {
            featureLayer.layer.zoomToShowLayer(layer, () => {
              this.openPopup(layer, { zoomToLocation: false })
            })
          })
          this.map.setView(layer.getLatLng(), 17)
        }
      } else {
        if (layer.getBounds) {
          this.map.fitBounds(layer.getBounds(), {
            maxZoom: 17
          })
          this.openPopup(layer, {})
        } else {
          featureLayer.layer.zoomToShowLayer(layer, () => {
            this.openPopup(layer, { zoomToLocation: false })
          })
        }
      }
    } else {
      this.openPopup(layer, { zoomToLocation: true })
    }
  }

  onFeatureDeselect(deselected) {
    const featureLayer = this.layers[deselected.id]
    const layer = featureLayer.featureIdToLayer[deselected.feature.id]
    if (!this.map.hasLayer(featureLayer.layer)) return
    layer.closePopup()
  }

  onFeedRemoved(feed) {
    const layerInfo = this.layers[feed.id]
    if (layerInfo) {
      this.removeLayer(layerInfo)
    }
  }

  onLayerRemoved(layer) {
    switch (layer.type) {
      case 'GeoPackage':
        this.removeGeoPackage(layer)
        break
      default:
        this.removeLayer(layer)
    }
  }

  removeLayer(layer) {
    const layerInfo = this.layers[layer.id]
    if (layerInfo) {
      this.map.removeLayer(layerInfo.layer)
      delete this.layers[layer.id]

      Object.values(this.groups).forEach((group: any) => {
        group.layers = group.layers.filter(layer => {
          return layer.layer !== layer.layer;
        });
      });
    }
  }

  removeGeoPackage(layer) {
    layer.tables.forEach(table => {
      const id = layer.id + table.name
      const layerInfo = this.layers[id]
      if (layerInfo) {
        this.map.removeLayer(table.layer)
        delete this.layers[id]
        this.removeLayer(layerInfo)
      }
    })
  }

  onHideFeed() {
    this.map.invalidateSize({ pan: false })
  }

  adjustTemporalLayers() {
    this.temporalLayers.forEach(temporalLayer => {
      Object.values(temporalLayer.featureIdToLayer).forEach((layer: any) => {
        const color = this.colorForFeature(layer.feature, temporalLayer.options.temporal)
        layer.setColor(color)
      })
    })
  }

  openPopup(layer, options) {
    options = options || {}
    if (options.zoomToLocation) {
      this.map.once('moveend', function () {
        layer.fire('click')
      })
      this.map.setView(layer.getLatLng(), options.zoomToLocation ? 17 : this.map.getZoom())
    } else {
      layer.fire('click')
    }
  }

  colorForFeature(feature, options) {
    const age = Date.now() - moment(feature.properties[options.property]).valueOf()
    const bucket = _.find(options.colorBuckets, function (bucket) {
      return age > bucket.min && age <= bucket.max
    })
    return bucket ? bucket.color : null
  }

  createFeature(feature, delegate) {
    // TODO put Observations in its own pane maybe??
    // TODO pass in layer collection id 'Observations'
    let editor = new FeatureEditor(this.map, feature, delegate)

    // TODO save feature pane opacitis
    const featurePaneOpacities = this.featurePanes.map(pane => {
      const mapPane = this.map.getPanes()[pane]
      return mapPane.style.opacity || 1
    })
    this.setPaneOpacity(this.featurePanes, 0.5)

    const layer = this.layers['observations'].featureIdToLayer[feature.id]
    if (layer) {
      this.map.removeLayer(layer)
    }

    return {
      update: feature => {
        editor.stopEdit()
        editor = new FeatureEditor(this.map, feature, delegate)
      },
      cancel: () => {
        editor.stopEdit()
        if (layer) {
          this.onFeaturesChanged({
            id: 'observations',
            updated: [layer.feature]
          })
        }

        this.resetPaneOpacity(this.featurePanes, featurePaneOpacities)
      },
      save: () => {
        const newFeature = editor.stopEdit()
        if (layer) {
          layer.feature.geometry = newFeature.geometry
          this.onFeaturesChanged({
            id: 'observations',
            updated: [layer.feature]
          })
        }

        this.resetPaneOpacity(this.featurePanes, featurePaneOpacities)
      }
    }
  }

  setPaneOpacity(panes, opacityFactor) {
    panes.forEach(pane => {
      const mapPane = this.map.getPanes()[pane]
      const opacity = mapPane.style.opacity || "1"
      mapPane.style.opacity = `${parseInt(opacity)} * ${opacityFactor}`
    })
  }

  resetPaneOpacity(panes, opacities) {
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

  private getGroup(layer): string {
    switch (layer.type) {
      case 'GeoPackage':
        return layer.layer.table.type === 'tile' ? 'tile' : 'feature'
      case 'Imagery':
        return layer.base ? 'base' : 'tile'
      case 'geojson':
        return layer.group
      case 'grid':
        return layer.group
    }
  }

  private isSelected(layer): boolean {
    return layer.options && layer.options.selected
  }
}