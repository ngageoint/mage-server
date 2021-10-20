import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Feed, FeedService } from '@ngageoint/mage.web-core-lib/feed';
import { Feature } from 'geojson';

@Component({
  selector: 'feed-list',
  templateUrl: './feed-list.component.html',
  styleUrls: ['./feed-list.component.scss']
})
export class FeedListComponent implements OnChanges {
  @Input() feed: Feed

  items: Array<Feature> = []

  constructor(private feedService: FeedService) {}

  ngOnChanges(changes: SimpleChanges): void {
    const feed: Feed = changes.feed.currentValue;
    if (feed) {
      this.feedService.feedItems(feed.id).subscribe(items => {
        this.items = items;
      });
    }
  }
}
