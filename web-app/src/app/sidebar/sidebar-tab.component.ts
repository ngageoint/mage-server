import { Component, Input, OnInit } from '@angular/core';

export interface FeedTab {
  id: string,
  title: string;
  icon?: string;
  iconUrl?: string;
  count?: number;
  feed?: any;
}

@Component({
    selector: 'sidebar-tab',
    templateUrl: './sidebar-tab.component.html',
    styleUrls: ['./sidebar-tab.component.scss'],
    standalone: false
})
export class SidebarTabComponent implements OnInit {
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
