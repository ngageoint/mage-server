import { Component, Input, OnInit } from '@angular/core';
import { Feature } from 'geojson';
import { FeedPanelService } from 'src/app/feed-panel/feed-panel.service';
import { Feed } from '@ngageoint/mage.web-core-lib/feed';

@Component({
  selector: 'feed-item-map-popup',
  templateUrl: './feed-item-map-popup.component.html',
  styleUrls: ['./feed-item-map-popup.component.scss']
})
export class FeedItemMapPopupComponent implements OnInit {
  @Input() feed: Feed;
  @Input() item: Feature;

  hasContent = false;
  timestamp: number;
  primary: string;
  secondary: string;

  constructor(private feedPanelService: FeedPanelService) { }

  ngOnInit(): void {
    if (!this.item || !this.item.properties) return;

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

  onInfo(): void {
    this.feedPanelService.selectFeedItem(this.feed, this.item);
  }

}
