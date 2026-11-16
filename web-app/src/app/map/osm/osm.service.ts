import { Injectable } from '@angular/core'
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { Observable, switchMap, map } from 'rxjs'
import { OsmArea, OsmBounds, OsmSearchResponse, OsmExportFormat, OSM_MAX_AREA_KM2, OSM_MAX_DEGREES, OSM_MAX_SEARCH_LENGTH, OSM_ALIAS_TAGS } from './osm.types'

@Injectable({ providedIn: 'root' })
export class OsmService {
  constructor(private http: HttpClient) { }

  search(bounds: OsmBounds, search: string, area?: OsmArea): Observable<OsmSearchResponse> {
    return this.http.post<OsmSearchResponse>('/api/osm/search', { bounds, search, ...(area ? { area } : {}) })
  }

  export(searchId: string, ids: string[], format: OsmExportFormat = 'gpkg'): Observable<Blob> {
    return this.http.post('/api/osm/export', { searchId, ids, format }, { responseType: 'blob' })
  }

  /** Existing route passes req.body to EventModel.addLayer, which reads body.id. */
  shareLayer(eventId: number | string, layerId: number | string): Observable<any> {
    return this.http.post(`/api/events/${eventId}/layers`, { id: layerId }).pipe(
      // The POST historically returns the pre-update event. Verify with a
      // fresh event-layer read rather than declaring success from that body.
      switchMap(() => this.http.get<Array<{ id: number | string }>>(`/api/events/${eventId}/layers`)),
      map(layers => {
        const linked = layers.find(layer => String(layer.id) === String(layerId))
        if (!linked) throw new Error('The server did not confirm this layer on the event. Retry sharing; the uploaded layer will not be duplicated.')
        return linked
      })
    )
  }

  /** Mirrors service/src/utilities/osm-search.js buildQuery search rules. Returns a message or null. */
  validateSearch(input: string): string | null {
    if (typeof input !== 'string') return 'Enter a keyword or key=value tag.'
    let search = input.trim()
    if (!search || search.length > OSM_MAX_SEARCH_LENGTH) return `Use 1-${OSM_MAX_SEARCH_LENGTH} characters.`
    const alias = search.toLowerCase()
    if (Object.prototype.hasOwnProperty.call(OSM_ALIAS_TAGS, alias)) search = OSM_ALIAS_TAGS[alias]
    if (/^[a-zA-Z0-9_:]{1,40}=\*$/.test(search)) return null
    if (search.includes('=')) {
      return /^([a-zA-Z0-9_:]{1,40})=([a-zA-Z0-9_: .\/-]{1,60})$/.test(search)
        ? null : 'Use a simple literal tag such as amenity=hospital; query syntax is not allowed.'
    }
    return /^[\p{L}\p{N} _:-]+$/u.test(search) ? null : 'Use a simple keyword, tag key, or key=value tag.'
  }

  /** Mirrors server bounds rules. */
  validateBounds(bounds: OsmBounds): string | null {
    if (!bounds || ![bounds.south, bounds.west, bounds.north, bounds.east].every(v => typeof v === 'number' && Number.isFinite(v))) {
      return 'Map bounds are unavailable.'
    }
    const { south, west, north, east } = bounds
    if (south < -85 || north > 85 || west < -180 || east > 180 || south >= north || west >= east) {
      return 'The visible map crosses the date line or reaches a pole. Pan away and zoom in, then try again.'
    }
    const area = (north - south) * (east - west) * 111.32 * 111.32 * Math.cos((north + south) * Math.PI / 360)
    if (north - south > OSM_MAX_DEGREES || east - west > OSM_MAX_DEGREES || area > OSM_MAX_AREA_KM2) {
      return `Search up to ${OSM_MAX_DEGREES} degrees per side and ${OSM_MAX_AREA_KM2.toLocaleString('en-US')} km². Zoom in slightly or use a smaller area.`
    }
    return null
  }

  static errorMessage(err: any, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error
      if (body && typeof body === 'object' && typeof body.message === 'string') return body.message
      if (typeof body === 'string' && body.trim()) {
        try { const parsed = JSON.parse(body); if (parsed?.message) return String(parsed.message) } catch { return body.slice(0, 300) }
      }
      if (err.status === 403) return 'You do not have permission to perform this action.'
      if (err.status === 0) return 'Unable to reach the server.'
    }
    if (err instanceof Error && !(err instanceof HttpErrorResponse)) return err.message || fallback
    return fallback
  }

  /** Blob error bodies (responseType blob) need reading as text. */
  static async blobErrorMessage(err: any, fallback: string): Promise<string> {
    if (err instanceof HttpErrorResponse && err.error instanceof Blob) {
      try {
        const text = await err.error.text()
        const parsed = JSON.parse(text)
        if (parsed?.message) return String(parsed.message)
      } catch { /* fall through */ }
      if (err.status === 403) return 'You do not have permission to download this data.'
    }
    return OsmService.errorMessage(err, fallback)
  }
}
