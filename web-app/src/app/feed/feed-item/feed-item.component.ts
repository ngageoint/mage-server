import { Component, Input, Inject, OnChanges, SimpleChanges } from '@angular/core';
import { Feed, StyledFeature } from '@ngageoint/mage.web-core-lib/feed';
import { FeedPanelService } from 'src/app/feed-panel/feed-panel.service';
import { MomentPipe } from 'src/app/moment/moment.pipe';
import { MapService } from 'src/app/upgrade/ajs-upgraded-providers';

@Component({
  selector: 'feed-item',
  templateUrl: './feed-item.component.html',
  styleUrls: ['./feed-item.component.scss']
})
export class FeedItemComponent implements OnChanges {
  @Input() feed: Feed;
  @Input() item: StyledFeature;

  hasContent = false
  date: string
  primary: string
  secondary: string
  mapFeature: StyledFeature
  properties = []

  constructor(
    private feedPanelService: FeedPanelService,
    private momentPipe: MomentPipe,
    @Inject(MapService) private mapService: any
    ) {}

  ngOnChanges(_changes: SimpleChanges): void {
    this.updateItem()
  }

  private updateItem(): void {
    if (!this.feed || !this.item) {
      return
    }

    this.mapFeature = { ...this.item }

    if (!this.item.properties) {
      return
    }

    if (this.feed.itemTemporalProperty && this.item.properties[this.feed.itemTemporalProperty] != null) {
      this.date = this.momentPipe.transform(this.item.properties[this.feed.itemTemporalProperty]);
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

    if (this.item.properties) {
      const schemaProperties = this.feed?.itemPropertiesSchema?.properties

      this.properties = Object.keys(this.item.properties).map(key => {
        let value = this.item.properties[key]
        if (key === this.feed.itemTemporalProperty) {
          value = this.momentPipe.transform(value)
        }

        return {
          key: schemaProperties[key]?.title || key,
          value: value
        }
      });
    }
  }

  close(): void {
    this.feedPanelService.deselectFeedItem(this.feed, this.item);
  }

  onLocationClick(): void {
    this.mapService.zoomToFeatureInLayer(this.item, `feed-${this.feed.id}`);
  }
}
