import { InjectionToken } from "@angular/core";
export const MapService = new InjectionToken<any>('MapService');
export const UserService = new InjectionToken<any>('UserService');
export const FilterService = new InjectionToken<any>('EventService');
export const EventService = new InjectionToken<any>('EventService');
export const GeometryService = new InjectionToken<any>('GeometryService');
export const ObservationService = new InjectionToken<any>('ObservationService');
export const LocalStorageService = new InjectionToken<any>('LocalStorageService');

export function mapServiceFactory(i: any): any {
  return i.get('MapService');
}

export const mapServiceProvider = {
  provide: MapService,
  useFactory: mapServiceFactory,
  deps: ['$injector']
};

export function userServiceFactory(i: any): any {
  return i.get('UserService');
}

export const userServiceProvider = {
  provide: UserService,
  useFactory: userServiceFactory,
  deps: ['$injector']
};


export function filterServiceFactory(i: any): any {
  return i.get('FilterService');
}

export const filterServiceProvider = {
  provide: FilterService,
  useFactory: filterServiceFactory,
  deps: ['$injector']
};

export function eventServiceFactory(i: any): any {
  return i.get('EventService');
}

export const eventServiceProvider = {
  provide: EventService,
  useFactory: eventServiceFactory,
  deps: ['$injector']
};

export function geometryServiceFactory(i: any): any {
  return i.get('GeometryService');
}

export const geometryServiceProvider = {
  provide: GeometryService,
  useFactory: geometryServiceFactory,
  deps: ['$injector']
};

export function observationServiceFactory(i: any): any {
  return i.get('ObservationService');
}

export const observationServiceProvider = {
  provide: ObservationService,
  useFactory: observationServiceFactory,
  deps: ['$injector']
};

export function localStorageServiceFactory(i: any): any {
  return i.get('LocalStorageService');
}

export const localStorageServiceProvider = {
  provide: LocalStorageService,
  useFactory: localStorageServiceFactory,
  deps: ['$injector']
};