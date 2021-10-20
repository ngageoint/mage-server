import { Component, Input, OnInit } from '@angular/core';

export interface FeedTab {
  id: string,
  title: string;
  icon?: string;
  iconUrl?: string;
}

@Component({
  selector: 'feed-panel-tab',
  templateUrl: './feed-panel-tab.component.html',
  styleUrls: ['./feed-panel-tab.component.scss']
})
export class FeedPanelTabComponent implements OnInit {
  @Input() tab: FeedTab;
  @Input() active: boolean;

  imageStyle: object;

  ngOnInit(): void {
    if (!this.tab) {
      return;
    }
    if (this.tab.iconUrl) {
      this.imageStyle = { 
        'mask-image': `url(${this.tab.iconUrl})`, 
        '-webkit-mask-image': `url(${this.tab.iconUrl})`
      }
    } else if (!this.tab.icon) {
      this.tab.icon = 'rss_feed';
    }
  }
}
