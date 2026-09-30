import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MapComponent } from './map.component';
import { MapService } from './map.service';
import { EventService } from '../event/event.service';
import { FilterService } from '../filter/filter.service';
import { LocalStorageService } from '../http/local-storage.service';
import { SessionService } from '../http/session.service';

describe('MapComponent', () => {
  let mapService: jasmine.SpyObj<MapService>;

  beforeEach(() => {
    mapService = jasmine.createSpyObj('MapService', ['addListener', 'removeListener', 'setDelegate']);

    TestBed.configureTestingModule({
      declarations: [MapComponent],
      providers: [
        { provide: MatDialog, useValue: {} },
        { provide: MapService, useValue: mapService },
        { provide: SessionService, useValue: { getToken: () => 'token' } },
        { provide: EventService, useValue: {} },
        { provide: FilterService, useValue: { getEvent: () => null } },
        {
          provide: LocalStorageService,
          useValue: jasmine.createSpyObj('LocalStorageService', {
            getMapPosition: { center: { lat: 0, lng: 0 }, zoom: 3 },
            setMapPosition: undefined
          })
        },
        provideHttpClient(),
        provideHttpClientTesting()
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  it('registers as the map delegate and listener once the view is ready', fakeAsync(() => {
    const fixture = TestBed.createComponent(MapComponent);
    fixture.detectChanges();
    tick();

    expect(mapService.setDelegate).toHaveBeenCalledWith(fixture.componentInstance);
    expect(mapService.addListener).toHaveBeenCalledWith(fixture.componentInstance);

    fixture.destroy();
  }));

  it('removes itself as a listener and removes the Leaflet map when destroyed', fakeAsync(() => {
    const fixture = TestBed.createComponent(MapComponent);
    fixture.detectChanges();
    tick();
    const removeMap = spyOn(fixture.componentInstance.map, 'remove').and.callThrough();

    fixture.destroy();

    expect(mapService.removeListener).toHaveBeenCalledWith(fixture.componentInstance);
    expect(removeMap).toHaveBeenCalled();
  }));

  it('does not register as a listener when destroyed before the deferred registration runs', fakeAsync(() => {
    const fixture = TestBed.createComponent(MapComponent);
    fixture.detectChanges();

    fixture.destroy();
    tick();

    expect(mapService.setDelegate).not.toHaveBeenCalled();
    expect(mapService.addListener).not.toHaveBeenCalled();
  }));
});
