import { InjectionToken } from "@angular/core";
export const MapService = new InjectionToken<any>('MapService');
export const UserService = new InjectionToken<any>('UserService');
export const FilterService = new InjectionToken<any>('FilterService');
export const EventService = new InjectionToken<any>('EventService');
export const GeometryService = new InjectionToken<any>('GeometryService');
export const ObservationService = new InjectionToken<any>('ObservationService');
export const LocalStorageService = new InjectionToken<any>('LocalStorageService');
export const LocationService = new InjectionToken<any>('LocationService');
export const Settings = new InjectionToken<any>('Settings');
export const Team = new InjectionToken<any>('Team');
export const Event = new InjectionToken<any>('Event');
export const AuthenticationConfigurationService = new InjectionToken<any>('AuthenticationConfigurationService');
export const UserPagingService = new InjectionToken<any>('UserPagingService');


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

export function locationServiceFactory(i: any): any {
  return i.get('LocationService');
}

export const locationServiceProvider = {
  provide: LocationService,
  useFactory: locationServiceFactory,
  deps: ['$injector']
};

export function settingsFactory(i: any): any {
  return i.get('Settings');
}

export const settingsProvider = {
  provide: Settings,
  useFactory: settingsFactory,
  deps: ['$injector']
};

export function teamFactory(i: any): any {
  return i.get('Team');
}

export const teamProvider = {
  provide: Team,
  useFactory: teamFactory,
  deps: ['$injector']
};

export function eventFactory(i: any): any {
  return i.get('Event');
}

export const eventProvider = {
  provide: Event,
  useFactory: eventFactory,
  deps: ['$injector']
};

export function authenticationConfigurationServiceFactory(i: any): any {
  return i.get('AuthenticationConfigurationService');
}

export const authenticationConfigurationServiceProvider = {
  provide: AuthenticationConfigurationService,
  useFactory: authenticationConfigurationServiceFactory,
  deps: ['$injector']
};

export function userPagingServiceFactory(i: any): any {
  return i.get('UserPagingService');
}

export const userPagingServiceProvider = {
  provide: UserPagingService,
  useFactory: userPagingServiceFactory,
  deps: ['$injector']
};