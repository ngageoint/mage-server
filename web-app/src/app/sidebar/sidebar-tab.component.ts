import { Component, Input } from '@angular/core';
import { IconReference } from '@ngageoint/mage.web-core-lib/feed/feed-icon';

export interface FeedTab {
  id: string,
  title: string;
  icon?: IconReference;
  count?: number;
  feed?: any;
}

@Component({
    selector: 'sidebar-tab',
    templateUrl: './sidebar-tab.component.html',
    styleUrls: ['./sidebar-tab.component.scss'],
    standalone: false
})
export class SidebarTabComponent {
  @Input() tab: FeedTab;
  @Input() active: boolean;
}
