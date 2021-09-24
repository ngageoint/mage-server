import { Component, Input, Inject, OnChanges, SimpleChanges } from '@angular/core';
import { Feed } from '@ngageoint/mage.web-core-lib/feed';
import { MapService } from '../../../upgrade/ajs-upgraded-providers';
import { Feature } from 'geojson';
import { FeedPanelService } from '../../../feed-panel/feed-panel.service';
import { contentPathOfIcon } from '@ngageoint/mage.web-core-lib/static-icon'

@Component({
  selector: 'feed-item-summary',
  templateUrl: './feed-item-summary.component.html',
  styleUrls: ['./feed-item-summary.component.scss']
})
export class FeedItemSummaryComponent implements OnChanges {
  @Input() feed: Feed;
  @Input() item: Feature;

  hasContent = false;
  timestamp: number;
  primary: string;
  secondary: string;
  iconUrl?: string;

  constructor(private feedPanelService: FeedPanelService, @Inject(MapService) private mapService: any) { }

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.feed || !this.item.properties) return;

    // TODO: use mapStyle when that works
    this.iconUrl = contentPathOfIcon(this.feed.icon);

    if (this.feed.itemTemporalProperty && this.item.properties[this.feed.itemTemporalProperty] != null) {
      this.timestamp = this.item.properties[this.feed.itemTemporalProperty];
      this.hasContent = true;
    }

    if (this.feed.itemPrimaryProperty && this.item.properties[this.feed.itemPrimaryProperty] != null) {
      this.primary = this.item.properties[this.feed.itemPrimaryProperty];
      this.hasContent = true;
    }

    if (this.feed.itemSecondaryProperty && this.item.properties[this.feed.itemSecondaryProperty] != null) {
      this.secondary = this.item.properties[this.feed.itemSecondaryProperty];
      this.hasContent = true;
    }
  }

  onItemSelect(): void {
    this.feedPanelService.selectFeedItem(this.feed, this.item);
    this.mapService.zoomToFeatureInLayer(this.item, `feed-${this.feed.id}`);
  }
}
