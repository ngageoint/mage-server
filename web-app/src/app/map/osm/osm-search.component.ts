import { ChangeDetectorRef, Component, Inject, OnDestroy } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { HttpEventType, HttpResponse } from '@angular/common/http'
import { Subscription, filter, timer, switchMap, exhaustMap, take, timeout, tap } from 'rxjs'
import { GeoJSON as LeafletGeoJSON, Map as LeafletMap, geoJSON, circleMarker } from 'leaflet'
import { OsmService } from './osm.service'
import { AreaShape, OsmAreaDrawing } from './osm-area-drawing'
import { OsmBounds, OsmFeature, OsmSearchResponse, OsmExportFormat, OSM_ALIASES, OSM_MAX_SEARCH_LENGTH, OSM_MAX_DEGREES, OSM_MAX_AREA_KM2 } from './osm.types'
import { FilterService } from '../../filter/filter.service'
import { EventService } from '../../event/event.service'
import { SessionService } from '../../http/session.service'
import { LayersService, Layer } from '../../admin/admin-layers/layers.service'

export interface OsmSearchDialogData {
  map: LeafletMap;
  onLayerSaved?: (layerId: number | string) => void;
}

type Phase = 'idle' | 'searching' | 'results' | 'error'

const PREVIEW_PANE = 'osmPreviewPane'
const STYLE_SELECTED = { color: '#d9480f', weight: 2, opacity: 0.95, fillColor: '#ff922b', fillOpacity: 0.35 }
const STYLE_UNSELECTED = { color: '#868e96', weight: 1, opacity: 0.6, fillColor: '#adb5bd', fillOpacity: 0.1 }

@Component({
  selector: 'osm-search',
  templateUrl: './osm-search.component.html',
  styleUrls: ['./osm-search.component.scss'],
  standalone: false
})
export class OsmSearchComponent implements OnDestroy {
  readonly aliases = OSM_ALIASES
  readonly maxLength = OSM_MAX_SEARCH_LENGTH
  readonly maxDegrees = OSM_MAX_DEGREES
  readonly maxArea = OSM_MAX_AREA_KM2.toLocaleString('en-US')

  search = ''
  phase: Phase = 'idle'
  errorMessage = ''
  result: OsmSearchResponse | null = null
  selected = new Set<string>()
  searchedEventName = ''

  downloading = false
  downloadError = ''

  layerName = ''
  saving = false
  saveError = ''
  savedLayer: Layer | null = null
  savedEventId: number | string | null = null
  sharing = false
  shared = false
  shareError = ''

  private map: LeafletMap
  private previewLayer: LeafletGeoJSON | null = null
  private layersById: Record<string, any> = {}
  private subscriptions: Subscription[] = []
  private expiryTimer: any = null
  expired = false
  readonly areaDrawing: OsmAreaDrawing

  constructor(
    private dialogRef: MatDialogRef<OsmSearchComponent>,
    @Inject(MAT_DIALOG_DATA) private data: OsmSearchDialogData,
    private osmService: OsmService,
    private filterService: FilterService,
    private eventService: EventService,
    private sessionService: SessionService,
    private layersService: LayersService,
    private cdr: ChangeDetectorRef
  ) {
    this.map = data.map
    this.areaDrawing = new OsmAreaDrawing(this.map, () => this.cdr.markForCheck())
  }

  get event(): any { return this.filterService.getEvent() }
  get canDownload(): boolean {
    return this.sessionService.hasPermission('READ_LAYER_EVENT') || this.sessionService.hasPermission('READ_LAYER_ALL')
  }
  get canSave(): boolean { return this.sessionService.hasPermission('CREATE_LAYER') }
  get features(): OsmFeature[] { return this.result?.features || [] }
  get selectedCount(): number { return this.selected.size }
  get busy(): boolean { return this.phase === 'searching' || this.downloading || this.saving || this.sharing }
  get allSelected(): boolean { return this.features.length > 0 && this.selected.size === this.features.length }
  get canExport(): boolean { return !!this.result && !this.expired && this.selected.size > 0 && !this.busy }
  get expiresLabel(): string {
    if (!this.result?.expiresAt) return ''
    const d = new Date(this.result.expiresAt)
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString()
  }

  currentBounds(): OsmBounds {
    const areaBounds = this.areaDrawing.bounds()
    if (areaBounds) return areaBounds
    const b = this.map.getBounds()
    return { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }
  }

  useAlias(alias: string): void {
    if (this.busy) return
    this.search = alias
  }

  runSearch(): void {
    if (this.busy || this.areaDrawing.mode) return
    const event = this.event
    if (!event) { this.fail('Select an event before searching.'); return }
    const searchError = this.osmService.validateSearch(this.search)
    if (searchError) { this.fail(searchError); return }
    const bounds = this.currentBounds()
    const boundsError = this.osmService.validateBounds(bounds)
    if (boundsError) { this.fail(boundsError); return }

    this.resetResults()
    this.phase = 'searching'
    this.searchedEventName = event.name
    this.subscriptions.push(this.osmService.search(bounds, this.search.trim(), this.areaDrawing.area).subscribe({
      next: response => {
        this.result = { ...response, features: Array.isArray(response?.features) ? response.features : [] }
        this.features.forEach(f => this.selected.add(String(f.id)))
        this.layerName = `OSM ${this.search.trim()} ${new Date().toISOString().slice(0, 10)}`
        this.phase = 'results'
        this.scheduleExpiry()
        this.renderPreview()
        this.cdr.markForCheck()
      },
      error: err => this.fail(OsmService.errorMessage(err, 'The search failed. Try again.'))
    }))
  }

  drawArea(shape: AreaShape): void {
    if (this.busy) return
    this.resetResults()
    this.phase = 'idle'
    this.areaDrawing.start(shape)
  }

  useVisibleArea(): void {
    if (this.busy) return
    this.resetResults()
    this.phase = 'idle'
    this.areaDrawing.useViewport()
  }

  private fail(message: string): void {
    this.phase = 'error'
    this.errorMessage = message
    this.cdr.markForCheck()
  }

  private resetResults(): void {
    this.clearPreview()
    clearTimeout(this.expiryTimer)
    this.result = null
    this.expired = false
    this.selected.clear()
    this.errorMessage = ''
    this.downloadError = ''
    this.saveError = ''
    this.savedLayer = null
    this.savedEventId = null
    this.shared = false
    this.shareError = ''
  }

  private scheduleExpiry(): void {
    const at = new Date(this.result?.expiresAt || '').getTime()
    if (!Number.isFinite(at)) return
    const ms = at - Date.now()
    if (ms <= 0) { this.expired = true; return }
    this.expiryTimer = setTimeout(() => { this.expired = true; this.cdr.markForCheck() }, Math.min(ms, 2147483647))
  }

  isSelected(f: OsmFeature): boolean { return this.selected.has(String(f.id)) }

  toggle(f: OsmFeature, value: boolean): void {
    const id = String(f.id)
    value ? this.selected.add(id) : this.selected.delete(id)
    this.styleFeature(id)
  }

  selectAll(): void { this.features.forEach(f => this.selected.add(String(f.id))); this.restyleAll() }
  selectNone(): void { this.selected.clear(); this.restyleAll() }

  featureName(f: OsmFeature): string { return f.properties?.name ? String(f.properties.name) : 'Unnamed' }
  featureType(f: OsmFeature): string {
    const tags = this.parseTags(f)
    for (const key of ['amenity', 'shop', 'tourism', 'leisure', 'building', 'highway', 'natural', 'emergency']) {
      if (tags[key]) return `${key}=${tags[key]}`
    }
    return String(f.properties?.osm_type || f.geometry?.type || 'feature')
  }
  osmLink(f: OsmFeature): string | null {
    const src = f.properties?.source
    return typeof src === 'string' && src.startsWith('https://www.openstreetmap.org/') ? src : null
  }

  private parseTags(f: OsmFeature): Record<string, string> {
    try {
      const t = typeof f.properties?.tags === 'string' ? JSON.parse(f.properties.tags) : f.properties?.tags
      return t && typeof t === 'object' ? t : {}
    } catch { return {} }
  }

  zoomTo(f: OsmFeature): void {
    const layer = this.layersById[String(f.id)]
    if (!layer) return
    if (layer.getBounds) this.map.fitBounds(layer.getBounds(), { maxZoom: 17 })
    else if (layer.getLatLng) this.map.setView(layer.getLatLng(), Math.max(this.map.getZoom(), 16))
    layer.openPopup?.()
  }

  // ---- map preview (text-only popups) ----
  private renderPreview(): void {
    this.clearPreview()
    if (!this.features.length) return
    if (!this.map.getPane(PREVIEW_PANE)) {
      this.map.createPane(PREVIEW_PANE)
      this.map.getPane(PREVIEW_PANE).style.zIndex = `${650 * 100}`
    }
    this.previewLayer = geoJSON(this.features as any, {
      pane: PREVIEW_PANE,
      style: () => STYLE_SELECTED,
      pointToLayer: (_f, latlng) => circleMarker(latlng, { ...STYLE_SELECTED, radius: 7, pane: PREVIEW_PANE }),
      onEachFeature: (feature: any, layer: any) => {
        this.layersById[String(feature.id)] = layer
        layer.bindPopup(() => this.popupElement(feature), { className: 'leaflet-material-popup', maxWidth: 300 })
      }
    }).addTo(this.map)
  }

  private popupElement(feature: OsmFeature): HTMLElement {
    const root = document.createElement('div')
    root.className = 'osm-popup'
    const title = document.createElement('strong')
    title.textContent = this.featureName(feature)
    const type = document.createElement('div')
    type.textContent = this.featureType(feature)
    root.append(title, type)
    const link = this.osmLink(feature)
    if (link) {
      const a = document.createElement('a')
      a.href = link
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.textContent = 'View on OpenStreetMap'
      root.append(a)
    }
    const attr = document.createElement('div')
    attr.className = 'osm-popup__attribution'
    attr.textContent = String(feature.properties?.attribution || this.result?.attribution || '')
    root.append(attr)
    return root
  }

  private styleFeature(id: string): void {
    const layer = this.layersById[id]
    if (!layer?.setStyle) return
    layer.setStyle(this.selected.has(id) ? STYLE_SELECTED : STYLE_UNSELECTED)
  }

  private restyleAll(): void { Object.keys(this.layersById).forEach(id => this.styleFeature(id)) }

  private clearPreview(): void {
    if (this.previewLayer) {
      this.previewLayer.eachLayer((l: any) => { l.closePopup?.(); l.unbindPopup?.() })
      this.map.removeLayer(this.previewLayer)
      this.previewLayer = null
    }
    this.layersById = {}
  }

  // ---- export / download ----
  download(format: OsmExportFormat = 'gpkg'): void {
    if (!this.canExport || !this.canDownload) return
    this.downloading = true
    this.downloadError = ''
    this.subscriptions.push(this.osmService.export(this.result!.searchId, [...this.selected], format).subscribe({
      next: blob => {
        this.downloading = false
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `osm-search.${format}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        this.cdr.markForCheck()
      },
      error: async err => {
        this.downloadError = await OsmService.blobErrorMessage(err, 'Download failed.')
        if (err?.status === 404 || err?.status === 410) this.expired = true
        this.downloading = false
        this.cdr.markForCheck()
      }
    }))
  }

  // ---- save as layer, then share to event ----
  saveLayer(): void {
    if (!this.canExport || !this.canSave || this.savedLayer) return
    const event = this.event
    if (!event) { this.saveError = 'Select an event before saving.'; return }
    const name = this.layerName.trim()
    if (!name) { this.saveError = 'Enter a layer name.'; return }
    this.saving = true
    this.saveError = ''
    this.updateCloseLock()
    const eventId = event.id
    this.subscriptions.push(this.osmService.export(this.result!.searchId, [...this.selected]).subscribe({
      next: blob => {
        const form = new FormData()
        form.append('name', name)
        form.append('type', 'GeoPackage')
        form.append('description', this.result?.attribution || 'Data from OpenStreetMap contributors, ODbL')
        form.append('geopackage', new File([blob], 'osm-search.gpkg', { type: 'application/geopackage+sqlite3' }))
        this.subscriptions.push(this.layersService.createLayer(form).pipe(
          filter(e => e.type === HttpEventType.Response)
        ).subscribe({
          next: (res: any) => {
            this.saving = false
            this.savedLayer = (res as HttpResponse<Layer>).body
            this.savedEventId = eventId
            this.updateCloseLock()
            this.share()
          },
          error: err => {
            this.saving = false
            this.saveError = OsmService.errorMessage(err, 'Saving the layer failed.')
            this.updateCloseLock()
          }
        }))
      },
      error: async err => {
        this.saveError = await OsmService.blobErrorMessage(err, 'Preparing the GeoPackage failed.')
        if (err?.status === 404 || err?.status === 410) this.expired = true
        this.saving = false
        this.updateCloseLock()
      }
    }))
  }

  /** Shares the already-saved layer. Never re-uploads, so retry cannot create duplicates. */
  share(): void {
    if (!this.savedLayer?.id || this.savedEventId == null || this.sharing || this.shared) return
    this.sharing = true
    this.shareError = ''
    this.updateCloseLock()
    const eventId = this.savedEventId
    const layerId = this.savedLayer.id
    // The ordinary upload route returns before optimization finishes. Do not
    // refresh the event while its default layer listing still omits this file.
    this.subscriptions.push(timer(0, 1500).pipe(
      // A slow status request must finish, not be cancelled by the next tick.
      exhaustMap(() => this.layersService.getLayerById(String(layerId))),
      tap(layer => { this.savedLayer = layer; this.cdr.markForCheck() }),
      filter(layer => layer.state === 'available' || !!layer.invalid),
      take(1),
      timeout(120000),
      switchMap(layer => {
        if (layer.invalid) throw new Error('The saved GeoPackage failed validation. Review it in Layers.')
        return this.osmService.shareLayer(eventId, layerId)
      })
    ).subscribe({
      next: () => {
        this.sharing = false
        this.shared = true
        const current = this.event
        if (current && String(current.id) === String(eventId)) {
          this.data.onLayerSaved?.(layerId)
          this.eventService.fetchLayers(current)
        }
        this.updateCloseLock()
      },
      error: err => {
        this.sharing = false
        const msg = OsmService.errorMessage(err, 'The layer may still be processing. Retry sharing shortly, or review it in Layers.')
        this.shareError = err?.status === 403
          ? 'The layer was saved, but you do not have permission to update this event. Ask an event manager to add it.'
          : `The layer was saved, but adding it to the event failed: ${msg}`
        this.updateCloseLock()
      }
    }))
  }

  get layerStateMessage(): string {
    const s = this.savedLayer?.state
    if (s === 'processing') return 'The layer is processing on the server and will appear when ready.'
    if (s === 'unavailable') return 'The server marked the layer unavailable. An administrator can review it under Layers.'
    return ''
  }

  /** Upload and share are irreversible server writes; block closing while they run. */
  get closeLocked(): boolean { return this.saving || this.sharing }

  private updateCloseLock(): void {
    this.dialogRef.disableClose = this.closeLocked
    this.cdr.markForCheck()
  }

  close(): void {
    if (this.closeLocked) return
    this.dialogRef.close()
  }

  ngOnDestroy(): void {
    this.areaDrawing.destroy()
    this.subscriptions.forEach(s => s.unsubscribe())
    clearTimeout(this.expiryTimer)
    this.clearPreview()
  }
}
