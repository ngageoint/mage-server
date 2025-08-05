import { Injectable } from "@angular/core";
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  finalize,
  map,
  of,
  take,
  tap,
} from "rxjs";
import { FilterService } from "../filter/filter.service";
import { PollingService } from "./polling.service";
import { ObservationService } from "../observation/observation.service";
import { HttpClient, HttpParams } from "@angular/common/http";
import { LayerService } from "../layer/layer.service";
import { LocationService } from "../user/location/location.service";
import { LocalStorageService } from "../http/local-storage.service";
import * as _ from "lodash";
import * as moment from "moment";
import { FeedService } from "@ngageoint/mage.web-core-lib/feed";
import { User } from "@ngageoint/mage.web-core-lib/user";
import { MemberPage, filterChanges } from "./event.types";
import {
  Attachment,
  Event,
  Filter,
  Form,
  FormField,
  Layer,
  Observation,
  Team,
} from "../filter/filter.types";

@Injectable({
  providedIn: "root",
})
export class EventService {
  private observationsChangedListeners: any = [];
  private usersChangedListeners: any = [];
  private layersChangedListeners: any = [];
  private feedItemsChangedListeners: any = [];
  private pollListeners: any = [];
  private eventsById: any = {};
  private pollingTimeout: any = null;
  private feedPollTimeout: any = null;
  private feedSyncStates: any = {};
  private memberSubject = new Subject<User[]>();

  constructor(
    private pollingService: PollingService,
    private httpClient: HttpClient,
    private feedService: FeedService,
    private layerService: LayerService,
    private filterService: FilterService,
    private locationService: LocationService,
    private observationService: ObservationService,
    private localStorageService: LocalStorageService
  ) {}

  init() {
    this.filterService.addListener(this);
    this.pollingService.addListener(this);
  }

  destroy() {
    this.eventsById = {};
    this.filterService.removeListener(this);
    this.pollingService.removeListener(this);

    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
    }

    if (this.feedPollTimeout) {
      clearTimeout(this.feedPollTimeout);
    }

    this.memberSubject.unsubscribe();
  }

  query(options?: any): Observable<any> {
    options = options || {};
    return this.httpClient.get<any>("/api/events/", options);
  }

  addFeed(eventId: string, feed: any): Observable<any> {
    return this.httpClient.post<any>(`/api/events/${eventId}/feeds`, feed);
  }

  removeFeed(eventId: string, feedId: string): Observable<any> {
    return this.httpClient.delete<any>(
      `/api/events/${eventId}/feeds/${feedId}`
    );
  }

  async onFilterChanged(filter: any) {
    if (filter.event) {
      this.onEventChanged(filter.event);
    }
    if (filter.event?.added?.length || filter.timeInterval) {
      // requery server
      await this.fetch().subscribe();
    }

    this.onFiltersChanged(filter);

    if (filter.actionFilter) {
      this.onActionFilterChanged();
    }
  }

  onEventChanged(event: filterChanges) {
    const { added = [], removed = [] } = event;
    added.forEach((added: any) => {
      if (!this.eventsById[added.id]) {
        this.eventsById[added.id] = JSON.parse(JSON.stringify(added));

        this.eventsById[added.id].filteredObservationsById = {};
        this.eventsById[added.id].observationsById = {};
        this.eventsById[added.id].usersById = {};
        this.eventsById[added.id].filteredUsersById = {};
      }

      this.fetchLayers(added);
      this.fetchFeeds(added);
    });

    removed.forEach((removed: any) => {
      this.observationsChanged({
        removed: Object.values(
          this.eventsById[removed.id]?.filteredObservationsById || {}
        ),
      });
      this.usersChanged({
        removed: Object.values(
          this.eventsById[removed.id]?.filteredUsersById || {}
        ),
      });
      this.layersChanged(
        {
          removed: Object.values(this.eventsById[removed.id]?.layersById || {}),
        },
        removed
      );
      this.feedItemsChanged(
        {
          removed: Object.values(
            this.eventsById[removed.id]?.feedsById || {}
          ).map((feed: any) => ({ feed })),
        },
        removed
      );
      delete this.eventsById[removed.id];
    });
  }

  /**
   * Updates List of Observations and Users when Filter Changes
   * @param  {Filter} filter Filter Parametes
   * @return {void} No Return
   */

  onFiltersChanged(filter: Filter): void {
    const event = this.filterService.getEvent();
    if (!event) return;

    const teamsEvent = this.eventsById[event.id];
    if (!teamsEvent) return;

    // remove observations that are not made by filtered users
    const observationsRemoved = [];
    Object.values(teamsEvent.filteredObservationsById).forEach(
      (observation: Observation) => {
        if (
          (filter.users &&
            !this.filterService.isUserInList(observation.userId)) ||
          (filter.teams &&
            !this.filterService.isUserInTeamFilter(observation.userId)) ||
          (filter.forms &&
            !this.filterService.hasFormInList(observation.properties.forms))
        ) {
          delete teamsEvent.filteredObservationsById[observation.id];
          observationsRemoved.push(observation);
        }
      }
    );

    // remove users that are not part of filtered teams
    const usersRemoved = [];
    Object.values(teamsEvent.filteredUsersById).forEach((user: User) => {
      if (
        (filter.users && !this.filterService.isUserInList(user.id)) ||
        (filter.teams && !this.filterService.isUserInTeamFilter(user.id))
      ) {
        delete teamsEvent.filteredUsersById[user.id];
        usersRemoved.push(user);
      }
    });

    // add any observations that are part of the filtered teams
    const observationsAdded = [];
    Object.values(teamsEvent.observationsById).forEach(
      (observation: Observation) => {
        if (
          filter.users &&
          this.filterService.isUserInList(observation.userId) &&
          filter.teams &&
          this.filterService.isUserInTeamFilter(observation.userId) &&
          filter.forms &&
          this.filterService.hasFormInList(observation.properties.forms) &&
          !teamsEvent.filteredObservationsById[observation.id]
        ) {
          observationsAdded.push(observation);
          teamsEvent.filteredObservationsById[observation.id] = observation;
        }
      }
    );

    // add any users that are part of the filtered teams
    const usersAdded = [];
    Object.values(teamsEvent.usersById).forEach((user: User) => {
      if (
        filter.users &&
        !this.filterService.isUserInList(user.id) &&
        filter.teams &&
        !this.filterService.isUserInTeamFilter(user.id) &&
        !teamsEvent.filteredUsersById[user.id]
      ) {
        usersAdded.push(user);
        teamsEvent.filteredUsersById[user.id] = user;
      }
    });

    this.observationsChanged({
      added: observationsAdded,
      removed: observationsRemoved,
    });
    this.usersChanged({ added: usersAdded, removed: usersRemoved });
  }

  onActionFilterChanged() {
    const event = this.filterService.getEvent();
    if (!event) return;

    const actionEvent = this.eventsById[event.id];

    const observationsRemoved = [];
    Object.values(actionEvent.filteredObservationsById).forEach(
      (observation: Observation) => {
        if (!this.filterService.observationInFilter(observation)) {
          delete actionEvent.filteredObservationsById[observation.id];
          observationsRemoved.push(observation);
        }
      }
    );

    const observationsAdded = [];
    // add any observations that are part of the filtered actions
    Object.values(actionEvent.observationsById).forEach(
      (observation: Observation) => {
        if (
          !actionEvent.filteredObservationsById[observation.id] &&
          this.filterService.observationInFilter(observation)
        ) {
          observationsAdded.push(observation);
          actionEvent.filteredObservationsById[observation.id] = observation;
        }
      }
    );

    this.observationsChanged({
      added: observationsAdded,
      removed: observationsRemoved,
    });
  }

  onPollingIntervalChanged(interval: any) {
    if (this.pollingTimeout) {
      // cancel previous poll
      clearTimeout(this.pollingTimeout);
    }

    this.pollingTimeout = setTimeout(() => {
      this.poll(interval);
    }, interval);
  }

  addObservationsChangedListener(listener: any) {
    this.observationsChangedListeners.push(listener);

    if (typeof listener.onObservationsChanged === "function") {
      Object.values(this.eventsById).forEach((event: any) => {
        listener.onObservationsChanged({
          added: Object.values(event.observationsById),
        });
      });
    }
  }

  removeObservationsChangedListener(listener) {
    this.observationsChangedListeners =
      this.observationsChangedListeners.filter((l: any) => {
        return listener !== l;
      });
  }

  addUsersChangedListener(listener) {
    this.usersChangedListeners.push(listener);

    if (typeof listener.onUsersChanged === "function") {
      Object.values(this.eventsById).forEach((event: any) => {
        listener.onUsersChanged({ added: Object.values(event.usersById) });
      });
    }
  }

  removeUsersChangedListener(listener) {
    this.usersChangedListeners = this.usersChangedListeners.filter((l: any) => {
      return listener !== l;
    });
  }

  addLayersChangedListener(listener) {
    this.layersChangedListeners.push(listener);

    if (typeof listener.onLayersChanged === "function") {
      Object.values(this.eventsById).forEach((event: any) => {
        listener.onLayersChanged(
          { added: Object.values(event.layersById) },
          event
        ); // TODO this could be old layers, admin panel might have changed layers
      });
    }
  }

  addFeedItemsChangedListener(listener) {
    this.feedItemsChangedListeners.push(listener);

    if (typeof listener.onFeedItemsChanged === "function") {
      Object.values(this.eventsById).forEach((event: any) => {
        // TODO what do I send here?
        // listener.onFeedItemsChanged({ added: _.values(event.feedsById) }, event);
      });
    }
  }

  addPollListener(listener) {
    this.pollListeners.push(listener);
  }

  removePollListener(listener) {
    this.pollListeners = this.pollListeners.filter((l: any) => {
      return listener !== l;
    });
  }

  removeLayersChangedListener(listener) {
    this.layersChangedListeners = this.layersChangedListeners.filter(
      (l: any) => {
        return listener !== l;
      }
    );
  }

  removeFeedItemsChangedListener(listener) {
    this.feedItemsChangedListeners = this.feedItemsChangedListeners.filter(
      (l: any) => {
        return listener !== l;
      }
    );
  }

  getEventById(eventId) {
    return this.eventsById[eventId];
  }

  saveObservation(observation: Observation) {
    const event = this.eventsById[observation.eventId];
    const isNewObservation = !observation.id;

    return this.observationService
      .saveObservationForEvent(event, observation)
      .pipe(
        tap((update: Observation) => {
          event.observationsById[update.id] = update;

          // Check if this new observation passes the current filter
          if (this.filterService.observationInFilter(update)) {
            event.filteredObservationsById[update.id] = update;
            isNewObservation
              ? this.observationsChanged({ added: [update] })
              : this.observationsChanged({ updated: [update] });
          }
        })
      );
  }

  addObservationFavorite(observation) {
    let event = this.eventsById[observation.eventId];
    return this.observationService
      .addObservationFavorite(event, observation)
      .pipe(
        tap((update: Observation) => {
          event.observationsById[update.id] = update;
          this.observationsChanged({ updated: [update] });
        })
      );
  }

  removeObservationFavorite(observation) {
    let event = this.eventsById[observation.eventId];
    return this.observationService
      .removeObservationFavorite(event, observation)
      .pipe(
        tap((update: Observation) => {
          event.observationsById[update.id] = update;
          this.observationsChanged({ updated: [update] });
        })
      );
  }

  markObservationAsImportant(
    observation: Observation,
    important
  ): Observable<Observation> {
    let event = this.eventsById[observation.eventId];
    return this.observationService
      .markObservationAsImportantForEvent(event, observation, important)
      .pipe(
        tap((update: Observation) => {
          event.observationsById[update.id] = update;
          this.observationsChanged({ updated: [update] });
        })
      );
  }

  clearObservationAsImportant(
    observation: Observation
  ): Observable<Observation> {
    let event = this.eventsById[observation.eventId];
    return this.observationService
      .clearObservationAsImportantForEvent(event, observation)
      .pipe(
        tap((update: Observation) => {
          event.observationsById[update.id] = update;
          this.observationsChanged({ updated: [update] });
        })
      );
  }

  archiveObservation(observation): Observable<Observation> {
    let event = this.eventsById[observation.eventId];
    return this.observationService
      .archiveObservationForEvent(event, observation)
      .pipe(
        tap((archived: Observation) => {
          delete event.observationsById[archived.id];
          this.observationsChanged({ removed: [archived] });
        })
      );
  }

  addAttachmentToObservation(observation: Observation, attachment: Attachment) {
    const event = this.eventsById[observation.eventId];
    this.observationService.addAttachmentToObservationForEvent(
      event,
      observation,
      attachment
    );
    this.observationsChanged({ updated: [observation] });
  }

  deleteAttachmentForObservation(observation, attachment) {
    const event = this.eventsById[observation.eventId];
    return this.observationService
      .deleteAttachmentInObservationForEvent(event, observation, attachment)
      .subscribe((observation: Observation) => {
        this.observationsChanged({ updated: [observation] });
      });
  }

  getFormField(form: Form, fieldName: string) {
    return form.fields.find((field: FormField) => field.name === fieldName);
  }

  getForms(observation: Observation, options?: any) {
    let event = this.eventsById[observation.eventId];
    return this.getFormsForEvent(event, options);
  }

  getFormsForEvent(event: Event, options?: any) {
    options = options || {};
    let forms = event.forms;
    if (options.archived === false) {
      forms = forms.filter((form: Form) => !form.archived);
    }

    return forms;
  }

  createForm(observationForm: any, formDefinition: any, viewModel?: any) {
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

  exportForm(event): Observable<Form> {
    return this.httpClient.get<Form>(`/api/event/${event.id}/form.zip`);
  }

  getMembers(event): Observable<User[]> {
    return this.httpClient
      .get<MemberPage>(`/api/events/${event.id}/members?page_size=${Number.MAX_SAFE_INTEGER}`)
      .pipe(
        take(1),
        map(res => res.items)
      );
  }
  

  isUserInEvent(user, event): boolean {
    if (!event) return false;
    return event.teams.some((team: Team) => team.userIds.includes(user.id));
  }

  usersChanged(changed) {
    this.usersChangedListeners.forEach((listener: any) => {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (typeof listener.onUsersChanged === "function") {
        listener.onUsersChanged(changed);
      }
    });
  }

  observationsChanged(changed: filterChanges) {
    this.observationsChangedListeners.forEach((listener: any) => {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (typeof listener.onObservationsChanged === "function") {
        listener.onObservationsChanged(changed);
      }
    });
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

  fetch(): Observable<any> {
    const event = this.filterService.getEvent();
    if (!event) {
      return of();
    }

    const parameters: any = {};
    const interval = this.filterService.getInterval();
    if (interval) {
      const time = this.filterService.formatInterval(interval);
      parameters.interval = time;
    }

    return combineLatest([
      this.locationService
        .getUserLocationsForEvent(event, parameters)
        .pipe(map((locations: any) => this.parseLocations(event, locations))),
      this.observationService
        .getObservationsForEvent(event, parameters)
        .pipe(
          map((observations: Observation[]) =>
            this.parseObservations(event, observations)
          )
        ),
    ]);
  }

  fetchLayers(event) {
    return this.layerService
      .getLayersForEvent(event)
      .subscribe((layers: Layer[]) => {
        const added = layers.filter((l) => {
          return !Object.keys(this.eventsById[event.id].layersById || {}).some(
            (layerId: any) => l.id === layerId
          );
        });

        const removed = Object.keys(
          this.eventsById[event.id].layersById || {}
        ).filter((layerId: any) => {
          return !layers.some((l: Layer) => l.id === layerId);
        });

        this.eventsById[event.id].layersById = _.keyBy(layers, "id");
        this.layersChanged({ added: added, removed: removed }, event);
      });
  }

  fetchFeeds(event) {
    this.feedService.fetchFeeds(event.id).subscribe((feeds) => {
      this.feedItemsChanged(
        {
          added: feeds.map((feed) => {
            return {
              feed,
              items: [],
            };
          }),
        },
        event
      );

      this.eventsById[event.id].feedsById = _.keyBy(feeds, "id");
      this.feedSyncStates = feeds.map((feed) => {
        return {
          id: feed.id,
          lastSync: 0,
        };
      });

      this.pollFeeds();
    });
  }

  parseObservations(event: Event, observations: Observation[]): void {
    const added = [];
    const updated = [];
    const removed = [];

    const observationsById = {};
    let filteredObservationsById =
      this.eventsById[event.id].filteredObservationsById;
    observations.forEach((observation: Observation) => {
      // Check if this observation passes the current filter
      if (this.filterService.observationInFilter(observation)) {
        // Check if we already have this observation, if so update, otherwise add
        let localObservation = filteredObservationsById[observation.id];
        if (localObservation) {
          if (localObservation.lastModified !== observation.lastModified) {
            updated.push(observation);
          } else if (observation.attachments) {
            let some = _.some(observation.attachments, function (attachment) {
              let localAttachment = _.find(
                localObservation.attachments,
                function (a) {
                  return a.id === attachment.id;
                }
              );
              return (
                !localAttachment ||
                localAttachment.lastModified !== attachment.lastModified
              );
            });

            if (some) updated.push(observation);
          }
        } else {
          added.push(observation);
        }

        // remove from list of observations if it came back from server
        // remaining elements in this list will be removed
        delete filteredObservationsById[observation.id];

        observationsById[observation.id] = observation;
      }
    });

    // remaining elements were not pulled from the server, hence we should remove them
    removed.push(Object.values(filteredObservationsById));

    this.eventsById[event.id].observationsById = _.keyBy(observations, "id");
    this.eventsById[event.id].filteredObservationsById = observationsById;

    this.observationsChanged({
      added: added,
      updated: updated,
      removed: removed,
    });
  }

  parseLocations(event: Event, userLocations: any): void {
    const added = [];
    const updated = [];

    const usersById = {};
    const filteredUsersById = this.eventsById[event.id].filteredUsersById;
    userLocations.forEach((userLocation: any) => {
      // Track each location feature by users id,
      // so update the locations id to match the usersId
      const location = userLocation.locations[0];
      location.id = userLocation.id;

      userLocation.location = location;
      delete userLocation.locations;

      if (userLocation.user.iconUrl) {
        let params = new HttpParams();
        params = params.append(
          "access_token",
          this.localStorageService.getToken()
        );
        params = params.append("_dc", userLocation.user.lastUpdated);

        location.style = {
          iconUrl: `${userLocation.user.iconUrl}?${params.toString()}`,
        };
      }

      if (this.filterService.isUserInTeamFilter(userLocation.id)) {
        // Check if we already have this user, if so update, otherwise add
        const localUser = filteredUsersById[userLocation.id];
        if (localUser) {
          if (
            userLocation.location.properties.timestamp !==
            localUser.location.properties.timestamp
          ) {
            updated.push(userLocation);
          }
        } else {
          added.push(userLocation);
        }

        // remove from list of observations if it came back from server
        // remaining elements in this list will be removed
        delete filteredUsersById[userLocation.id];

        usersById[userLocation.id] = userLocation;
      }
    });

    // remaining elements were not pulled from the server, hence we should remove them
    const removed = _.values(filteredUsersById);

    this.eventsById[event.id].usersById = _.keyBy(userLocations, "id");
    this.eventsById[event.id].filteredUsersById = usersById;

    this.usersChanged({ added: added, updated: updated, removed: removed });
  }

  poll(interval) {
    if (interval <= 0) {
      return;
    }
    this.fetch().subscribe(() => {
      this.pollListeners.forEach((listener: any) => {
        if (typeof listener.onPoll === "function") {
          listener.onPoll();
        }
      });

      this.pollingTimeout = setTimeout(() => {
        this.poll(interval);
      }, interval);
    });
  }

  getNextFeed(event: Event) {
    const now = Date.now();
    const feedsInSyncPriorityOrder = _.sortBy(this.feedSyncStates, (feed) => {
      return feed.lastSync;
    });
    const nextFeed =
      feedsInSyncPriorityOrder.find((syncState) => {
        if (!syncState.lastSync) {
          return true;
        }
        const feed = this.eventsById[event.id].feedsById[syncState.id];
        if (now - syncState.lastSync > feed.updateFrequencySeconds * 1000) {
          return true;
        }
      }) || {};
    return this.eventsById[event.id].feedsById[nextFeed.id];
  }

  getFeedFetchDelay(event: Event) {
    const now = Date.now();
    const delays = this.feedSyncStates.map((syncState) => {
      const feed = this.eventsById[event.id].feedsById[syncState.id];
      if (!syncState.lastSync) {
        return 0;
      }
      const elapsed = now - syncState.lastSync;
      const frequencyMillis = feed.updateFrequencySeconds * 1000;
      return frequencyMillis - elapsed;
    });

    return delays.length > 0 ? Math.min(...delays) : 60 * 1000;
  }

  pollFeeds() {
    const event = this.filterService.getEvent();
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

    this.feedService
      .fetchFeedItems(event, feed)
      .pipe(
        tap((content: any) => {
          // TODO is this really created or updated, maybe just create as empty when,
          // feeds come back
          this.feedItemsChanged(
            {
              updated: [{ feed, items: content.items.features }],
            },
            event
          );
        }),
        catchError((err) => {
          // TODO: add error handling
          console.error(
            `error fetching feed content for feed ${feed.id}, ${feed.title}`,
            err
          );
          return of();
        }),
        finalize(() => {
          const state = this.feedSyncStates.find((f) => f.id === feed.id);
          state.lastSync = Date.now();
          scheduleNextPoll();
        })
      )
      .subscribe();
  }
}
