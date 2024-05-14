import { Injectable } from "@angular/core";
import { Observable, catchError, finalize, of, tap, zip } from "rxjs";
import * as _ from 'underscore';
import * as moment from 'moment'
import { FilterService } from "../filter/filter.service";
import { PollingService } from "./polling.service";
import { ObservationService } from "../observation/observation.service";
import { HttpClient, HttpParams } from "@angular/common/http";
import { LayerService } from "../layer/layer.service";
import { FeedService } from "core-lib-src/feed";
import { LocationService } from "../location/location.service";

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
    pollingService: PollingService,
    private httpClient: HttpClient,
    private feedService: FeedService,
    private layerService: LayerService,
    private filterService: FilterService,
    private locationService: LocationService,
    private observationService: ObservationService
  ) {
    filterService.addListener(this);
    pollingService.addListener(this);
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
    _.each(event.added, function (added: any) {
      if (!this.eventsById[added.id]) {
        this.eventsById[added.id] = (JSON.parse(JSON.stringify(added)));

        this.eventsById[added.id].filteredObservationsById = {};
        this.eventsById[added.id].observationsById = {};
        this.eventsById[added.id].usersById = {};
        this.eventsById[added.id].filteredUsersById = {};
      }

      this.fetchLayers(added);
      this.fetchFeeds(added);
    });

    _.each(event.removed, function (removed) {
      this.observationsChanged({ removed: _.values(this.eventsById[removed.id].filteredObservationsById) });
      this.usersChanged({ removed: _.values(this.eventsById[removed.id].filteredUsersById) });
      this.layersChanged({ removed: _.values(this.eventsById[removed.id].layersById) }, removed);
      this.feedItemsChanged({ removed: _.values(this.eventsById[removed.id].feedsById).map((feed: any) => ({ feed })) }, removed);
      delete this.eventsById[removed.id];
    });
  }

  onTeamsChanged() {
    const event = this.filterService.getEvent();
    if (!event) return;

    const teamsEvent = this.eventsById[event.id];
    if (!teamsEvent) return;

    // remove observations that are not part of filtered teams
    const observationsRemoved = [];
    _.each(teamsEvent.filteredObservationsById, function (observation: any) {
      if (!this.filterService.isUserInTeamFilter(observation.userId)) {
        delete teamsEvent.filteredObservationsById[observation.id];
        observationsRemoved.push(observation);
      }
    });

    // remove users that are not part of filtered teams
    const usersRemoved = [];
    _.each(teamsEvent.filteredUsersById, function (user: any) {
      if (!this.filterService.isUserInTeamFilter(user.id)) {
        delete teamsEvent.filteredUsersById[user.id];
        usersRemoved.push(user);
      }
    });

    // add any observations that are part of the filtered teams
    const observationsAdded = [];
    _.each(teamsEvent.observationsById, function (observation) {
      if (this.filterService.isUserInTeamFilter(observation.userId) && !teamsEvent.filteredObservationsById[observation.id]) {
        observationsAdded.push(observation);
        teamsEvent.filteredObservationsById[observation.id] = observation;
      }
    });

    // add any users that are part of the filtered teams
    const usersAdded = [];
    _.each(teamsEvent.usersById, function (user) {
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
    _.each(actionEvent.filteredObservationsById, function (observation: any) {
      if (!this.filterService.observationInFilter(observation)) {
        delete actionEvent.filteredObservationsById[observation.id];
        observationsRemoved.push(observation);
      }
    });

    const observationsAdded = [];
    // add any observations that are part of the filtered actions
    _.each(actionEvent.observationsById, function (observation) {
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

  destroy() {
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout)
    }

    if (this.feedPollTimeout) {
      clearTimeout(this.feedPollTimeout)
    }
  }

  addObservationsChangedListener(listener: any) {
    this.observationsChangedListeners.push(listener);

    if (_.isFunction(listener.onObservationsChanged)) {
      _.each(_.values(this.eventsById), function (event: any) {
        listener.onObservationsChanged({ added: _.values(event.observationsById) });
      });
    }
  }

  removeObservationsChangedListener(listener) {
    this.observationsChangedListeners = _.reject(this.observationsChangedListeners, function (l) {
      return listener === l;
    });
  }

  addUsersChangedListener(listener) {
    this.usersChangedListeners.push(listener);

    if (_.isFunction(listener.onUsersChanged)) {
      _.each(_.values(this.eventsById), function (event) {
        listener.onUsersChanged({ added: _.values(event.usersById) });
      });
    }
  }

  removeUsersChangedListener(listener) {
    this.usersChangedListeners = _.reject(this.usersChangedListeners, function (l) {
      return listener === l;
    });
  }

  addLayersChangedListener(listener) {
    this.layersChangedListeners.push(listener);

    if (_.isFunction(listener.onLayersChanged)) {
      _.each(_.values(this.eventsById), function (event) {
        listener.onLayersChanged({ added: _.values(event.layersById) }, event); // TODO this could be old layers, admin panel might have changed layers
      });
    }
  }

  addFeedItemsChangedListener(listener) {
    this.feedItemsChangedListeners.push(listener);

    if (_.isFunction(listener.onFeedItemsChanged)) {
      _.each(_.values(this.eventsById), function (event) {
        // TODO what do I send here?
        // listener.onFeedItemsChanged({ added: _.values(event.feedsById) }, event);
      });
    }
  }

  addPollListener(listener) {
    this.pollListeners.push(listener);
  }

  removePollListener(listener) {
    this.pollListeners = _.reject(this.pollListeners, function (l) {
      return listener === l;
    });
  }

  removeLayersChangedListener(listener) {
    this.layersChangedListeners = _.reject(this.layersChangedListeners, function (l) {
      return listener === l;
    });
  }

  removeFeedItemsChangedListener(listener) {
    this.feedItemsChangedListeners = _.reject(this.feedItemsChangedListeners, function (l) {
      return listener === l;
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

  markObservationAsImportant(observation, important) {
    var event = this.eventsById[observation.eventId];
    return this.observationService.markObservationAsImportantForEvent(event, observation, important).subscribe((updatedObservation: any) => {
      event.observationsById[updatedObservation.id] = updatedObservation;
      this.observationsChanged({ updated: [updatedObservation] });
    });
  }

  clearObservationAsImportant(observation) {
    var event = this.eventsById[observation.eventId];
    return this.observationService.clearObservationAsImportantForEvent(event, observation).subscribe((updatedObservation: any) => {
      event.observationsById[updatedObservation.id] = updatedObservation;
      this.observationsChanged({ updated: [updatedObservation] });
    });
  }

  archiveObservation(observation) {
    var event = this.eventsById[observation.eventId];
    return this.observationService.archiveObservationForEvent(event, observation).subscribe((archivedObservation: any) => {
      delete event.observationsById[archivedObservation.id];
      this.observationsChanged({ removed: [archivedObservation] });
    });
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
    return _.find(form.fields, function (field) { return field.name === fieldName; });
  }

  getForms(observation, options?: any) {
    var event = this.eventsById[observation.eventId];
    return this.getFormsForEvent(event, options);
  }

  getFormsForEvent(event, options) {
    options = options || {};
    var forms = event.forms;
    if (options.archived === false) {
      forms = _.filter(forms, function (form) {
        return !form.archived;
      });
    }

    return forms;
  }

  createForm(observationForm, formDefinition, viewModel?: any) {
    const form = (JSON.parse(JSON.stringify(formDefinition)));

    form.remoteId = observationForm.id;

    const existingPropertyFields = [];

    _.each(observationForm, function (value, key) {
      const field = this.service.getFormField(form, key);
      if (field) {
        if (field.type === 'date' && field.value) {
          field.value = moment(value).toDate();
        } else {
          field.value = value;
        }
        existingPropertyFields.push(field);
      }
    });

    if (viewModel) {
      observationForm.fields = _.intersection(observationForm.fields, existingPropertyFields);
    }

    return form;
  }

  exportForm(event): Observable<any> {
    return this.httpClient.get<any>(`/api/event/${event.id}/form.zip`)
  }

  isUserInEvent(user, event) {
    if (!event) return false;

    return _.some(event.teams, function (team) {
      return _.contains(team.userIds, user.id);
    });
  }

  usersChanged(changed) {
    _.each(this.usersChangedListeners, function (listener) {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (_.isFunction(listener.onUsersChanged)) {
        listener.onUsersChanged(changed);
      }
    });
  }

  observationsChanged(changed) {
    _.each(this.observationsChangedListeners, function (listener) {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (_.isFunction(listener.onObservationsChanged)) {
        listener.onObservationsChanged(changed);
      }
    });
  }

  layersChanged(changed, event) {
    _.each(this.layersChangedListeners, function (listener) {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (_.isFunction(listener.onLayersChanged)) {
        listener.onLayersChanged(changed, event);
      }
    });
  }

  feedItemsChanged(changed, event) {
    _.each(this.feedItemsChangedListeners, function (listener) {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (_.isFunction(listener.onFeedItemsChanged)) {
        listener.onFeedItemsChanged(changed, event);
      }
    });
  }

  fetch(): Observable<any> {
    const event = this.filterService.getEvent();
    if (!event) {
      return of()
    }

    const parameters: any = {};
    const interval = this.filterService.getInterval();
    if (interval) {
      const time = this.filterService.formatInterval(interval);
      parameters.interval = time;
    }

    return zip(
      this.fetchObservations(event, parameters),
      this.fetchLocations(event, parameters)
    )
  }

  fetchLayers(event) {
    return this.layerService.getLayersForEvent(event).subscribe((layers: any) => {
      const added = _.filter(layers, function (l) {
        return !_.some(this.eventsById[event.id].layersById, function (layer, layerId) {
          return l.id === layerId;
        });
      });

      const removed = _.filter(this.eventsById[event.id].layersById, function (layer, layerId) {
        return !_.some(layers, function (l) {
          return l.id === layerId;
        });
      });

      this.eventsById[event.id].layersById = _.indexBy(layers, 'id');
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

      this.eventsById[event.id].feedsById = _.indexBy(feeds, 'id');
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
      _.each(observations, function (observation) {
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
      removed = _.values(filteredObservationsById);

      this.eventsById[event.id].observationsById = _.indexBy(observations, 'id');
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
      _.each(userLocations, function (userLocation) {
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
            iconUrl: `${userLocation.user.iconUrl}?${params.toString}}`
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

      this.eventsById[event.id].usersById = _.indexBy(userLocations, 'id');
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
      _.each(this.pollListeners, function (listener) {
        if (_.isFunction(listener.onPoll)) {
          listener.onPoll();
        }
      });

      this.pollingTimeout = setTimeout(function () {
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
    return Math.max(1000, Math.min(...delays));
  }

  pollFeeds() {
    const event = this.filterService.getEvent();
    const feed = this.getNextFeed(event);
    const scheduleNextPoll = () => {
      const delayMillis = this.getFeedFetchDelay(event);
      this.feedPollTimeout = setTimeout(this.pollFeeds, delayMillis)
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