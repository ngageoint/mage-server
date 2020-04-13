import { Component, Input } from '@angular/core';

@Component({
  selector: 'feed-scroll-wrapper',
  templateUrl: './feed-scroll.component.html',
  styleUrls: []
})
export class ScrollWrapperComponent {
  @Input() mask: boolean;
}
