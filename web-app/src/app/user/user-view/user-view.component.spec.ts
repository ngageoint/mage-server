import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserViewComponent } from './user-view.component';
import { MapService } from '../../map/map.service';
import { LocationService } from '../location/location.service';
import { GeometryModule } from '../../geometry/geometry.module';
import { UserLocation } from '../../entities/user/entities.user-location';

describe('UserViewComponent', () => {
  let component: UserViewComponent;
  let fixture: ComponentFixture<UserViewComponent>;
  let mapService: jasmine.SpyObj<MapService>;

  const colorBuckets = [
    { min: Number.NEGATIVE_INFINITY, max: 600000, color: '#0000FF' },
    { min: 600001, max: 1800000, color: '#FFFF00' },
    { min: 1800001, max: Number.MAX_VALUE, color: '#FF5721' }
  ];

  function locationAt(timestamp: string): UserLocation {
    return { id: 'u1', type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { timestamp } };
  }

  function userWithLocation(overrides: any = {}) {
    return {
      user: { id: 'u1', displayName: 'User 1' },
      location: {
        geometry: { type: 'Point', coordinates: [-77.03, 38.9] },
        properties: { timestamp: new Date().toISOString(), accuracy: 12.5 }
      },
      ...overrides
    };
  }

  beforeEach(waitForAsync(() => {
    mapService = jasmine.createSpyObj('MapService', ['zoomToFeatureInLayer']);
    const locationService = { colorBuckets };

    TestBed.configureTestingModule({
      declarations: [UserViewComponent],
      imports: [CommonModule, GeometryModule],
      providers: [
        { provide: MapService, useValue: mapService },
        { provide: LocationService, useValue: locationService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserViewComponent);
    component = fixture.componentInstance;
    component.user = userWithLocation();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnChanges', () => {
    it('computes accuracy when the user has a location', () => {
      const user = userWithLocation();
      component.ngOnChanges({ user: { currentValue: user } as any } as any);

      expect(component.accuracy).toBeDefined();
      expect(component.accuracy.latlng.lat).toBe(38.9);
      expect(component.accuracy.latlng.lng).toBe(-77.03);
      expect(component.accuracy.radius).toBe(12.5);
      expect(component.accuracy.zoomTo).toBeTrue();
    });

    it('does nothing when the user has no location', () => {
      component.accuracy = undefined;
      component.ngOnChanges({ user: { currentValue: { user: { id: 'u1' } } } as any } as any);

      expect(component.accuracy).toBeUndefined();
    });

    it('does nothing when there is no currentValue', () => {
      component.accuracy = undefined;
      component.ngOnChanges({ user: { currentValue: null } as any } as any);

      expect(component.accuracy).toBeUndefined();
    });
  });

  describe('setAccuracy', () => {
    it('uses the blue bucket for a very recent location', () => {
      const location = locationAt(new Date().toISOString());

      component.setAccuracy(location);

      expect(component.accuracy.color).toBe('#0000FF');
    });

    it('uses the yellow bucket for a location aged past the blue threshold', () => {
      const timestamp = new Date(Date.now() - 700000).toISOString();
      const location = locationAt(timestamp);

      component.setAccuracy(location);

      expect(component.accuracy.color).toBe('#FFFF00');
    });

    it('uses the orange bucket for an old location', () => {
      const timestamp = new Date(Date.now() - 2000000).toISOString();
      const location = locationAt(timestamp);

      component.setAccuracy(location);

      expect(component.accuracy.color).toBe('#FF5721');
    });

    it('defaults radius to 0 when accuracy is not provided', () => {
      const location = locationAt(new Date().toISOString());

      component.setAccuracy(location);

      expect(component.accuracy.radius).toBe(0);
    });
  });

  describe('onClose', () => {
    it('emits the current user', () => {
      const emitted: any[] = [];
      component.close.subscribe(u => emitted.push(u));

      component.onClose();

      expect(emitted).toEqual([component.user]);
    });
  });

  describe('onUserLocationClick', () => {
    it('zooms to the user in the People layer', () => {
      component.onUserLocationClick();
      expect(mapService.zoomToFeatureInLayer).toHaveBeenCalledWith(component.user, 'people');
    });
  });
});
