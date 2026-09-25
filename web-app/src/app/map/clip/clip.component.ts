import { Component, Input, ElementRef, OnDestroy, OnChanges, SimpleChanges, OnInit, ViewChild } from '@angular/core'
import { Feature } from 'geojson'
import { Map, GeoJSON, PathOptions, Layer, control, TileLayer, WMSOptions, Circle, LatLng } from 'leaflet'
import { MapService } from '../map.service'
import { LocalStorageService } from '../../http/local-storage.service'
import { fixedWidthMarker } from '../marker/FixedWidthMarker'
import { RasterLayer, RenderedRasterLayer } from '../entities.map-layer'

interface FeatureWithStyle extends Feature {
  style?: any
}

export interface PointAccuracy {
  latlng: LatLng,
  radius: number,
  color?: string,
  zoomTo: boolean
}

@Component({
    selector: 'map-clip',
    templateUrl: './clip.component.html',
    styleUrls: ['./clip.component.scss'],
    standalone: false
})
export class MapClipComponent implements OnInit, OnChanges, OnDestroy {
  @Input() feature: Feature
  @Input() accuracy: PointAccuracy

  @ViewChild('map', { static: true }) mapElement: ElementRef

  map: Map
  layer: GeoJSON
  accuracyLayer: Circle
  baseLayer?: Layer
  zoomControl = control.zoom()
  mapListener = {
    onBaseLayerSelected: this.onBaseLayerSelected.bind(this)
  }

  constructor(
    private mapService: MapService,
    private localStorageService: LocalStorageService) {
  }

  ngOnInit(): void {
    const mapPosition = this.localStorageService.getMapPosition();

    this.map = new Map(this.mapElement.nativeElement, {
      center: mapPosition.center,
      zoom: 15,
      minZoom: 0,
      maxZoom: 18,
      zoomControl: false,
      trackResize: true,
      scrollWheelZoom: false,
      attributionControl: false
    })

    this.map.scrollWheelZoom.disable()
    this.map.dragging.disable()
    this.map.touchZoom.disable()
    this.map.doubleClickZoom.disable()
    this.map.boxZoom.disable()
    this.map.keyboard.disable()

    this.mapService.addListener(this.mapListener)

    this.addFeature()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    this.addFeature();
  }

  ngOnDestroy(): void {
    this.mapService.removeListener(this.mapListener)
  }

  onBaseLayerSelected(selected: RenderedRasterLayer | null): void {
    if (!selected) return

    if (this.baseLayer) this.map.removeLayer(this.baseLayer)

    this.baseLayer = this.createRasterLayer(selected)
    this.baseLayer.addTo(this.map)
  }

  createRasterLayer(layer: RasterLayer): Layer {
    if (layer.format === 'WMS') {
      const options: WMSOptions = {
        layers: layer.wms.layers,
        version: layer.wms.version,
        format: layer.wms.format,
        transparent: layer.wms.transparent
      }

      if (layer.wms.styles) options.styles = layer.wms.styles
      return new TileLayer.WMS(layer.url, options)
    }

    return new TileLayer(layer.url, { tms: layer.format === 'TMS', maxZoom: 18 })
  }

  addFeature(): void {
    if (this.layer) {
      this.map.removeLayer(this.layer)
    }

    if (!this.feature || !this.feature.geometry) {
      const mapPosition = this.localStorageService.getMapPosition()
      this.map.setView(mapPosition.center, 1)
      return
    }

    this.layer = new GeoJSON(this.feature, {
      pointToLayer: function (feature: FeatureWithStyle, latlng): Layer {
        return fixedWidthMarker(latlng, {
          iconUrl: feature.style ? feature.style.iconUrl : ''
        })
      },
      style: function (feature: FeatureWithStyle): PathOptions {
        return feature.style
      }
    })

    let bounds = this.layer.getBounds()
    if (this.accuracy && this.accuracy.radius > 0) {
      this.accuracyLayer = new Circle(this.accuracy.latlng, {
        radius: this.accuracy.radius,
        color: this.accuracy.color,
        fillColor: this.accuracy.color,
        fillOpacity: 0.15,
        weight: 2,
        opacity: 0.5
      }).addTo(this.map)

      if (this.accuracy.zoomTo) {
        bounds = this.accuracyLayer.getBounds()
      }
    }

    this.layer.addTo(this.map)
    this.map.fitBounds(bounds)
  }
}
