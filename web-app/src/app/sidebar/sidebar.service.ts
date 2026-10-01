import { Injectable } from '@angular/core';
import { Feature } from 'geojson';
import { Subject } from 'rxjs';
import { Feed } from '@ngageoint/mage.web-core-lib/feed';
import { Observation } from '../entities/observation/entities.observation';
import { UserWithLocation } from '../entities/user/entities.user-location';

export interface ObservationEvent {
  observation: Observation;
}

export interface UserEvent {
  user: UserWithLocation;
}

export interface ExportEvent {
  item: any;
}

export enum FeedAction {
  Select,
  Deselect
}

export interface FeedItemEvent {
  feed: Feed;
  item: Feature;
  action: FeedAction;
}

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private viewUserSource = new Subject<UserEvent>()
  private viewObservationSource = new Subject<ObservationEvent>()
  private viewExportSource = new Subject<ExportEvent>()

  private editObservationSource = new Subject<ObservationEvent>()

  viewUser$ = this.viewUserSource.asObservable()
  viewObservation$ = this.viewObservationSource.asObservable()
  viewExport$ = this.viewExportSource.asObservable()

  editObservation$ = this.editObservationSource.asObservable()

  private itemSource = new Subject<FeedItemEvent>()

  item$ = this.itemSource.asObservable()

  viewObservation(observation: Observation): void {
    this.viewObservationSource.next({
      observation: observation
    });
  }

  edit(observation: Observation): void {
    this.editObservationSource.next({
      observation: observation
    });
  }

  viewUser(user: UserWithLocation): void {
    this.viewUserSource.next({
      user: user
    });
  }

  viewExport(item: any): void {
    this.viewExportSource.next({ item });
  }

  selectFeedItem(feed: Feed, item: Feature): void {
    this.itemSource.next({
      feed: feed,
      item: item,
      action: FeedAction.Select
    });
  }

  deselectFeedItem(feed: Feed, item: Feature): void {
    this.itemSource.next({
      feed: feed,
      item: item,
      action: FeedAction.Deselect
    });
  }
}
