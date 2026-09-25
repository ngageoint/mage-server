import { Injectable } from "@angular/core";
import { EventLocationFilter, EventObservationFilter, Interval } from "../filter/filter.types";

@Injectable({
  providedIn: "root",
})
export class LocalStorageService {
  pollingIntervalKey = "pollingInterval";
  mapPositionKey = "mapPosition";
  coordinateSystemViewKey = "coordinateSystemView";
  coordinateSystemEditKey = "coordinateSystemEdit";
  timeZoneViewKey = "timeZoneView";
  timeZoneEditKey = "timeZoneEdit";
  timeFormatKey = "timeFormat";
  eventKey = "event";
  observationFiltersKey = "observationFilters";
  locationFiltersKey = "locationFilters";

  getEventId(): number | string | null {
    return this.parseJson<number | string>(this.eventKey, this.getLocalItem(this.eventKey));
  }

  setEventId(id: number | string | null) {
    if (id == null) return this.removeLocalItem(this.eventKey);
    return this.setLocalItem(this.eventKey, JSON.stringify(id));
  }

  getObservationFilter(eventId: string | number): EventObservationFilter | null {
    const map = this.readFilterMap<EventObservationFilter>(this.observationFiltersKey);
    return this.hydrateDates(map[eventId]);
  }

  setObservationFilter(eventId: string | number, filter: EventObservationFilter | null): void {
    const map = this.readFilterMap<EventObservationFilter>(this.observationFiltersKey);
    if (filter == null) {
      delete map[eventId];
    } else {
      map[eventId] = filter;
    }
    this.setLocalItem(this.observationFiltersKey, JSON.stringify(map));
  }

  getLocationFilter(eventId: string | number): EventLocationFilter | null {
    const map = this.readFilterMap<EventLocationFilter>(this.locationFiltersKey);
    return this.hydrateDates(map[eventId]);
  }

  setLocationFilter(eventId: string | number, filter: EventLocationFilter | null): void {
    const map = this.readFilterMap<EventLocationFilter>(this.locationFiltersKey);
    if (filter == null) {
      delete map[eventId];
    } else {
      map[eventId] = filter;
    }
    this.setLocalItem(this.locationFiltersKey, JSON.stringify(map));
  }

  private readFilterMap<T>(key: string): Record<string, T> {
    const parsed = this.parseJson<unknown>(key, this.getLocalItem(key));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, T> : {};
  }

  private hydrateDates<T extends { timeInterval?: Interval }>(filter: T | null | undefined): T | null {
    if (!filter) return null;
    if (filter?.timeInterval?.options) {
      if (filter.timeInterval.options.startDate) {
        filter.timeInterval.options.startDate = new Date(filter.timeInterval.options.startDate);
      }
      if (filter.timeInterval.options.endDate) {
        filter.timeInterval.options.endDate = new Date(filter.timeInterval.options.endDate);
      }
    }
    return filter;
  }

  setPollingInterval(pollingInterval: number) {
    return this.setLocalItem(this.pollingIntervalKey, String(pollingInterval));
  }

  getPollingInterval(): number | null {
    const interval = parseInt(this.getLocalItem(this.pollingIntervalKey) ?? '');
    return Number.isNaN(interval) ? null : interval;
  }

  setMapPosition(mapPosition: any) {
    return this.setLocalItem(this.mapPositionKey, JSON.stringify(mapPosition));
  }

  getMapPosition() {
    return this.parseJson<any>(this.mapPositionKey, this.getLocalItem(this.mapPositionKey)) ?? undefined;
  }

  getCoordinateSystemView() {
    return this.getLocalItem(this.coordinateSystemViewKey) || "wgs84";
  }

  setCoordinateSystemView(coordinateSystem: any) {
    return this.setLocalItem(this.coordinateSystemViewKey, coordinateSystem);
  }

  getCoordinateSystemEdit() {
    return (
      this.getLocalItem(this.coordinateSystemEditKey) ||
      this.getCoordinateSystemView()
    );
  }

  setCoordinateSystemEdit(coordinateSystem: any) {
    return this.setLocalItem(this.coordinateSystemEditKey, coordinateSystem);
  }

  getTimeZoneView() {
    return this.getLocalItem(this.timeZoneViewKey) || "local";
  }

  setTimeZoneView(timeZone: any) {
    return this.setLocalItem(this.timeZoneViewKey, timeZone);
  }

  getTimeZoneEdit() {
    return this.getLocalItem(this.timeZoneEditKey) || this.getTimeZoneView();
  }

  setTimeZoneEdit(timeZone: any) {
    return this.setLocalItem(this.timeZoneEditKey, timeZone);
  }

  getTimeFormat() {
    return this.getLocalItem(this.timeFormatKey) || "absolute";
  }

  setTimeFormat(timeFormat: any) {
    return this.setLocalItem(this.timeFormatKey, timeFormat);
  }

  private parseJson<T>(key: string, item: string | null): T | null {
    if (!item) return null;
    try {
      return JSON.parse(item) as T;
    } catch {
      console.warn(`Ignoring invalid JSON in localStorage key "${key}"`);
      return null;
    }
  }

  getLocalItem(key: any): string | null {
    try {
      if ("localStorage" in window && window["localStorage"] !== null) {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.error('Failed to get local storage item', key, e)
    }
    return null;
  }

  setLocalItem(key: any, value: any) {
    try {
      if ("localStorage" in window && window.localStorage !== null) {
       localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error('Failed to set local storage item', key, e)
    }
  }

  removeLocalItem(key: any) {
    try {
      if ("localStorage" in window && window.localStorage !== null) {
        return localStorage.removeItem(key);
      }
    } catch (e) {
      return false;
    }
  }
}
