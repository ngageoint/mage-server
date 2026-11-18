import { Component, input } from '@angular/core';
import { Banner } from '../settings/settings.service';

@Component({
    selector: 'banner',
    templateUrl: './banner.component.html',
    styleUrls: ['./banner.component.scss'],
    imports: []
})
export class BannerComponent {
  banner = input<Banner>()
}
