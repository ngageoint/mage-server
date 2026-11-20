import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ObservationEditGeometryMapComponent } from './observation-edit-geometry-map.component';
import { MapService } from '../../../map/map.service';
import { LocalStorageService } from '../../../http/local-storage.service';

describe('ObservationEditGeometryMapComponent', () => {
  let component: ObservationEditGeometryMapComponent;
  let fixture: ComponentFixture<ObservationEditGeometryMapComponent>;
  let mapService: jasmine.SpyObj<MapService>;

  beforeEach(waitForAsync(() => {
    mapService = jasmine.createSpyObj('MapService', ['addListener', 'removeListener']);

    TestBed.configureTestingModule({
      imports: [ObservationEditGeometryMapComponent],
      providers: [
        { provide: MapService, useValue: mapService },
        { provide: LocalStorageService, useValue: jasmine.createSpyObj('LocalStorageService', { getMapPosition: { center: { lat: 0, lng: 0 } } }) }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationEditGeometryMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit onEdit when the edit button is clicked', () => {
    spyOn(component.onEdit, 'emit');

    component.edit();

    expect(component.onEdit.emit).toHaveBeenCalled();
  });
});
