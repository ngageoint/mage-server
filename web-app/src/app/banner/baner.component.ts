import { Component, Input } from '@angular/core';
import { Banner } from '../setttings/settings.service';

@Component({
  selector: 'banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss']
})
export class BannerComponent {
  @Input() banner?: Banner
}
