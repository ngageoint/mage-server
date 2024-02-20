import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MapSettings, WebSearchType } from 'src/app/entities/map/entities.map';
import { Observable } from 'rxjs';
import { BBox, FeatureCollection, Position } from 'geojson';
import { map } from 'rxjs/operators';
import * as center from '@turf/center';

export class PlacenameSearchResult {
  name: string
  bbox: BBox
  position: Position
  
  constructor(name: string, bbox: BBox, position: Position) {
    this.name = name
    this.bbox = bbox
    this.position = position
  }
}

interface PlacenameSearch {
  search(text: string): Observable<PlacenameSearchResult[]>
}

@Injectable({
  providedIn: 'root'
})
export class PlacenameSearchService {
  constructor(
    private http: HttpClient
  ) {} 

  search(settings: MapSettings, text: string): Observable<PlacenameSearchResult[]> {
    const service = this.getSearchService(settings.webSearchType, settings.webNominatimUrl)
    return service.search(text)
  }

  private getSearchService(type: WebSearchType, url: string): PlacenameSearch | null {
    switch (type) {
      case WebSearchType.NOMINATIM:
        return new NominatimService(this.http, url)
      case WebSearchType.NONE:
        return null
    }
  }
}

class NominatimService implements PlacenameSearch {
  private static readonly FORMAT = 'geojson';
  private static readonly ADDRESS = '1';
  private static readonly LIMIT = '10';

  constructor(
    private http: HttpClient,
    private url: string
  ) {}

  search(text: string): Observable<PlacenameSearchResult[]> {
    const params = new HttpParams()
      .set('q', text)
      .set('format', NominatimService.FORMAT)
      .set('limit', NominatimService.LIMIT)
      .set('addressdetails', NominatimService.ADDRESS);

    return this.http.get<FeatureCollection>(`${this.url}/search`, { params: params }).pipe(map(featureCollection => {
      const result = featureCollection.features.map(feature => {
        const name = feature.properties['display_name'] || text
        const position: Position = center(feature).geometry.coordinates
        let bbox: BBox = [position[0], position[1], position[0], position[1]]
        if (feature.bbox) {
          bbox = feature.bbox
        }

        return new PlacenameSearchResult(name, bbox, position)
      })

      return result
    }))
  }
}
