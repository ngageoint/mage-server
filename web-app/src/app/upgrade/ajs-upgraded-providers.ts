import { InjectionToken } from "@angular/core";
export const MapService = new InjectionToken<any>('MapService');

export function mapServiceFactory(i: any): any {
  return i.get('MapService');
}

export const mapServiceProvider = {
  provide: MapService,
  useFactory: mapServiceFactory,
  deps: ['$injector']
};