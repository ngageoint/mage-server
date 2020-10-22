import { InjectionToken } from "@angular/core";
export const MapService = new InjectionToken<any>('MapService');
export const LocalStorageService = new InjectionToken<any>('LocalStorageService');

export function mapServiceFactory(i: any): any {
  return i.get('MapService');
}

export const mapServiceProvider = {
  provide: MapService,
  useFactory: mapServiceFactory,
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
