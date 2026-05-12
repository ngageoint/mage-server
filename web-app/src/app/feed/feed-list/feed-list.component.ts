import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Feed, FeedService } from '@ngageoint/mage.web-core-lib/feed';
import { Feature } from 'geojson';
import { Subscription } from 'rxjs'
import { FeedItemSummaryComponent } from '../feed-item/feed-item-summary/feed-item-summary.component';

@Component({
  selector: 'feed-list',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatListModule,
    MatDividerModule,
    FeedItemSummaryComponent
  ],
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
