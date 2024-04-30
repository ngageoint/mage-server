import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Feed, FeedService } from '@ngageoint/mage.web-core-lib/feed';
import { Feature } from 'geojson';
import { Subscription } from 'rxjs'

@Component({
  selector: 'feed-list',
  templateUrl: './feed-list.component.html',
  styleUrls: ['./feed-list.component.scss']
})
export class FeedListComponent implements OnChanges {
  @Input() feed: Feed

  items: Array<Feature> = []
  feedSubscription: Subscription | null = null

  constructor(private feedService: FeedService) {}

  ngOnChanges(changes: SimpleChanges): void {
    const feed: Feed = changes.feed.currentValue;
    this.feedSubscription?.unsubscribe()
    if (feed) {
      this.feedSubscription = this.feedService.feedItems(feed.id).subscribe(items => {
        this.items = items;
      });
    }
  }
}
