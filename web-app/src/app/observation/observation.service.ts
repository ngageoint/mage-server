import { Injectable } from "@angular/core";
import { SessionService } from "../http/session.service";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, map, mergeMap } from "rxjs";
import * as _ from "underscore";
import { MageEvent } from "core-lib-src/event";
import { Observation } from "../entities/observation/entities.observation";
import { Form } from "../entities/event/entities.event";
import { ObservationFieldFilter } from "../entities/observation/filter/entities.observation.filter";

export type ObservationsRequestOptions = {
  states?: 'active' | 'archive'
  populate?: boolean
  sort?: string
  observationStartDate?: string
  observationEndDate?: string
  favoritedBy?: string
  important?: boolean
  hasAttachments?: boolean
  teams?: string[]
  users?: string[]
  filter?: ObservationFieldFilter
}

export type ObservationsPageRequestOptions = ObservationsRequestOptions & {
  page: number
  page_size: number
  include_total_count: boolean
}

@Injectable({
  providedIn: "root",
})
export class ObservationService {
  constructor(
    private client: HttpClient,
    private sessionService: SessionService
  ) { }

  getId(eventId: number): Observable<any> {
    return this.client.post<any>(`/api/events/${eventId}/observations/id/`, {
      eventId: eventId,
    });
  }

  getObservation(eventId: string, observationId: string): Observable<any> {
    return this.client.get<any>(
      `/api/events/${eventId}/observations/${observationId}`
    );
  }

  getObservationsForEvent(event: MageEvent, options: any): Observable<any> {
    let params = new HttpParams()
      .set("eventId", event.id.toString())
      .set("states", "active")
      .set("populate", "true");

    if (options.interval?.start) {
      params = params.set("observationStartDate", options.interval.start);
    }
    if (options.interval?.end) {
      params = params.set("observationEndDate", options.interval.end);
    }

    return this.client
      .get<any>(`/api/events/${event.id}/observations`, { params })
      .pipe(
        map((observations: any) => {
          return this.transformObservations(observations, event);
        })
      );
  }

  getObservationsPage(event: MageEvent, options: ObservationsPageRequestOptions): Observable<any> {
    return this.fetchObservations(event, options, response => ({
      ...response,
      items: this.transformObservations(response.items, event)
    }))
  }

  private fetchObservations<T>(event: MageEvent, options: ObservationsRequestOptions, transform: (response: any) => T): Observable<T> {
    const { filter, ...baseOptions } = options
    const params = new HttpParams()
      .set("eventId", event.id.toString())
      .appendAll(baseOptions as any)

    if (filter?.condition || filter?.keyword) {
      return this.client.post<any>(`/api/events/${event.id}/observations/search`, { condition: filter.condition, keyword: filter.keyword }, { params }).pipe(map(transform))
    }
    return this.client.get(`/api/events/${event.id}/observations`, { params }).pipe(map(transform))
  }

  saveObservationForEvent(event: MageEvent, observation: any): Observable<any> {
    return this.saveObservation(event, observation).pipe(
      map((observation) => {
        return this.transformObservations(observation, event)[0]
      })
    )
  }

  private saveObservation(event: MageEvent, observation: any): Observable<any> {
    // If the noGemetry flag is set, override the geometry to a default point.
    if (!!observation.noGeometry) {
      observation.geometry = {
        type: 'Point',
        coordinates: [0, 0]
      }
    }
    if (observation.id) {
      return this.client.put<any>(
        `/api/events/${event.id}/observations/${observation.id}`,
        observation
      );
    } else {
      return this.getId(event.id).pipe(
        mergeMap((result) => {
          return this.client.put<any>(
            `/api/events/${event.id}/observations/${result.id}`,
            observation
          );
        })
      );
    }
  }

  addObservationFavorite(event, observation): Observable<any> {
    return this.client.put<any>(
      `/api/events/${event.id}/observations/${observation.id}/favorite`,
      observation
    );
  }

  removeObservationFavorite(event, observation): Observable<any> {
    return this.client.delete<any>(
      `/api/events/${event.id}/observations/${observation.id}/favorite`,
      { body: observation }
    );
  }

  markObservationAsImportantForEvent(
    event,
    observation,
    important
  ): Observable<any> {
    return this.client.put<any>(
      `/api/events/${event.id}/observations/${observation.id}/important`,
      important
    );
  }

  clearObservationAsImportantForEvent(event, observation): Observable<any> {
    return this.client.delete<any>(
      `/api/events/${event.id}/observations/${observation.id}/important`,
      { body: observation }
    );
  }

  archiveObservationForEvent(event, observation): Observable<any> {
    return this.client
      .post<any>(
        `/api/events/${event.id}/observations/${observation.id}/states`,
        { name: "archive" }
      )
      .pipe(map(() => observation));
  }

  addAttachmentToObservationForEvent(event, observation, attachment) {
    const attachments = observation.attachments.slice();
    const update = attachments.find((a) => a.id === attachment.id);
    if (update) {
      update.url = attachment.url;
    }

    observation.attachments = attachments;
  }

  deleteAttachmentInObservationForEvent(
    event,
    observation,
    attachment
  ): Observable<any> {
    return this.client
      .delete<any>(
        `/api/events/${event.id}/observations/${observation.id}/attachments/${attachment.id}`
      )
      .pipe(
        map((response: any) => {
          response.attachments = _.reject(
            observation.attachments,
            function (a) {
              return attachment.id === a.id;
            }
          );
          return response;
        })
      );
  }

  transformObservations(observations, event) {
    if (!_.isArray(observations)) observations = [observations];

    let formMap = _.indexBy(event.forms, "id");
    observations.forEach((observation: Observation) => {
      let form: Form;
      if (observation.properties.forms.length) {
        form = formMap[observation.properties.forms[0].formId];
      }

      observation.style = this.getObservationStyleForForm(
        observation,
        event,
        form
      );
      if (observation.geometry.type === "Polygon") {
        this.minimizePolygon(observation.geometry.coordinates);
      } else if (observation.geometry.type === "LineString") {
        this.minimizeLineString(observation.geometry.coordinates);
      }
    });

    return observations;
  }

  minimizePolygon(polygon) {
    for (let i = 0; i < polygon.length; i++) {
      this.minimizeLineString(polygon[i]);
    }
  }

  minimizeLineString(lineString) {
    let world = 360;
    let coord = lineString[0];
    for (let i = 1; i < lineString.length; i++) {
      let next = lineString[i];
      if (coord[0] < next[0]) {
        if (next[0] - coord[0] > coord[0] - next[0] + world) {
          next[0] = next[0] - world;
        }
      } else if (coord[0] > next[0]) {
        if (coord[0] - next[0] > next[0] - coord[0] + world) {
          next[0] = next[0] + world;
        }
      }
    }
  }

  getObservationStyleForForm(observation, event, form) {
    let formId = null;
    let formStyle = null;
    let primaryField = null;
    let letiantField = null;

    if (observation.properties.forms.length) {
      let firstForm = observation.properties.forms[0];
      formId = form.id;
      formStyle = form.style;
      primaryField = firstForm[form.primaryField];
      letiantField = firstForm[form.letiantField];
    }

    let style: any = this.getObservationStyle(
      event.style,
      formStyle,
      primaryField,
      letiantField
    );
    style.iconUrl = this.getObservationIconUrlForEvent(
      event.id,
      formId,
      primaryField,
      letiantField
    );

    return style;
  }

  getObservationStyle(eventStyle, formStyle, primary, letiant) {
    let style = eventStyle || {};
    if (formStyle) {
      if (
        primary &&
        formStyle[primary] &&
        letiant &&
        formStyle[primary][letiant]
      ) {
        style = formStyle[primary][letiant];
      } else if (primary && formStyle[primary]) {
        style = formStyle[primary];
      } else {
        style = formStyle;
      }
    }

    return {
      color: style.stroke,
      fillColor: style.fill,
      fillOpacity: style.fillOpacity,
      opacity: style.strokeOpacity,
      weight: style.strokeWidth,
    };
  }

  getObservationIconUrlForEvent(eventId, formId, primary, letiant) {
    let url = "/api/events/" + eventId + "/icons";

    if (formId) {
      url += "/" + formId;
    }

    if (primary) {
      url += "/" + primary;
    }

    if (letiant) {
      url += "/" + letiant;
    }

    let params = new HttpParams();
    params = params.append("access_token", this.sessionService.getToken());

    return url + "?" + params.toString();
  }
}
