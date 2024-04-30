import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Feed } from '@ngageoint/mage.web-core-lib/feed';
import { Feature } from 'geojson';

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
export class FeedItemService {
  private itemSource = new Subject<FeedItemEvent>();

  item$ = this.itemSource.asObservable();

  select(feed: Feed, item: Feature): void {
    this.itemSource.next({
      feed: feed,
      item: item,
      action: FeedAction.Select
    });
  }

  deselect(feed: Feed, item: Feature): void {
    this.itemSource.next({
      feed: feed,
      item: item,
      action: FeedAction.Deselect
    });
  }
}