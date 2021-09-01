import { Component, Input, ElementRef, Inject, OnDestroy, OnChanges, SimpleChanges, OnInit, ViewChild } from '@angular/core'
import { Feature } from 'geojson'
import { Map, GeoJSON, PathOptions, Layer, FixedWidthMarker, control, TileLayer, WMSOptions, Circle, LatLng } from 'leaflet'
import { LocalStorageService, MapService } from 'src/app/upgrade/ajs-upgraded-providers'

interface FeatureWithStyle extends Feature {
  style?: any
}

export interface PointAccuracy {
  latlng: LatLng,
  radius: number,
  color: string,
  zoomTo: boolean
}

@Component({
  selector: 'map-clip',
  templateUrl: './clip.component.html',
  styleUrls: ['./clip.component.scss']
})
export class MapClipComponent implements OnInit, OnChanges, OnDestroy {
  @Input() feature: Feature
  @Input() accuracy: PointAccuracy

  @ViewChild('map', { static: true }) mapElement: ElementRef

  map: Map
  layer: GeoJSON
  accuracyLayer: Circle
  layers = {}
  zoomControl = control.zoom()
  mapListener = {
    onBaseLayerSelected: this.onBaseLayerSelected.bind(this)
  }

  constructor(
    @Inject(MapService) private mapService: any,
    @Inject(LocalStorageService) private localStorageService: any) {
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

  onBaseLayerSelected(baseLayer): void {
    let layer = this.layers[baseLayer.name]
    if (layer) this.map.removeLayer(layer.layer)

    layer = this.createRasterLayer(baseLayer)
    this.layers[baseLayer.name] = { type: 'tile', layer: baseLayer, rasterLayer: layer }

    layer.addTo(this.map)
  }

  createRasterLayer(layer): Layer {
    let baseLayer: Layer = null
    if (layer.format === 'XYZ' || layer.format === 'TMS') {
      const options = { tms: layer.format === 'TMS', maxZoom: 18 }
      baseLayer = new TileLayer(layer.url, options)
    } else if (layer.format === 'WMS') {
      const options: WMSOptions = {
        layers: layer.wms.layers,
        version: layer.wms.version,
        format: layer.wms.format,
        transparent: layer.wms.transparent
      }

      if (layer.wms.styles) options.styles = layer.wms.styles
      baseLayer = new TileLayer.WMS(layer.url, options)
    }

    return baseLayer
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
        return new FixedWidthMarker(latlng, {
          iconUrl: feature.style ? feature.style.iconUrl : ''
        })
      },
      style: function (feature: FeatureWithStyle): PathOptions {
        return feature.style
      }
    })

    let bounds = this.layer.getBounds()
    if (this.accuracy && this.accuracy.radius > 0) {
      this.accuracyLayer = new Circle(this.accuracy.latlng, this.accuracy.radius, {
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