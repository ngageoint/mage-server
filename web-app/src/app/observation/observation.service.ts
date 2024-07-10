import { Injectable } from "@angular/core"
import { LocalStorageService } from "../http/local-storage.service";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, map, mergeMap } from "rxjs";
import * as _ from 'underscore';

@Injectable({
  providedIn: 'root'
})
export class ObservationService {

  constructor(
    private client: HttpClient,
    private localStorageService: LocalStorageService
  ) { }

  getId(eventId: string): Observable<any> {
    return this.client.post<any>(`/api/events/${eventId}/observations/id/`, { eventId: eventId });
  }

  getObservation(eventId: string, observationId: string): Observable<any> {
    return this.client.get<any>(`/api/events/${eventId}/observations/${observationId}`);
  }

  getObservationsForEvent(event: any, options: any): Observable<any> {
    const parameters: any = { eventId: event.id, states: 'active', populate: 'true' };
    if (options.interval) {
      parameters.observationStartDate = options.interval.start;
      parameters.observationEndDate = options.interval.end;
    }

    return this.client.get<any>(`/api/events/${event.id}/observations`, { params: parameters }).pipe(
      map((observations: any) => {
        return this.transformObservations(observations, event)
      })
    )
  }

  saveObservationForEvent(event, observation): Observable<any> {
    return this.saveObservation(event, observation).pipe(
      map((observation) => this.transformObservations(observation, event))
    )
  }

  private saveObservation(eventId: string, observation: any): Observable<any> {
    if (observation.id) {
      return this.client.put<any>(`/api/events/${eventId}/observations/${observation.id}`, observation);
    } else {
      return this.getId(eventId).pipe(
        mergeMap(result => {
          return this.client.put<any>(`/api/events/${eventId}/observations/${result.id}`, observation);
        })
      )
    }
  }

  addObservationFavorite(event, observation): Observable<any> {
    return this.client.put<any>(`/api/events/${event.id}/observations/${observation.id}/favorite`, observation)
  }

  removeObservationFavorite(event, observation): Observable<any> {
    return this.client.delete<any>(`/api/events/${event.id}/observations/${observation.id}/favorite`, { body: observation })
  }

  markObservationAsImportantForEvent(event, observation, important): Observable<any>  {
    return this.client.put<any>(`/api/events/${event.id}/observations/${observation.id}/important`, important)
  }

  clearObservationAsImportantForEvent(event, observation): Observable<any>  {
    return this.client.delete<any>(`/api/events/${event.id}/observations/${observation.id}/important`, { body: observation })
  }

  archiveObservationForEvent(event, observation): Observable<any> {
    return this.client.post<any>(`/api/events/${event.id}/observations/${observation.id}/states`, { name: 'archive' }).pipe(
      map(observation => {
        return this.transformObservations(observation, event)
      })
    )
  }

  addAttachmentToObservationForEvent(event, observation, attachment) {
    const attachments = observation.attachments.slice();
    const update = attachments.find(a => a.id === attachment.id);
    if (update) {
      update.url = attachment.url;
    }

    observation.attachments = attachments
  }

  deleteAttachmentInObservationForEvent(event, observation, attachment): Observable<any> {
    return this.client.delete<any>(`/api/events/${event.id}/observations/${observation.id}/attachments/${attachment.id}`).pipe(
      map((response: any) => {
        response.attachments = _.reject(observation.attachments, function (a) { return attachment.id === a.id; });
        return response
      })
    )
  }

  transformObservations(observations, event) {
    if (!_.isArray(observations)) observations = [observations];

    var formMap = _.indexBy(event.forms, 'id');
    observations.forEach((observation: any) => {
      let form: any;
      if (observation.properties.forms.length) {
        form = formMap[observation.properties.forms[0].formId];
      }

      observation.style = this.getObservationStyleForForm(observation, event, form);
      if (observation.geometry.type === 'Polygon') {
        this.minimizePolygon(observation.geometry.coordinates);
      } else if (observation.geometry.type === 'LineString') {
        this.minimizeLineString(observation.geometry.coordinates);
      }
    })

    return observations
  }

  minimizePolygon(polygon) {
    for (var i = 0; i < polygon.length; i++) {
      this.minimizeLineString(polygon[i]);
    }
  }

  minimizeLineString(lineString) {
    var world = 360;
    var coord = lineString[0];
    for (var i = 1; i < lineString.length; i++) {
      var next = lineString[i];
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
    var formId = null;
    var formStyle = null;
    var primaryField = null;
    var variantField = null;

    if (observation.properties.forms.length) {
      var firstForm = observation.properties.forms[0];
      formId = form.id;
      formStyle = form.style;
      primaryField = firstForm[form.primaryField];
      variantField = firstForm[form.variantField];
    }

    let style: any = this.getObservationStyle(event.style, formStyle, primaryField, variantField);
    style.iconUrl = this.getObservationIconUrlForEvent(event.id, formId, primaryField, variantField);

    return style;
  }

  getObservationStyle(eventStyle, formStyle, primary, variant) {
    var style = eventStyle || {};
    if (formStyle) {
      if (primary && formStyle[primary] && variant && formStyle[primary][variant]) {
        style = formStyle[primary][variant];
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
      weight: style.strokeWidth
    };
  }

  getObservationIconUrlForEvent(eventId, formId, primary, variant) {
    var url = '/api/events/' + eventId + '/icons';

    if (formId) {
      url += '/' + formId;
    }

    if (primary) {
      url += '/' + primary;
    }

    if (variant) {
      url += '/' + variant;
    }

    var params = new HttpParams();
    params = params.append('access_token', this.localStorageService.getToken())
    

    return url + '?' + params.toString()
  }
}
