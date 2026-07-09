import { Component, Input } from '@angular/core';
import { IconReference } from '@ngageoint/mage.web-core-lib/feed/feed-icon';

export interface FeedTab {
  id: string,
  title: string;
  icon?: IconReference;
}

@Component({
    selector: 'feed-panel-tab',
    templateUrl: './feed-panel-tab.component.html',
    styleUrls: ['./feed-panel-tab.component.scss'],
    standalone: false
})
export class FeedPanelTabComponent {
  @Input() tab: FeedTab;
  @Input() active: boolean;
}
