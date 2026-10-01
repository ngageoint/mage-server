import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
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
});
