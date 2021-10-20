import { Injectable } from '@angular/core';
import { Feature } from 'geojson';
import { Subject } from 'rxjs';
import { Feed } from '@ngageoint/mage.web-core-lib/feed';

export interface ObservationEvent {
  observation: any;
}

export interface UserEvent {
  user: any;
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
export class FeedPanelService {
  private viewUserSource = new Subject<UserEvent>()
  private viewObservationSource = new Subject<ObservationEvent>()

  private editObservationSource = new Subject<ObservationEvent>()

  viewUser$ = this.viewUserSource.asObservable()
  viewObservation$ = this.viewObservationSource.asObservable()

  editObservation$ = this.editObservationSource.asObservable()

  private itemSource = new Subject<FeedItemEvent>()

  item$ = this.itemSource.asObservable()

  viewObservation(observation: any): void {
    this.viewObservationSource.next({
      observation: observation
    });
  }

  edit(observation: any): void {
    this.editObservationSource.next({
      observation: observation
    });
  }

  viewUser(user: any): void {
    this.viewUserSource.next({
      user: user
    });
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