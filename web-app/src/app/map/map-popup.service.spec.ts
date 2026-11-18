import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';

import { MapPopupService } from './map-popup.service';
import { ObservationService } from '../observation/observation.service';
import { FilterService } from '../filter/filter.service';
import { MapService } from './map.service';
import { EventService } from '../event/event.service';
import { SidebarService } from '../sidebar/sidebar.service';

describe('MapPopupService', () => {
  let service: MapPopupService;
  let observationService: jasmine.SpyObj<ObservationService>;
  let filterService: jasmine.SpyObj<FilterService>;
  let layer: jasmine.SpyObj<any>;

  const event: any = { id: 1, forms: [] };

  function popupLayer(): jasmine.SpyObj<any> {
    const popupLayer = jasmine.createSpyObj('Layer', ['unbindPopup', 'bindPopup', 'openPopup']);
    popupLayer.unbindPopup.and.returnValue(popupLayer);
    popupLayer.bindPopup.and.returnValue(popupLayer);
    return popupLayer;
  }

  function renderedPopup(popupLayer: jasmine.SpyObj<any>): HTMLElement {
    TestBed.inject(ApplicationRef).tick();
    return popupLayer.bindPopup.calls.mostRecent().args[0];
  }

  function fetchedObservation(id: string): any {
    return { id, user: { displayName: 'User One' }, properties: { timestamp: '2024-01-01T00:00:00Z', forms: [] } };
  }

  beforeEach(() => {
    observationService = jasmine.createSpyObj('ObservationService', ['getObservation', 'transformObservations']);
    observationService.transformObservations.and.callFake((observation: any) => [{ ...observation, transformed: true }]);
    filterService = jasmine.createSpyObj('FilterService', ['getEvent']);
    filterService.getEvent.and.returnValue(event);

    layer = popupLayer();

    TestBed.configureTestingModule({
      providers: [
        { provide: ObservationService, useValue: observationService },
        { provide: FilterService, useValue: filterService },
        { provide: MapService, useValue: jasmine.createSpyObj('MapService', ['zoomToFeatureInLayer']) },
        { provide: EventService, useValue: jasmine.createSpyObj('EventService', { getForms: [] }) },
        { provide: SidebarService, useValue: jasmine.createSpyObj('SidebarService', ['viewObservation']) }
      ]
    });
    service = TestBed.inject(MapPopupService);
  });

  it('opens a loading popup before the observation is fetched', () => {
    observationService.getObservation.and.returnValue(new Subject<any>().asObservable());

    service.popupObservation(layer, { id: 'obs1' });

    expect(observationService.getObservation).toHaveBeenCalledWith('1', 'obs1');
    expect(layer.openPopup).toHaveBeenCalled();
    expect(renderedPopup(layer).querySelector('mat-progress-spinner')).not.toBeNull();
  });

  it('fills the popup with the fetched observation', () => {
    const fetch = new Subject<any>();
    observationService.getObservation.and.returnValue(fetch.asObservable());

    service.popupObservation(layer, { id: 'obs1' });
    fetch.next(fetchedObservation('obs1'));
    const popup = renderedPopup(layer);

    expect(observationService.transformObservations).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'obs1' }), event);
    expect(popup.querySelector('mat-progress-spinner')).toBeNull();
    expect(popup.textContent).toContain('User One');
  });

  it('shows a failure message when the fetch fails', () => {
    spyOn(console, 'error');
    observationService.getObservation.and.returnValue(throwError(() => new Error('fetch failed')));

    service.popupObservation(layer, { id: 'obs1' });
    const popup = renderedPopup(layer);

    expect(popup.querySelector('mat-progress-spinner')).toBeNull();
    expect(popup.textContent).toContain('Unable to load observation');
    expect(console.error).toHaveBeenCalled();
  });

  it('cancels a pending fetch when another observation is clicked', () => {
    const first = new Subject<any>();
    observationService.getObservation.and.returnValues(first.asObservable(), new Subject<any>().asObservable());
    const firstLayer = popupLayer();

    service.popupObservation(firstLayer, { id: 'obs1' });
    service.popupObservation(layer, { id: 'obs2' });
    first.next(fetchedObservation('obs1'));

    expect(observationService.transformObservations).not.toHaveBeenCalled();
    expect(renderedPopup(firstLayer).querySelector('mat-progress-spinner')).not.toBeNull();
  });

  it('does nothing without a current event', () => {
    filterService.getEvent.and.returnValue(null);

    service.popupObservation(layer, { id: 'obs1' });

    expect(observationService.getObservation).not.toHaveBeenCalled();
    expect(layer.openPopup).not.toHaveBeenCalled();
  });
});
