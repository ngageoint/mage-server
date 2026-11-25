import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, switchMap, map, mergeMap, toArray } from 'rxjs';
import { MageEvent } from '../entities/event/entities.event';
import { GuideCustomizationState } from './guide-customization';

@Injectable({ providedIn: 'root' })
export class GuideCustomizationService {
  constructor(private http: HttpClient) {}
  private url(scope: string): string {
    return scope === 'global' ? '/api/user-guide/customizations' : `/api/user-guide/events/${encodeURIComponent(scope)}`;
  }
  get(scope = 'global'): Observable<GuideCustomizationState> {
    return this.http.get<GuideCustomizationState>(this.url(scope)).pipe(switchMap(state => this.hydrate(state, scope)));
  }
  save(state: GuideCustomizationState, scope = 'global'): Observable<GuideCustomizationState> {
    const payload = JSON.parse(JSON.stringify(state));
    for (const edit of Object.values(payload.overrides) as any[]) {
      for (const image of edit.images || []) delete image.dataUrl;
    }
    return this.http.put<GuideCustomizationState>(this.url(scope), payload).pipe(switchMap(saved => this.hydrate(saved, scope)));
  }
  uploadImage(dataUrl: string, scope: string): Observable<{ assetId: string; dataUrl: string }> {
    return this.http.post<{ assetId: string; dataUrl: string }>(`${this.url(scope)}/images`, { dataUrl });
  }
  private hydrate(state: GuideCustomizationState, scope: string): Observable<GuideCustomizationState> {
    const requests = Object.values(state.overrides).flatMap(edit => (edit.images || [])
      .filter(image => !!image.assetId).map(image => this.http.get(`${this.url(scope)}/images/${image.assetId}`, { responseType: 'arraybuffer' })
        .pipe(map(bytes => {
          const binary = Array.from(new Uint8Array(bytes), byte => String.fromCharCode(byte)).join('');
          image.dataUrl = `data:image/png;base64,${btoa(binary)}`;
        }))));
    return requests.length ? from(requests).pipe(mergeMap(request => request, 4), toArray(), map(() => state)) : of(state);
  }
  listEvents(page = 0): Observable<{ items: MageEvent[]; totalCount: number }> {
    return this.http.get<{ items: MageEvent[]; totalCount: number }>('/api/events', {
      params: { includePagination: 'true', page_size: '100', page: String(page) }
    });
  }
  getEvent(id: string): Observable<MageEvent> {
    return this.http.get<MageEvent>(`/api/events/${encodeURIComponent(id)}`);
  }
}
