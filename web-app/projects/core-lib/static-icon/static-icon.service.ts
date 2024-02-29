import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { PageOf, PagingParameters } from '@ngageoint/mage.web-core-lib/paging'
import { StaticIcon, StaticIconReference } from './static-icon.model'


export interface IconFetch extends PagingParameters {
  searchText?: string
}

@Injectable({
  providedIn: 'root'
})
export class StaticIconService {

  constructor(private webClient: HttpClient) { }

  fetchIcons(fetch?: IconFetch): Observable<PageOf<StaticIcon>> {
    const now = Date.now()
    const results = new Observable<PageOf<StaticIcon>>(observer => {
      const icons: StaticIcon[] = []
      let remaining = 100
      while (remaining--) {
        const id = now - remaining
        icons.unshift({
          id: String(id),
          title: `Icon ${id}`,
          fileName: `icon-${id}.png`,
          sourceUrl: `https://test.mage/${id}.png`,
          contentPath: `/icons/${id}/content`
        })
      }
      setTimeout(() => {
        observer.next({
          pageSize: 100,
          pageIndex: 0,
          totalCount: 100,
          items: icons
        })
        observer.complete()
      }, 0)
      return {
        unsubscribe() { }
      }
    })
    return results
  }

  fetchIconById(id: string): Observable<StaticIcon | null> {
    return this.webClient.get<StaticIcon>(`/api/icons/${id}`).pipe(
      catchError((err, caught) => {
        // TODO: this is probably better practice to insulate app layer from
        // http errors
        // if (err instanceof HttpErrorResponse) {
        //   if (err.status === 404) {
        //     return null
        //   }
        // }
        return throwError(err)
      })
    )
  }

  fetchIconBySourceUrl(url: string): Observable<StaticIcon> {
    return this.webClient.get<StaticIcon | null>(`/api/icons`, {
      params: new HttpParams().set('source_url', url)
    })
  }

  fetchIconByReference(ref: StaticIconReference): Observable<StaticIcon | null> {
    if (ref.id) {
      return this.fetchIconById(ref.id)
    }
    else if (ref.sourceUrl) {
      return this.fetchIconBySourceUrl(ref.sourceUrl)
    }
    throw new Error('no icon id or source url')
  }

  registerIconUrl(url: string): Observable<StaticIcon> {
    throw new Error('unimplemented')
  }

  uploadIcon(): void {
    throw new Error('unimplemented')
  }
}
