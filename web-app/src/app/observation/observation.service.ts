import { Injectable } from "@angular/core";
import { SessionService } from "../http/session.service";
import { HttpClient, HttpParams } from "@angular/common/http";
import { BehaviorSubject, Observable, map, mergeMap } from "rxjs";
import * as _ from "lodash";
import { Attachment, Observation, ObservationId, ObservationStateName, ObservationStyle } from "../entities/observation/entities.observation";
import { EventId, Form, FormStyle, MageEvent } from "../entities/event/entities.event";
import { Style } from "../entities/map/entities.map";
import { ObservationFieldFilter } from "../entities/observation/filter/entities.observation.filter";

export type ObservationsRequestOptions = {
  states?: ObservationStateName
  populate?: boolean
  sort?: string
  startDate?: string
  observationStartDate?: string
  observationEndDate?: string
  favoritedBy?: string
  important?: boolean
  hasAttachments?: boolean
  teams?: string[]
  users?: string[]
  filter?: ObservationFieldFilter
  page?: number
  page_size?: number
}

export type ObservationsPageRequestOptions = ObservationsRequestOptions & {
  page: number
  page_size: number
  include_total_count: boolean
}

export type ObservationsPage = {
  items: Observation[]
  totalCount?: number
  links: { next: number | null, prev: number | null }
}


export type SaveableObservation = Partial<Observation> & { noGeometry?: boolean }

export type PagingOptions = {
  page: number
  page_size: number
}

@Injectable({
  providedIn: "root",
})
export class ObservationService {

  private pagingSubject = new BehaviorSubject<PagingOptions | null>(null);
  readonly paging$: Observable<PagingOptions | null> = this.pagingSubject.asObservable();

  constructor(
    private client: HttpClient,
    private sessionService: SessionService
  ) { }

  setPagingOptions(options: PagingOptions) {
    this.pagingSubject.next(options);
  }

  clearPagingOptions() {
    this.pagingSubject.next(null);
  }

  getPagingOptions(): PagingOptions | null {
    return this.pagingSubject.getValue();
  }

  getId(eventId: EventId): Observable<{ id: ObservationId }> {
    return this.client.post<{ id: ObservationId }>(`/api/events/${eventId}/observations/id/`, {
      eventId: eventId,
    });
  }

  getObservation(eventId: string, observationId: ObservationId): Observable<Observation> {
    return this.client.get<Observation>(
      `/api/events/${eventId}/observations/${observationId}`,
      { params: { populate: true } }
    );
  }

  getObservationsForMap(event: MageEvent, options: ObservationsRequestOptions): Observable<Observation[]> {
    return this.fetchObservations(event, options, (observations: Observation[]) => this.transformObservations(observations, event));
  }

  getObservationsPage(event: MageEvent, options: ObservationsPageRequestOptions): Observable<ObservationsPage> {
    return this.fetchObservations(event, options, (response: ObservationsPage) => ({
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

  saveObservationForEvent(event: MageEvent, observation: SaveableObservation): Observable<Observation> {
    return this.saveObservation(event, observation).pipe(
      map((observation) => {
        return this.transformObservations(observation, event)[0]
      })
    )
  }

  private saveObservation(event: MageEvent, observation: SaveableObservation): Observable<Observation> {
    // If the noGemetry flag is set, override the geometry to a default point.
    if (!!observation.noGeometry) {
      observation.geometry = {
        type: 'Point',
        coordinates: [0, 0]
      }
    }
    if (observation.id) {
      return this.client.put<Observation>(
        `/api/events/${event.id}/observations/${observation.id}`,
        observation
      );
    } else {
      return this.getId(event.id).pipe(
        mergeMap((result) => {
          return this.client.put<Observation>(
            `/api/events/${event.id}/observations/${result.id}`,
            observation
          );
        })
      );
    }
  }

  addObservationFavorite(event: MageEvent, observation: Observation): Observable<Observation> {
    return this.client.put<Observation>(
      `/api/events/${event.id}/observations/${observation.id}/favorite`,
      observation
    ).pipe(
      map((observation) => this.transformObservations(observation, event)[0])
    );
  }

  removeObservationFavorite(event: MageEvent, observation: Observation): Observable<Observation> {
    return this.client.delete<Observation>(
      `/api/events/${event.id}/observations/${observation.id}/favorite`,
      { body: observation }
    ).pipe(
      map((observation) => this.transformObservations(observation, event)[0])
    );
  }

  markObservationAsImportantForEvent(
    event: MageEvent,
    observation: Observation,
    important: Pick<NonNullable<Observation['important']>, 'description'>
  ): Observable<Observation> {
    return this.client.put<Observation>(
      `/api/events/${event.id}/observations/${observation.id}/important`,
      important
    ).pipe(
      map((observation) => this.transformObservations(observation, event)[0])
    );
  }

  clearObservationAsImportantForEvent(event: MageEvent, observation: Observation): Observable<Observation> {
    return this.client.delete<Observation>(
      `/api/events/${event.id}/observations/${observation.id}/important`,
      { body: observation }
    ).pipe(
      map((observation) => this.transformObservations(observation, event)[0])
    );
  }

  archiveObservationForEvent(event: MageEvent, observation: Observation): Observable<Observation> {
    return this.client
      .post<unknown>(
        `/api/events/${event.id}/observations/${observation.id}/states`,
        { name: ObservationStateName.Archived }
      )
      .pipe(map(() => observation));
  }

  addAttachmentToObservationForEvent(event: MageEvent, observation: Observation, attachment: Attachment): void {
    const attachments = observation.attachments.slice();
    const update = attachments.find((a) => a.id === attachment.id);
    if (update) {
      update.url = attachment.url;
    }

    observation.attachments = attachments;
  }

  deleteAttachmentInObservationForEvent(
    event: MageEvent,
    observation: Observation,
    attachment: Attachment
  ): Observable<Observation> {
    return this.client
      .delete<Observation>(
        `/api/events/${event.id}/observations/${observation.id}/attachments/${attachment.id}`
      )
      .pipe(
        map((response: Observation) => {
          response.attachments = _.reject(
            observation.attachments,
            (a) => attachment.id === a.id
          );
          return response;
        })
      );
  }

  transformObservations(observations: Observation | Observation[], event: MageEvent): Observation[] {
    const list: Observation[] = Array.isArray(observations) ? observations : [observations];

    const formMap = _.keyBy(event.forms, "id");
    list.forEach((observation: Observation) => {
      let form: Form | undefined;
      if (observation.properties.forms.length) {
        form = formMap[observation.properties.forms[0].formId];
      }

      observation.style = this.getObservationStyleForForm(
        observation,
        event,
        form
      );
      const { geometry } = observation;
      if (geometry.type === "Polygon") {
        this.minimizePolygon(geometry.coordinates);
      } else if (geometry.type === "LineString") {
        this.minimizeLineString(geometry.coordinates);
      }
    });

    return list;
  }

  minimizePolygon(polygon: number[][][]) {
    for (let i = 0; i < polygon.length; i++) {
      this.minimizeLineString(polygon[i]);
    }
  }

  minimizeLineString(lineString: number[][]) {
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

  getObservationStyleForForm(observation: Pick<Observation, 'properties'>, event: Pick<MageEvent, 'id' | 'style'>, form?: Form): ObservationStyle {
    let formId: number | null = null;
    let formStyle: FormStyle | null = null;
    let primaryField: string | null = null;
    let variantField: string | null = null;

    if (form && observation.properties.forms.length) {
      let firstForm = observation.properties.forms[0];
      formId = form.id;
      formStyle = form.style ?? null;
      primaryField = form.primaryField ? firstForm[form.primaryField] : null;
      variantField = form.variantField ? firstForm[form.variantField] : null;
    }

    return {
      ...this.getObservationStyle(
        event.style,
        formStyle,
        primaryField,
        variantField
      ),
      iconUrl: this.getObservationIconUrlForEvent(
        event.id,
        formId,
        primaryField,
        variantField
      )
    };
  }

  getObservationStyle(eventStyle: Style, formStyle: FormStyle | null, primary: string | null, variant: string | null): Omit<ObservationStyle, 'iconUrl'> {
    let style: Partial<Style> = eventStyle || {};
    if (formStyle) {
      if (
        primary &&
        formStyle[primary] &&
        variant &&
        formStyle[primary][variant]
      ) {
        style = formStyle[primary][variant] as Partial<Style>;
      } else if (primary && formStyle[primary]) {
        style = formStyle[primary] as Partial<Style>;
      } else {
        style = formStyle as Partial<Style>;
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

  getObservationIconUrlForEvent(eventId: EventId, formId: number | null, primary: string | null, variant: string | null): string {
    let url = `/api/events/${eventId}/icons`;
    if (formId) {
      url += `/${formId}`;
      if (primary) {
        url += `/${primary}`;
        if (variant) {
          url += `/${variant}`;
        }
      }
    }

    const params = new HttpParams().append("access_token", this.sessionService.getToken() ?? "");
    return `${url}?${params.toString()}`
  }
}
