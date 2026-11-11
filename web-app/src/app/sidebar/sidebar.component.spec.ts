import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { SidebarComponent } from './sidebar.component';
import { SidebarService } from './sidebar.service';
import { MapService } from '../map/map.service';
import { FilterService } from '../filter/filter.service';
import { EventService } from '../event/event.service';
import { ExportService } from '../export/export.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { FeedService } from '@ngageoint/mage.web-core-lib/feed';
import { Observation } from '../entities/observation/entities.observation';
import { UserWithLocation } from '../entities/user/entities.user-location';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let mapObservationsSubject: BehaviorSubject<any[] | null>;
  let feedsSubject: Subject<any[]>;

  beforeEach(waitForAsync(() => {
    mapObservationsSubject = new BehaviorSubject<any[] | null>(null);
    feedsSubject = new Subject<any[]>();

    const dialog = jasmine.createSpyObj('MatDialog', ['open']);
    const feedService = { feeds$: feedsSubject.asObservable() };
    const sidebarService = {
      item$: new Subject(),
      viewUser$: new Subject(),
      viewObservation$: new Subject(),
      editObservation$: new Subject(),
      viewExport$: new Subject()
    };
    const mapService = jasmine.createSpyObj('MapService', ['deselectFeatureInLayer', 'removeFeatureFromLayer']);
    const sessionService = { user: { id: 'user1', username: 'user1' } };
    const filterService = jasmine.createSpyObj('FilterService', ['getEvent']);
    const eventService = jasmine.createSpyObj('EventService', ['getForms', 'createForm', 'isUserInEvent', 'getFormsForEvent'], {
      mapObservations$: mapObservationsSubject.asObservable()
    });
    const exportService = jasmine.createSpyObj('ExportService', ['fetchExports'], { exports$: of([]) });
    exportService.fetchExports.and.returnValue(of([]));

    TestBed.configureTestingModule({
      declarations: [SidebarComponent],
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: FeedService, useValue: feedService },
        { provide: SidebarService, useValue: sidebarService },
        { provide: MapService, useValue: mapService },
        { provide: SessionService, useValue: sessionService },
        { provide: FilterService, useValue: filterService },
        { provide: EventService, useValue: eventService },
        { provide: ExportService, useValue: exportService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('observation badge', () => {
    beforeEach(() => {
      component.currentTab = { id: 'people' };
    });

    it('does not badge the initial population of observations', () => {
      mapObservationsSubject.next([]);
      mapObservationsSubject.next([{ id: 'o1' }]);

      expect(component.observationBadge).toBeNull();
    });

    it('badges newly added observations when not on the observations tab', () => {
      mapObservationsSubject.next([]);
      mapObservationsSubject.next([{ id: 'o1' }]);

      mapObservationsSubject.next([{ id: 'o1' }, { id: 'o2' }]);

      expect(component.observationBadge).toBe(1);
    });

    it('accumulates the badge count across multiple emissions', () => {
      mapObservationsSubject.next([]);
      mapObservationsSubject.next([{ id: 'o1' }]);
      mapObservationsSubject.next([{ id: 'o1' }, { id: 'o2' }]);

      mapObservationsSubject.next([{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }]);

      expect(component.observationBadge).toBe(2);
    });

    it('does not badge while on the observations tab', () => {
      component.currentTab = { id: 'observations' };

      mapObservationsSubject.next([]);
      mapObservationsSubject.next([{ id: 'o1' }]);

      expect(component.observationBadge).toBeNull();
    });

    it('does not decrement the badge when observations are removed', () => {
      mapObservationsSubject.next([]);
      mapObservationsSubject.next([{ id: 'o1' }, { id: 'o2' }]);
      mapObservationsSubject.next([{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }]);

      mapObservationsSubject.next([{ id: 'o1' }]);

      expect(component.observationBadge).toBe(1);
    });

    it('stops updating the badge after the component is destroyed', () => {
      mapObservationsSubject.next([]);
      mapObservationsSubject.next([{ id: 'o1' }]);

      fixture.destroy();
      mapObservationsSubject.next([{ id: 'o1' }, { id: 'o2' }]);

      expect(component.observationBadge).toBeNull();
    });
  });

  describe('feeds$ subscription', () => {
    it('stops updating tabs after the component is destroyed', () => {
      feedsSubject.next([{ id: 'feed1', title: 'Feed 1' }]);
      expect(component.tabs.length).toBe(3);

      fixture.destroy();
      feedsSubject.next([{ id: 'feed1', title: 'Feed 1' }, { id: 'feed2', title: 'Feed 2' }]);

      expect(component.tabs.length).toBe(3);
    });
  });

  describe('ngOnChanges', () => {
    it('resets the observation badge when the event changes', () => {
      component.currentTab = { id: 'people' };
      mapObservationsSubject.next([]);
      mapObservationsSubject.next([{ id: 'o1' }]);
      expect(component.observationBadge).toBeNull();
      mapObservationsSubject.next([{ id: 'o1' }, { id: 'o2' }]);
      expect(component.observationBadge).toBe(1);

      component.ngOnChanges({ event: { currentValue: { id: 2 } } as any } as any);

      expect(component.observationBadge).toBeNull();
    });

    it('clears the in-progress views when the event changes', () => {
      component.viewObservation = { id: 'o1' } as Observation;
      component.viewUser = { id: 'u1' } as UserWithLocation;
      component.editObservation = { id: 'o1' } as Observation;

      component.ngOnChanges({ event: { currentValue: { id: 2 } } as any } as any);

      expect(component.viewObservation).toBeNull();
      expect(component.viewUser).toBeNull();
      expect(component.editObservation).toBeNull();
    });
  });

  describe('tabChanged', () => {
    it('clears the observation badge when switching to the observations tab', () => {
      component.observationBadge = 3;
      component.tabChanged(0);
      expect(component.observationBadge).toBeNull();
    });

    it('leaves the badge alone when switching to another tab', () => {
      component.observationBadge = 3;
      component.tabChanged(1);
      expect(component.observationBadge).toBe(3);
    });
  });

  describe('new observation from the map', () => {
    function clickMap(): void {
      component.ngOnChanges({
        observationLocation: new SimpleChange(null, { latLng: { lat: 1, lng: 2 } }, false)
      });
    }

    it('creates a new observation', () => {
      const createNewObservation = spyOn(component, 'createNewObservation');

      clickMap();

      expect(createNewObservation).toHaveBeenCalledTimes(1);
    });

    it('does not create one while another new observation is open', () => {
      const createNewObservation = spyOn(component, 'createNewObservation');
      component.newObservation = { id: 'new' };

      clickMap();

      expect(createNewObservation).not.toHaveBeenCalled();
    });

    it('does not create one while an observation or clone is being edited', () => {
      const createNewObservation = spyOn(component, 'createNewObservation');
      component.editObservation = { id: 'new' } as any;

      clickMap();

      expect(createNewObservation).not.toHaveBeenCalled();
    });
  });

  describe('closing the observation editor', () => {
    const original = { id: 'o1' } as Observation;
    let mapService: jasmine.SpyObj<MapService>;

    beforeEach(() => {
      mapService = TestBed.inject(MapService) as jasmine.SpyObj<MapService>;
      component.viewObservation = original;
    });

    it('shows a saved clone instead of the original', () => {
      const saved = { id: 'o2' } as Observation;
      component.editObservation = { id: 'new' } as any;

      component.onObservationEditClose(saved);

      expect(component.viewObservation).toBe(saved);
      expect(component.editObservation).toBeNull();
      expect(mapService.deselectFeatureInLayer).toHaveBeenCalledWith(original, 'observations');
    });

    it('updates the viewed observation after it is edited', () => {
      const saved = { id: 'o1' } as Observation;
      component.editObservation = { id: 'o1' } as any;

      component.onObservationEditClose(saved);

      expect(component.viewObservation).toBe(saved);
      expect(mapService.deselectFeatureInLayer).not.toHaveBeenCalled();
    });

    it('keeps showing the original when a clone is cancelled', () => {
      component.editObservation = { id: 'new' } as any;

      component.onObservationEditClose();

      expect(component.viewObservation).toBe(original);
      expect(component.editObservation).toBeNull();
    });

    it('does not change the view when an observation created from the map is saved', () => {
      component.newObservation = { id: 'new' };

      component.onObservationEditClose({ id: 'o3' });

      expect(component.viewObservation).toBe(original);
      expect(component.newObservation).toBeNull();
    });
  });
});
