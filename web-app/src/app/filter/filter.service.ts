import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { LocalStorageService } from "../http/local-storage.service";
import moment from 'moment';
import {
  DEFAULT_LOCATION_FILTER,
  DEFAULT_OBSERVATION_FILTER,
  EventLocationFilter,
  EventObservationFilter,
  Interval,
} from "./filter.types";
import { Condition } from "../entities/observation/filter/entities.observation.filter";
import { MageEvent } from "../entities/event/entities.event";
import { MemberFilterSelection } from "../event/event-member-filter.component";

@Injectable({
  providedIn: "root",
})
export class FilterService {

  private eventSubject = new BehaviorSubject<MageEvent | null>(null);
  private observationFilterSubject = new BehaviorSubject<EventObservationFilter | null>(null);
  private locationFilterSubject = new BehaviorSubject<EventLocationFilter | null>(null);

  readonly event$: Observable<MageEvent | null> = this.eventSubject.asObservable();
  readonly observationFilter$: Observable<EventObservationFilter | null> = this.observationFilterSubject.asObservable();
  readonly locationFilter$: Observable<EventLocationFilter | null> = this.locationFilterSubject.asObservable();

  constructor(private localStorageService: LocalStorageService) { }

  getSavedEventId(): number | string | null {
    return this.localStorageService.getEventId();
  }

  setEvent(event: MageEvent | null): void {
    if (event?.id === this.eventSubject.value?.id) return;
    this.eventSubject.next(event);
    this.localStorageService.setEventId(event?.id ?? null);

    if (event) {
      const observationFilter = { ...DEFAULT_OBSERVATION_FILTER, ...this.localStorageService.getObservationFilter(event.id) };
      const locationFilter = { ...DEFAULT_LOCATION_FILTER, ...this.localStorageService.getLocationFilter(event.id) };
      if (observationFilter.memberFilter) observationFilter.memberFilter = this.pruneStaleTeamIds(observationFilter.memberFilter, event);
      if (locationFilter.memberFilter) locationFilter.memberFilter = this.pruneStaleTeamIds(locationFilter.memberFilter, event);
      this.applyObservationFilter(observationFilter);
      this.locationFilterSubject.next(locationFilter);
    } else {
      this.observationFilterSubject.next(null);
      this.locationFilterSubject.next(null);
    }
  }

  destroy(): void {
    this.eventSubject.next(null);
    this.observationFilterSubject.next(null);
    this.locationFilterSubject.next(null);
  }

  // Drops team ids that are no longer on the event so a saved filter doesn't silently
  // keep scoping results to a team that was removed
  private pruneStaleTeamIds(
    memberFilter: MemberFilterSelection | null | undefined,
    event: MageEvent
  ): MemberFilterSelection | null {
    if (!memberFilter?.teamIds?.length) return memberFilter ?? null;
    const eventTeamIds = new Set((event.teams ?? []).map(team => team.id));
    const teamIds = memberFilter.teamIds.filter(id => eventTeamIds.has(id));
    if (teamIds.length === memberFilter.teamIds.length) return memberFilter;
    return teamIds.length || memberFilter.userIds.length ? { ...memberFilter, teamIds } : null;
  }

  setObservationFilter(
    base: Omit<EventObservationFilter, 'fieldFilter'>,
    condition?: Condition
  ): void {
    const keyword = this.observationFilterSubject.value?.fieldFilter?.keyword;
    this.applyObservationFilter({
      ...base,
      fieldFilter: keyword || condition ? { keyword, condition } : null
    });
  }

  setObservationKeyword(keyword: string | undefined): void {
    const current = this.observationFilterSubject.value ?? DEFAULT_OBSERVATION_FILTER;
    const condition = current.fieldFilter?.condition;
    this.applyObservationFilter({
      ...current,
      fieldFilter: keyword || condition ? { keyword, condition } : null
    });
  }

  private applyObservationFilter(filter: EventObservationFilter): void {
    this.observationFilterSubject.next(filter);
    const eventId = this.eventSubject.value?.id;
    if (eventId != null) this.localStorageService.setObservationFilter(eventId, filter);
  }

  setLocationFilter(update: EventLocationFilter): void {
    this.locationFilterSubject.next(update);
    const eventId = this.eventSubject.value?.id;
    if (eventId != null) this.localStorageService.setLocationFilter(eventId, update);
  }

  getEvent(): MageEvent | null {
    return this.eventSubject.value;
  }

  getObservationFilter(): EventObservationFilter | null {
    return this.observationFilterSubject.value;
  }

  getLocationFilter(): EventLocationFilter | null {
    return this.locationFilterSubject.value;
  }

  getEffectiveTimeInterval(timeInterval?: Interval): { start?: Date, end?: Date } {
    const choice = timeInterval?.choice?.filter ?? 'today';
    if (choice === 'all') return {};
    if (choice === 'today') {
      return { start: moment().startOf('day').toDate(), end: moment().endOf('day').toDate() };
    } else if (choice === 'custom') {
      return { start: timeInterval?.options?.startDate, end: timeInterval?.options?.endDate };
    } else {
      return { start: moment().subtract(Number(choice), 'seconds').toDate(), end: new Date() };
    }
  }

}
