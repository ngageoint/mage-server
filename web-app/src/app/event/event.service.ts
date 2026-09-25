import { Injectable } from "@angular/core";
import {
  Observable,
  Subject,
  BehaviorSubject,
  catchError,
  map,
  of,
  pairwise,
  startWith,
  Subscription,
  switchMap,
  take,
  takeUntil,
  tap,
} from "rxjs";
import { FilterService } from "../filter/filter.service";
import { PollingService } from "./polling.service";
import { ObservationService, ObservationsPageRequestOptions, ObservationsRequestOptions } from "../observation/observation.service";
import { HttpClient, HttpParams } from "@angular/common/http";
import { LayerService } from "../layer/layer.service";
import { LocationService, LocationsRequestOptions } from "../user/location/location.service";
import { SessionService } from "../http/session.service";
import * as _ from "lodash";
import moment from 'moment';
import { Feed, FeedService } from "@ngageoint/mage.web-core-lib/feed";
import { User } from "@ngageoint/mage.web-core-lib/user";
import { MemberPage } from "./event.types";
import { MageEvent, Form, FormField, EventId } from "../entities/event/entities.event";
import { Layer } from "../entities/layer/entities.layer";
import { Team } from "../entities/team/entities.team";
import { Attachment, Observation, ObservationStateName } from "../entities/observation/entities.observation";
import { EventObservationFilter } from "../filter/filter.types";

export interface FetchResult<T> {
  data: T[]
  error: any
  userInitiated: boolean
}

export interface PagedFetchResult<T> extends FetchResult<T> {
  totalCount: number
  pageIndex: number
}

interface CachedEvent extends MageEvent {
  layersById?: Record<string, Layer>
  feedsById?: Record<string, Feed>
}

interface FeedSyncState {
  id: string
  lastSync: number
}

interface LocationsCache {
  event?: MageEvent | null
  byId: any
}

@Injectable({
  providedIn: "root",
})
export class EventService {
  private destroy$ = new Subject<void>();

  private mapObservationsSubject = new BehaviorSubject<Observation[] | null>(null);
  readonly mapObservations$: Observable<Observation[] | null> = this.mapObservationsSubject.asObservable();

  private observationPageSubject = new BehaviorSubject<PagedFetchResult<Observation> | null>(null);
  readonly observationPage$: Observable<PagedFetchResult<Observation> | null> = this.observationPageSubject.asObservable();

  private locationsSubject = new BehaviorSubject<FetchResult<any> | null>(null);
  readonly locations$: Observable<FetchResult<any> | null> = this.locationsSubject.asObservable();

  private mapObservations: {
    event: MageEvent | null,
    lastModified?: string,
    byId: Record<string, Observation>
  } = { event: null, byId: {} };

  private locations: LocationsCache | null = null;

  private observationsTrigger$ = new Subject<{ userInitiated: boolean }>();
  private observationPageTrigger$ = new Subject<{ userInitiated: boolean }>();
  private locationsTrigger$ = new Subject<{ userInitiated: boolean }>();
  private pollTrigger$ = new Subject<void>();

  private layersChangedListeners: any = [];
  private feedItemsChangedListeners: any = [];
  private eventsById: Record<string, CachedEvent> = {};
  private pollingTimeout: any = null;
  private currentPollingInterval = 0;
  private feedPollTimeout: any = null;
  private feedSyncStates: FeedSyncState[] = [];
  private feedItemsSubscription: Subscription | null = null;

  constructor(
    private pollingService: PollingService,
    private httpClient: HttpClient,
    private sessionService: SessionService,
    private feedService: FeedService,
    private layerService: LayerService,
    private filterService: FilterService,
    private locationService: LocationService,
    private observationService: ObservationService
  ) { }

  init() {
    this.destroy$ = new Subject<void>();

    this.filterService.event$.pipe(
      startWith(null),
      pairwise(),
      takeUntil(this.destroy$)
    ).subscribe(([prev, curr]) => {
      if (curr?.id !== prev?.id) {
        this.onEventChanged(prev, curr);
      }
    });

    this.observationsTrigger$.pipe(
      tap((trigger) => {
        if (trigger.userInitiated) {
          const event = this.filterService.getEvent();
          this.mapObservations = { event, byId: {} };
          this.mapObservationsSubject.next([]);
        }
      }),
      switchMap(() => this.fetchMapObservations()),
      takeUntil(this.destroy$)
    ).subscribe(() => this.onFetchSettled());

    this.observationPageTrigger$.pipe(
      switchMap((trigger) => this.fetchObservationPage(trigger.userInitiated)),
      takeUntil(this.destroy$)
    ).subscribe(() => this.onFetchSettled());

    this.locationsTrigger$.pipe(
      tap((trigger) => {
        if (trigger.userInitiated) {
          const event = this.filterService.getEvent();
          this.locations = { event, byId: {} };
          this.locationsSubject.next({ data: [], error: null, userInitiated: true });
        }
      }),
      switchMap((trigger) => this.fetchLocations(trigger.userInitiated)),
      takeUntil(this.destroy$)
    ).subscribe(() => this.onFetchSettled());

    this.filterService.observationFilter$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (!this.filterService.getEvent()) return;
      this.observationsTrigger$.next({ userInitiated: true });
    });

    this.filterService.locationFilter$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (!this.filterService.getEvent()) return;
      this.locationsTrigger$.next({ userInitiated: true });
    });

    this.pollTrigger$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.observationsTrigger$.next({ userInitiated: false });
      this.locationsTrigger$.next({ userInitiated: false });
      this.observationPageTrigger$.next({ userInitiated: false });
    });

    this.pollingService.pollingInterval$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(interval => {
      this.currentPollingInterval = interval;
      this.schedulePollTick();
    });

    this.observationService.paging$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((paging) => {
      if (!paging) return;
      this.observationPageTrigger$.next({ userInitiated: false });
    });
  }

  private onFetchSettled(): void {
    this.schedulePollTick();
  }

  private schedulePollTick(): void {
    if (this.pollingTimeout) clearTimeout(this.pollingTimeout);
    if (this.currentPollingInterval > 0) {
      this.pollingTimeout = setTimeout(() => {
        this.pollTrigger$.next();
      }, this.currentPollingInterval);
    }
  }

  destroy() {
    this.eventsById = {};
    this.destroy$.next();
    this.destroy$.complete();

    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
    }

    if (this.feedPollTimeout) {
      clearTimeout(this.feedPollTimeout);
    }

    this.feedItemsSubscription?.unsubscribe();
    this.feedItemsSubscription = null;
    this.feedSyncStates = [];

    this.mapObservations = { event: null, byId: {} };
    this.locations = null;
    this.mapObservationsSubject.next(null);
    this.observationPageSubject.next(null);
    this.locationsSubject.next(null);
  }

  query(options?: any): Observable<any> {
    options = options || {};
    let params = new HttpParams();

    for (const key of Object.keys(options)) {
      if (options[key] !== undefined && options[key] !== null) {
        params = params.set(key, String(options[key]));
      }
    }

    if (!options.limit && !options.page_size) {
      params = params.set('limit', '100');
    }

    return this.httpClient.get<any>("/api/events/", { params });
  }

  addFeed(eventId: string, feedId: string): Observable<any> {
    return this.httpClient.post<any>(`/api/events/${eventId}/feeds`, `"${feedId}"`, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  removeFeed(eventId: string, feedId: string): Observable<any> {
    return this.httpClient.delete<any>(
      `/api/events/${eventId}/feeds/${feedId}`
    );
  }

  onEventChanged(prevEvent: MageEvent | null, currEvent: MageEvent | null) {
    if (currEvent) {
      this.eventsById[currEvent.id] = JSON.parse(JSON.stringify(currEvent));
      this.fetchLayers(currEvent);
      this.fetchFeeds(currEvent);
    }

    if (prevEvent) {
      this.layersChanged({ removed: Object.values(this.eventsById[prevEvent.id]?.layersById || {}).map(layer => layer.id) }, prevEvent);
      this.feedItemsChanged({ removed: Object.values(this.eventsById[prevEvent.id]?.feedsById || {}).map((feed: any) => ({ feed })) }, prevEvent);
      delete this.eventsById[prevEvent.id];
    }
  }

  addLayersChangedListener(listener) {
    this.layersChangedListeners.push(listener);

    if (typeof listener.onLayersChanged === 'function') {
      Object.values(this.eventsById).forEach((event: any) => {
        listener.onLayersChanged({ added: Object.values(event.layersById) }, event);
      });
    }
  }

  addFeedItemsChangedListener(listener) {
    this.feedItemsChangedListeners.push(listener);
  }

  removeLayersChangedListener(listener) {
    this.layersChangedListeners = this.layersChangedListeners.filter((l: any) => {
      return listener !== l;
    });
  }

  removeFeedItemsChangedListener(listener) {
    this.feedItemsChangedListeners = this.feedItemsChangedListeners.filter((l: any) => {
      return listener !== l;
    });
  }

  getEventById(eventId: EventId): MageEvent | undefined {
    return this.eventsById[eventId];
  }

  retrySearch(): void {
    if (!this.filterService.getEvent()) return;
    this.observationsTrigger$.next({ userInitiated: true });
    this.observationPageTrigger$.next({ userInitiated: true });
  }

  retryLocations(): void {
    if (!this.filterService.getEvent()) return;
    this.locationsTrigger$.next({ userInitiated: true });
  }

  saveObservation(observation: Observation) {
    const event = this.eventsById[observation.eventId];
    return this.observationService.saveObservationForEvent(event, observation)
      .pipe(
        tap(() => {
          delete this.mapObservations.byId[observation.id];
          this.mapObservationsChanged();
          this.observationsTrigger$.next({ userInitiated: false });
          this.observationPageTrigger$.next({ userInitiated: true });
        })
      );
  }

  private updateObservationInPage(update: Observation): void {
    const page = this.observationPageSubject.getValue();
    if (page?.data.some(observation => observation.id === update.id)) {
      this.observationPageSubject.next({
        ...page,
        data: page.data.map(observation => observation.id === update.id ? update : observation)
      });
    }
  }

  addObservationFavorite(observation: Observation) {
    const event = this.eventsById[observation.eventId];
    return this.observationService.addObservationFavorite(event, observation)
      .pipe(
        tap((update: Observation) => {
          this.mapObservations.byId[update.id] = update;
          this.mapObservationsChanged();
          this.updateObservationInPage(update);
        })
      );
  }

  removeObservationFavorite(observation: Observation) {
    const event = this.eventsById[observation.eventId];
    return this.observationService.removeObservationFavorite(event, observation)
      .pipe(
        tap((update: Observation) => {
          if (this.filterService.getObservationFilter()?.isUserFavorite) {
            delete this.mapObservations.byId[update.id];
            this.observationPageTrigger$.next({ userInitiated: true });
          } else {
            this.mapObservations.byId[update.id] = update;
            this.updateObservationInPage(update);
          }
          this.mapObservationsChanged();
        })
      );
  }

  markObservationAsImportant(observation: Observation, important: Pick<NonNullable<Observation['important']>, 'description'>): Observable<Observation> {
    const event = this.eventsById[observation.eventId];
    return this.observationService.markObservationAsImportantForEvent(event, observation, important)
      .pipe(
        tap((update: Observation) => {
          this.mapObservations.byId[update.id] = update;
          this.mapObservationsChanged();
          this.updateObservationInPage(update);
        })
      );
  }

  clearObservationAsImportant(observation: Observation): Observable<Observation> {
    const event = this.eventsById[observation.eventId];
    return this.observationService.clearObservationAsImportantForEvent(event, observation)
      .pipe(
        tap((update: Observation) => {
          if (this.filterService.getObservationFilter()?.isFlaggedImportant) {
            delete this.mapObservations.byId[update.id];
            this.observationPageTrigger$.next({ userInitiated: true });
          } else {
            this.mapObservations.byId[update.id] = update;
            this.updateObservationInPage(update);
          }
          this.mapObservationsChanged();
        })
      );
  }

  archiveObservation(observation: Observation): Observable<Observation> {
    const event = this.eventsById[observation.eventId];
    return this.observationService.archiveObservationForEvent(event, observation)
      .pipe(
        tap((archived: Observation) => {
          delete this.mapObservations.byId[archived.id];
          this.mapObservationsChanged();
          this.observationPageTrigger$.next({ userInitiated: true });
        })
      );
  }

  addAttachmentToObservation(observation: Observation, attachment: Attachment) {
    const event = this.eventsById[observation.eventId];
    this.observationService.addAttachmentToObservationForEvent(event, observation, attachment);
    this.mapObservationsChanged();
  }

  deleteAttachmentForObservation(observation: Observation, attachment: Attachment) {
    const event = this.eventsById[observation.eventId];
    return this.observationService.deleteAttachmentInObservationForEvent(event, observation, attachment).subscribe(() => {
      const remainingAttachments = observation.attachments.filter(a => a !== attachment);
      if (this.filterService.getObservationFilter()?.hasAttachments && remainingAttachments.length === 0) {
        delete this.mapObservations.byId[observation.id];
        this.observationPageTrigger$.next({ userInitiated: true });
      }
      this.mapObservationsChanged();
    });
  }

  getFormField(form: Form, fieldName: string) {
    return form.fields.find((field: FormField) => field.name === fieldName);
  }

  getForms(observation: Observation, options?: any) {
    const event = this.eventsById[observation.eventId];
    return this.getFormsForEvent(event, options);
  }

  getFormsForEvent(event: MageEvent, options?: any) {
    options = options || {};
    let forms = event.forms;
    if (options.archived === false) {
      forms = forms.filter((form: Form) => !form.archived);
    }

    return forms;
  }

  createForm(observationForm: Record<string, any>, formDefinition: any, viewModel?: any) {
    const form = JSON.parse(JSON.stringify(formDefinition));

    form.remoteId = observationForm.id;

    const existingPropertyFields = [];

    for (const [key, value] of Object.entries(observationForm)) {
      const field = this.getFormField(form, key);
      if (field) {
        if (field.type === "date" && field.value) {
          field.value = moment(value).toDate();
        } else {
          field.value = value;
        }
        existingPropertyFields.push(field);
      }
    }

    if (viewModel) {
      observationForm.fields = _.intersection(
        observationForm.fields,
        existingPropertyFields
      );
    }

    return form;
  }

  exportForm(event: MageEvent): Observable<Form> {
    return this.httpClient.get<Form>(`/api/event/${event.id}/form.zip`);
  }

  getMembers(eventId: EventId): Observable<User[]> {
    return this.httpClient
      .get<MemberPage>(`/api/events/${eventId}/members?page_size=${Number.MAX_SAFE_INTEGER}`)
      .pipe(
        take(1),
        map(res => res.items)
      );
  }

  searchMembers(eventId: EventId, term: string, pageSize = 20): Observable<User[]> {
    const params = new HttpParams()
      .set('term', term || '')
      .set('page_size', String(pageSize));
    return this.httpClient
      .get<MemberPage>(`/api/events/${eventId}/members`, { params })
      .pipe(
        take(1),
        map(res => res.items)
      );
  }

  isUserInEvent(user: User, mageEvent: MageEvent | null): boolean {
    return mageEvent?.teams?.some((team: Team) => team.userIds.includes(user.id)) ?? false;
  }

  usersChanged(userInitiated = false) {
    this.locationsSubject.next({
      data: Object.values(this.locations?.byId ?? {}),
      error: null,
      userInitiated
    });
  }

  mapObservationsChanged() {
    this.mapObservationsSubject.next(Object.values(this.mapObservations?.byId ?? {}));
  }

  layersChanged(changed, event) {
    this.layersChangedListeners.forEach((listener: any) => {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (typeof listener.onLayersChanged === "function") {
        listener.onLayersChanged(changed, event);
      }
    });
  }

  feedItemsChanged(changed, event) {
    this.feedItemsChangedListeners.forEach((listener: any) => {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (typeof listener.onFeedItemsChanged === "function") {
        listener.onFeedItemsChanged(changed, event);
      }
    });
  }

  private buildObservationFilterParams(observationFilter: EventObservationFilter | null): Partial<ObservationsRequestOptions> {
    const params: Partial<ObservationsRequestOptions> = {};

    const { start, end } = this.filterService.getEffectiveTimeInterval(observationFilter?.timeInterval);
    if (start) params.observationStartDate = start.toISOString();
    if (end) params.observationEndDate = end.toISOString();
    if (observationFilter?.hasAttachments) params.hasAttachments = true;
    if (observationFilter?.isFlaggedImportant) params.important = true;
    if (observationFilter?.isUserFavorite) params.favoritedBy = this.sessionService.user.id;
    if (observationFilter?.fieldFilter) params.filter = observationFilter.fieldFilter;
    if (observationFilter?.memberFilter?.teamIds?.length) params.teams = observationFilter.memberFilter.teamIds;
    if (observationFilter?.memberFilter?.userIds?.length) params.users = observationFilter.memberFilter.userIds;

    return params;
  }

  fetchMapObservations(): Observable<any> {
    const event = this.mapObservations.event;
    if (!event) return of(null);

    const lastModified = this.mapObservations.lastModified;
    const observationFilter = this.filterService.getObservationFilter();

    const params: ObservationsRequestOptions = {
      ...this.buildObservationFilterParams(observationFilter)
    };

    if (lastModified) {
      params.startDate = lastModified;
    } else {
      params.states = ObservationStateName.Active;
    }

    return this.observationService
      .getObservationsForMap(event, params)
      .pipe(
        map((observations: Observation[]) => this.parseMapObservations(observations, lastModified)),
        catchError((err) => {
          console.error(`error fetching map observations for event ${event.id}`, err);
          return of(null);
        })
      );
  }

  fetchObservationPage(userInitiated = false): Observable<any> {
    const event = this.filterService.getEvent();
    if (!event) return of(null);

    const pagingOptions = this.observationService.getPagingOptions();
    if (!pagingOptions) return of(null);

    const observationFilter = this.filterService.getObservationFilter();

    const params: ObservationsPageRequestOptions = {
      populate: true,
      states: ObservationStateName.Active,
      include_total_count: true,
      page: pagingOptions.page,
      page_size: pagingOptions.page_size,
      sort: 'timestamp+desc',
      ...this.buildObservationFilterParams(observationFilter)
    };

    return this.observationService
      .getObservationsPage(event, params)
      .pipe(
        tap((page: any) => this.observationPageSubject.next({
          data: page.items ?? [],
          totalCount: page.totalCount ?? 0,
          pageIndex: pagingOptions.page,
          error: null,
          userInitiated
        })),
        catchError((err) => {
          console.error(`error fetching observation page for event ${event.id}`, err);
          const prev = this.observationPageSubject.getValue();
          this.observationPageSubject.next({
            data: prev?.data ?? [],
            totalCount: prev?.totalCount ?? 0,
            pageIndex: prev?.pageIndex ?? pagingOptions.page,
            error: err,
            userInitiated
          });
          return of(null);
        })
      );
  }

  fetchLocations(userInitiated = false): Observable<any> {
    const event = this.locations?.event;
    if (!event) return of(null);

    const locationFilter = this.filterService.getLocationFilter();
    const params: LocationsRequestOptions = { populate: true };

    const { start, end } = this.filterService.getEffectiveTimeInterval(locationFilter?.timeInterval);
    if (start) params.startDate = start.toISOString();
    if (end) params.endDate = end.toISOString();

    if (locationFilter?.memberFilter?.teamIds?.length) params.teams = locationFilter.memberFilter.teamIds;
    if (locationFilter?.memberFilter?.userIds?.length) params.users = locationFilter.memberFilter.userIds;

    return this.locationService
      .getUserLocationsForEvent(event, params)
      .pipe(
        map((userLocations: any) => this.parseLocations(userLocations, userInitiated)),
        catchError((err) => {
          console.error(`error fetching locations for event ${event.id}`, err);
          this.locationsSubject.next({
            data: Object.values(this.locations?.byId ?? {}),
            error: err,
            userInitiated
          });
          return of(null);
        })
      );
  }

  fetchLayers(event: MageEvent) {
    return this.layerService.getLayersForEvent(event).pipe(takeUntil(this.destroy$)).subscribe((layers: Layer[]) => {
      const added = layers.filter((l) => {
        return !Object.keys(this.eventsById[event.id].layersById || {}).some((layerId: any) => l.id === layerId);
      });

      const removed = Object.keys(this.eventsById[event.id].layersById || {}).filter((layerId: any) => {
        return !layers.some((l: Layer) => l.id === layerId);
      });

      this.eventsById[event.id].layersById = _.keyBy(layers, 'id');
      this.layersChanged({ added: added, removed: removed }, event);
    });
  }

  fetchFeeds(event: MageEvent) {
    this.feedService.fetchFeeds(event.id).pipe(takeUntil(this.destroy$)).subscribe(feeds => {
      this.feedItemsChanged({
        added: feeds.map(feed => {
          return {
            feed,
            items: [] as GeoJSON.Feature[]
          };
        })
      }, event);

      this.eventsById[event.id].feedsById = _.keyBy(feeds, 'id');
      this.feedSyncStates = feeds.map(feed => {
        return {
          id: feed.id,
          lastSync: 0
        };
      });

      this.pollFeeds();
    });
  }

  parseMapObservations(observations: Observation[], lastModified: string | undefined = undefined): void {
    const added: Observation[] = [];
    const updated: Observation[] = [];
    const removed: Observation[] = [];

    const trackLastModified = (observation: Observation) => {
      const observationLastModified = observation.lastModified;
      if (observationLastModified && (!lastModified || observationLastModified > lastModified)) {
        lastModified = observationLastModified;
      }
    };

    const observationsById = this.mapObservations.byId;
    observations.forEach((observation: Observation) => {
      trackLastModified(observation);
      if (observation.state?.name === ObservationStateName.Archived) {
        if (observationsById[observation.id]) {
          removed.push(observation);
          delete observationsById[observation.id];
        }
      } else {
        const local = observationsById[observation.id];
        if (!local) {
          added.push(observation);
          observationsById[observation.id] = observation;
        } else if (local.lastModified !== observation.lastModified) {
          updated.push(observation);
          observationsById[observation.id] = observation;
        }
      }
    });

    this.mapObservations.lastModified = lastModified;

    if (added.length || updated.length || removed.length || !lastModified) {
      this.mapObservationsChanged();
    }
  }

  parseLocations(userLocations: any, userInitiated = false): void {
    if (!this.locations) return;

    const added = [];
    const updated = [];

    const existingUsersById = { ...this.locations.byId };
    const usersById: Record<string, any> = {};
    userLocations.forEach((userLocation: any) => {
      const location = userLocation.locations[0];
      location.id = userLocation.id;

      userLocation.location = location;
      delete userLocation.locations;

      const token = this.sessionService.getToken();
      if (userLocation.user.iconUrl && token) {
        const params = new HttpParams().append('access_token', token);

        location.style = {
          iconUrl: `${userLocation.user.iconUrl}?${params.toString()}`
        };
      }

      const localUser = existingUsersById[userLocation.id];
      if (localUser) {
        if (userLocation.location.properties.timestamp !== localUser.location.properties.timestamp) {
          updated.push(userLocation);
        }
      } else {
        added.push(userLocation);
      }

      delete existingUsersById[userLocation.id];
      usersById[userLocation.id] = userLocation;
    });

    const removed = Object.values(existingUsersById);

    this.locations.byId = usersById;

    if (added.length || updated.length || removed.length || Object.keys(usersById).length === 0) {
      this.usersChanged(userInitiated);
    }
  }

  getNextFeed(event: MageEvent): Feed | undefined {
    const now = Date.now();
    const feedsById = this.eventsById[event.id]?.feedsById ?? {};
    const feedsInSyncPriorityOrder = _.sortBy(this.feedSyncStates, feed => { return feed.lastSync; });
    const nextFeed = feedsInSyncPriorityOrder.find(syncState => {
      if (!syncState.lastSync) {
        return true;
      }
      const feed = feedsById[syncState.id];
      if (feed && (now - syncState.lastSync) > ((feed.updateFrequencySeconds ?? 0) * 1000)) {
        return true;
      }
    });
    return nextFeed ? feedsById[nextFeed.id] : undefined;
  }

  getFeedFetchDelay(event: MageEvent) {
    const now = Date.now();
    const feedsById = this.eventsById[event.id]?.feedsById ?? {};
    const delays = this.feedSyncStates.map(syncState => {
      const feed = feedsById[syncState.id];
      if (!syncState.lastSync || !feed) {
        return 0;
      }
      const elapsed = now - syncState.lastSync;
      const frequencyMillis = (feed.updateFrequencySeconds ?? 0) * 1000;
      return frequencyMillis - elapsed;
    });

    return delays.length > 0 ? Math.min(...delays) : 60 * 1000;
  }

  pollFeeds() {
    const event = this.filterService.getEvent();
    if (!event) return;
    const feed = this.getNextFeed(event);
    const scheduleNextPoll = () => {
      const delayMillis = this.getFeedFetchDelay(event);
      clearTimeout(this.feedPollTimeout);
      this.feedPollTimeout = setTimeout(() => {
        this.pollFeeds();
      }, delayMillis);
    };

    if (!feed) {
      return scheduleNextPoll();
    }

    this.feedItemsSubscription = this.feedService.fetchFeedItems(event, feed).pipe(
      tap((content: any) => {
        this.feedItemsChanged({
          updated: [{ feed, items: content.items.features }]
        }, event);
      }),
      catchError((err) => {
        console.error(`error fetching feed content for feed ${feed.id}, ${feed.title}`, err);
        return of();
      })
    ).subscribe({
      complete: () => {
        const state = this.feedSyncStates.find(f => f.id === feed.id);
        if (state) state.lastSync = Date.now();
        scheduleNextPoll();
      }
    });
  }
}
