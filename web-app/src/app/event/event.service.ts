import { Injectable } from "@angular/core";
import { Observable, ObservableInput, catchError, finalize, forkJoin, of, tap, zip } from "rxjs";
import * as moment from 'moment'
import { FilterService } from "../filter/filter.service";
import { PollingService } from "./polling.service";
import { ObservationService } from "../observation/observation.service";
import { HttpClient, HttpParams } from "@angular/common/http";
import { LayerService } from "../layer/layer.service";
import { FeedService } from "core-lib-src/feed";
import { LocationService } from "../user/location/location.service";
import { LocalStorageService } from "../http/local-storage.service";
import * as _ from 'lodash'

@Injectable({
  providedIn: 'root'
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
    this.filterService.addListener(this)
    this.pollingService.addListener(this)
  }

  destroy() {
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout)
    }

    if (this.feedPollTimeout) {
      clearTimeout(this.feedPollTimeout)
    }
  }

  query(options?: any): Observable<any> {
    options = options || {};
    return this.httpClient.get<any>('/api/events/', options)
  }

  addFeed(eventId: string, feed: any): Observable<any> {
    return this.httpClient.post<any>(`/api/events/${eventId}/feeds`, feed)
  }

  removeFeed(eventId: string, feedId: string): Observable<any> {
    return this.httpClient.delete<any>(`/api/events/${eventId}/feeds/${feedId}`)
  }

  onFilterChanged(filter: any) {
    if (filter.event) {
      this.onEventChanged(filter.event);
    }

    if (filter.event || filter.timeInterval) { // requery server
      this.fetch();
    } else if (filter.teams) { // filter in memory
      this.onTeamsChanged();
    }

    if (filter.actionFilter) {
      this.onActionFilterChanged();
    }
  }

  onEventChanged(event: any) {
    const { added = [], removed = [], foo = [] } = event 
    added.forEach((added: any) => {
      if (!this.eventsById[added.id]) {
        this.eventsById[added.id] = (JSON.parse(JSON.stringify(added)));

        this.eventsById[added.id].filteredObservationsById = {};
        this.eventsById[added.id].observationsById = {};
        this.eventsById[added.id].usersById = {};
        this.eventsById[added.id].filteredUsersById = {};
      }

      this.fetchLayers(added);
      this.fetchFeeds(added);
    })

    removed.forEach((removed: any) => {
      this.observationsChanged({ removed: Object.values(this.eventsById[removed.id].filteredObservationsById) });
      this.usersChanged({ removed: Object.values(this.eventsById[removed.id].filteredUsersById) });
      this.layersChanged({ removed: Object.values(this.eventsById[removed.id].layersById) }, removed);
      this.feedItemsChanged({ removed: Object.values(this.eventsById[removed.id].feedsById).map((feed: any) => ({ feed })) }, removed);
      delete this.eventsById[removed.id];
    })
  }

  onTeamsChanged() {
    const event = this.filterService.getEvent();
    if (!event) return;

    const teamsEvent = this.eventsById[event.id];
    if (!teamsEvent) return;

    // remove observations that are not part of filtered teams
    const observationsRemoved = [];
    Object.values(teamsEvent.filteredObservationsById).forEach((observation: any) => {
      if (!this.filterService.isUserInTeamFilter(observation.userId)) {
        delete teamsEvent.filteredObservationsById[observation.id];
        observationsRemoved.push(observation);
      }
    });

    // remove users that are not part of filtered teams
    const usersRemoved = [];
    Object.values(teamsEvent.filteredUsersById).forEach((user: any) => {
      if (!this.filterService.isUserInTeamFilter(user.id)) {
        delete teamsEvent.filteredUsersById[user.id];
        usersRemoved.push(user);
      }
    });

    // add any observations that are part of the filtered teams
    const observationsAdded = [];
    Object.values(teamsEvent.observationsById).forEach((observation: any) => {
      if (this.filterService.isUserInTeamFilter(observation.userId) && !teamsEvent.filteredObservationsById[observation.id]) {
        observationsAdded.push(observation);
        teamsEvent.filteredObservationsById[observation.id] = observation;
      }
    });

    // add any users that are part of the filtered teams
    const usersAdded = [];
    Object.values(teamsEvent.usersById).forEach((user: any) => {
      if (this.filterService.isUserInTeamFilter(user.id) && !teamsEvent.filteredUsersById[user.id]) {
        usersAdded.push(user);
        teamsEvent.filteredUsersById[user.id] = user;
      }
    });

    this.observationsChanged({ added: observationsAdded, removed: observationsRemoved });
    this.usersChanged({ added: usersAdded, removed: usersRemoved });
  }

  onActionFilterChanged() {
    const event = this.filterService.getEvent();
    if (!event) return;

    const actionEvent = this.eventsById[event.id];

    const observationsRemoved = [];
    Object.values(actionEvent.filteredObservationsById).forEach((observation: any) => {
      if (!this.filterService.observationInFilter(observation)) {
        delete actionEvent.filteredObservationsById[observation.id];
        observationsRemoved.push(observation);
      }
    });

    const observationsAdded = [];
    // add any observations that are part of the filtered actions
    Object.values(actionEvent.observationsById).forEach((observation: any) => {
      if (!actionEvent.filteredObservationsById[observation.id] && this.filterService.observationInFilter(observation)) {
        observationsAdded.push(observation);
        actionEvent.filteredObservationsById[observation.id] = observation;
      }
    });

    this.observationsChanged({ added: observationsAdded, removed: observationsRemoved });
  }

  onPollingIntervalChanged(interval: any) {
    if (this.pollingTimeout) {
      // cancel previous poll
      clearTimeout(this.pollingTimeout)
    }

    this.pollingTimeout = setTimeout(() => {
      this.poll(interval);
    }, interval)
  }

  addObservationsChangedListener(listener: any) {
    this.observationsChangedListeners.push(listener);

    if (typeof listener.onObservationsChanged === 'function') {
      Object.values(this.eventsById).forEach((event: any) => {
        listener.onObservationsChanged({ added: Object.values(event.observationsById) });
      });
    }
  }

  removeObservationsChangedListener(listener) {
    this.observationsChangedListeners = this.observationsChangedListeners.filter((l: any) => {
      return listener !== l;
    });
  }

  addUsersChangedListener(listener) {
    this.usersChangedListeners.push(listener);

    if (typeof listener.onUsersChanged === 'function') {
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

    if (typeof listener.onLayersChanged === 'function') {
      Object.values(this.eventsById).forEach((event: any) => {
        listener.onLayersChanged({ added: Object.values(event.layersById) }, event); // TODO this could be old layers, admin panel might have changed layers
      });
    }
  }

  addFeedItemsChangedListener(listener) {
    this.feedItemsChangedListeners.push(listener);

    if (typeof listener.onFeedItemsChanged === 'function') {
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
    this.layersChangedListeners = this.layersChangedListeners.filter((l: any) => {
      return listener !== l;
    });
  }

  removeFeedItemsChangedListener(listener) {
    this.feedItemsChangedListeners = this.feedItemsChangedListeners.filter((l: any) => {
      return listener !== l;
    });
  }

  getEventById(eventId) {
    return this.eventsById[eventId];
  }

  saveObservation(observation) {
    const event = this.eventsById[observation.eventId];
    const isNewObservation = !observation.id;
    const observable = this.observationService.saveObservationForEvent(event, observation)

    observable.subscribe((observation: any) => {
      event.observationsById[observation.id] = observation;

      // Check if this new observation passes the current filter
      if (this.filterService.observationInFilter(observation)) {
        event.filteredObservationsById[observation.id] = observation;
        isNewObservation ? this.observationsChanged({ added: [observation] }) : this.observationsChanged({ updated: [observation] });
      }
    })

    return observable;
  }

  addObservationFavorite(observation) {
    var event = this.eventsById[observation.eventId];

    var observable = this.observationService.addObservationFavorite(event, observation);

    observable.subscribe((updatedObservation: any) => {
      event.observationsById[updatedObservation.id] = updatedObservation;
      this.observationsChanged({ updated: [updatedObservation] });
    });

    return observable;
  }

  removeObservationFavorite(observation) {
    var event = this.eventsById[observation.eventId];

    var observable = this.observationService.removeObservationFavorite(event, observation);
    observable.subscribe((updatedObservation: any) => {
      event.observationsById[updatedObservation.id] = updatedObservation;
      this.observationsChanged({ updated: [updatedObservation] });
    });

    return observable;
  }

  markObservationAsImportant(observation, important): Observable<any> {
    var event = this.eventsById[observation.eventId];
    const observable = this.observationService.markObservationAsImportantForEvent(event, observation, important)
    observable.subscribe((updatedObservation: any) => {
      event.observationsById[updatedObservation.id] = updatedObservation;
      this.observationsChanged({ updated: [updatedObservation] });
    })

    return observable
  }

  clearObservationAsImportant(observation): Observable<any> {
    var event = this.eventsById[observation.eventId];
    const observable = this.observationService.clearObservationAsImportantForEvent(event, observation)
    observable.subscribe((updatedObservation: any) => {
      event.observationsById[updatedObservation.id] = updatedObservation;
      this.observationsChanged({ updated: [updatedObservation] });
    })

    return observable
  }

  archiveObservation(observation): Observable<any> {
    var event = this.eventsById[observation.eventId]
    const observable = this.observationService.archiveObservationForEvent(event, observation)
    observable.subscribe((archivedObservation: any) => {
      delete event.observationsById[archivedObservation.id]
      this.observationsChanged({ removed: [archivedObservation] })
    })

    return observable
  }

  addAttachmentToObservation(observation, attachment) {
    const event = this.eventsById[observation.eventId];
    this.observationService.addAttachmentToObservationForEvent(event, observation, attachment);
    this.observationsChanged({ updated: [observation] });
  }

  deleteAttachmentForObservation(observation, attachment) {
    const event = this.eventsById[observation.eventId];
    return this.observationService.deleteAttachmentInObservationForEvent(event, observation, attachment).subscribe((observation: any) => {
      this.observationsChanged({ updated: [observation] });
    });
  }

  getFormField(form, fieldName) {
    return form.fields.find((field: any) => field.name === fieldName);
  }

  getForms(observation, options?: any) {
    var event = this.eventsById[observation.eventId];
    return this.getFormsForEvent(event, options);
  }

  getFormsForEvent(event, options?: any) {
    options = options || {};
    var forms = event.forms;
    if (options.archived === false) {
      forms = forms.filter((form: any) => !form.archived);
    }

    return forms;
  }

  createForm(observationForm, formDefinition, viewModel?: any) {
    const form = (JSON.parse(JSON.stringify(formDefinition)));

    form.remoteId = observationForm.id;

    const existingPropertyFields = [];

    for (const [key, value] of Object.entries(observationForm)) {
      const field = this.getFormField(form, key);
      if (field) {
        if (field.type === 'date' && field.value) {
          field.value = moment(value).toDate();
        } else {
          field.value = value;
        }
        existingPropertyFields.push(field);
      }
    }

    if (viewModel) {
      observationForm.fields = _.intersection(observationForm.fields, existingPropertyFields);
    }

    return form;
  }

  exportForm(event): Observable<any> {
    return this.httpClient.get<any>(`/api/event/${event.id}/form.zip`)
  }

  isUserInEvent(user, event): boolean {
    if (!event) return false;
    return event.teams.some((team: any) => team.userIds.includes(user.id));
  }

  usersChanged(changed) {
    this.usersChangedListeners.forEach((listener: any) => {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (typeof listener.onUsersChanged === 'function') {
        listener.onUsersChanged(changed);
      }
    });
  }

  observationsChanged(changed) {
    this.observationsChangedListeners.forEach((listener: any) => {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (typeof listener.onObservationsChanged === 'function') {
        listener.onObservationsChanged(changed);
      }
    });
  }

  layersChanged(changed, event) {
    this.layersChangedListeners.forEach((listener: any) => {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (typeof listener.onLayersChanged === 'function') {
        listener.onLayersChanged(changed, event);
      }
    });
  }

  feedItemsChanged(changed, event) {
    this.feedItemsChangedListeners.forEach((listener: any) => {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (typeof listener.onFeedItemsChanged === 'function') {
        listener.onFeedItemsChanged(changed, event);
      }
    });
  }

  fetch(): Observable<any> {
    const event = this.filterService.getEvent();
    if (!event) { return of()}

    const parameters: any = {};
    const interval = this.filterService.getInterval();
    if (interval) {
      const time = this.filterService.formatInterval(interval);
      parameters.interval = time;
    }

    return forkJoin({
      locations: this.fetchLocations(event, parameters),
      observations: this.fetchObservations(event, parameters)
    })
  }

  fetchLayers(event) {
    return this.layerService.getLayersForEvent(event).subscribe((layers: any) => {
      const added = layers.filter((l) => {
        return !Object.keys(this.eventsById[event.id].layersById || {}).some((layerId: any) => l.id === layerId)
      })

      const removed = Object.keys(this.eventsById[event.id].layersById || {}).filter((layerId: any) => {
        return !layers.some((l: any) => l.id === layerId);
      })

      this.eventsById[event.id].layersById = _.keyBy(layers, 'id');
      this.layersChanged({ added: added, removed: removed }, event);
    });
  }

  fetchFeeds(event) {
    this.feedService.fetchFeeds(event.id).subscribe(feeds => {
      this.feedItemsChanged({
        added: feeds.map(feed => {
          return {
            feed,
            items: []
          }
        })
      }, event);

      this.eventsById[event.id].feedsById = _.keyBy(feeds, 'id');
      this.feedSyncStates = feeds.map(feed => {
        return {
          id: feed.id,
          lastSync: 0
        }
      });

      this.pollFeeds();
    });
  }

  fetchObservations(event, parameters): Observable<any> {
    const observable = this.observationService.getObservationsForEvent(event, parameters)
    observable.subscribe((observations: any) => {
      var added = [];
      var updated = [];
      var removed = [];

      var observationsById = {};
      var filteredObservationsById = this.eventsById[event.id].filteredObservationsById;
      observations.forEach((observation: any) => {
        // Check if this observation passes the current filter
        if (this.filterService.observationInFilter(observation)) {
          // Check if we already have this observation, if so update, otherwise add
          var localObservation = filteredObservationsById[observation.id];
          if (localObservation) {
            if (localObservation.lastModified !== observation.lastModified) {
              updated.push(observation);
            } else if (observation.attachments) {
              var some = _.some(observation.attachments, function (attachment) {
                var localAttachment = _.find(localObservation.attachments, function (a) { return a.id === attachment.id; });
                return !localAttachment || localAttachment.lastModified !== attachment.lastModified;
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
      removed = Object.values(filteredObservationsById);

      this.eventsById[event.id].observationsById = _.keyBy(observations, 'id');
      this.eventsById[event.id].filteredObservationsById = observationsById;

      this.observationsChanged({ added: added, updated: updated, removed: removed });
    });

    return observable
  }

  fetchLocations(event, parameters): Observable<any> {
    const observable = this.locationService.getUserLocationsForEvent(event, parameters)

    observable.subscribe((userLocations: any) => {
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
          var params = new HttpParams();
          params = params.append('access_token', this.localStorageService.getToken())
          params = params.append('_dc', userLocation.user.lastUpdated)

          location.style = {
            iconUrl: `${userLocation.user.iconUrl}?${params.toString()}`
          }
        }

        if (this.filterService.isUserInTeamFilter(userLocation.id)) {
          // Check if we already have this user, if so update, otherwise add
          const localUser = filteredUsersById[userLocation.id];
          if (localUser) {

            if (userLocation.location.properties.timestamp !== localUser.location.properties.timestamp) {
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

      this.eventsById[event.id].usersById = _.keyBy(userLocations, 'id');
      this.eventsById[event.id].filteredUsersById = usersById;

      this.usersChanged({ added: added, updated: updated, removed: removed });
    });

    return observable
  }

  poll(interval) {
    if (interval <= 0) {
      return;
    }
    this.fetch().subscribe(() => {
      this.pollListeners.forEach((listener: any) => {
        if (typeof listener.onPoll === 'function') {
          listener.onPoll();
        }
      });

      this.pollingTimeout = setTimeout(() => {
        this.poll(interval);
      }, interval)
    });
  }

  getNextFeed(event) {
    const now = Date.now();
    const feedsInSyncPriorityOrder = _.sortBy(this.feedSyncStates, feed => { return feed.lastSync });
    const nextFeed = feedsInSyncPriorityOrder.find(syncState => {
      if (!syncState.lastSync) {
        return true;
      }
      const feed = this.eventsById[event.id].feedsById[syncState.id];
      if ((now - syncState.lastSync) > (feed.updateFrequencySeconds * 1000)) {
        return true;
      }
    }) || {};
    return this.eventsById[event.id].feedsById[nextFeed.id];
  }

  getFeedFetchDelay(event) {
    const now = Date.now();
    const delays = this.feedSyncStates.map(syncState => {
      const feed = this.eventsById[event.id].feedsById[syncState.id]
      if (!syncState.lastSync) {
        return 0;
      }
      const elapsed = now - syncState.lastSync;
      const frequencyMillis = feed.updateFrequencySeconds * 1000;
      return frequencyMillis - elapsed;
    });

    return delays.length > 0 ? Math.min(...delays) : 60 * 1000
  }

  pollFeeds() {
    const event = this.filterService.getEvent();
    const feed = this.getNextFeed(event);
    const scheduleNextPoll = () => {
      const delayMillis = this.getFeedFetchDelay(event);
      clearTimeout(this.feedPollTimeout)
      this.feedPollTimeout = setTimeout(() => {
        this.pollFeeds()
      }, delayMillis)
    };

    if (!feed) {
      return scheduleNextPoll();
    }
    
    this.feedService.fetchFeedItems(event, feed).pipe(
      tap((content: any) => {
        // TODO is this really created or updated, maybe just create as empty when,
        // feeds come back
        this.feedItemsChanged({
          updated: [{ feed, items: content.items.features }]
        }, event);
      }),
      catchError((err) => {
        // TODO: add error handling
        console.error(`error fetching feed content for feed ${feed.id}, ${feed.title}`, err);
        return of();
      }),
      finalize(() => {
        const state = this.feedSyncStates.find(f => f.id === feed.id);
        state.lastSync = Date.now();
        scheduleNextPoll();
      })
    ).subscribe();
  }
}