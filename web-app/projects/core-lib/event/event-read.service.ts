import { InjectionToken } from '@angular/core'
import { PagingParameters } from '@ngageoint/mage.web-core-lib/paging'
import { Observable } from 'rxjs'
import { MageEvent } from './event.model'

export interface EventReadService {
  find(which: EventReadParams): Observable<MageEvent[]>
}

export interface EventReadParams {
  page: PagingParameters
}

export const EVENT_READ_SERVICE = new InjectionToken<EventReadService>('EventReadService')