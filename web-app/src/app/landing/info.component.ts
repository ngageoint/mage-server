import { Component } from '@angular/core';

@Component({
  selector: 'info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent {
  backgrounds = [
    'mage-1-bg',
    'mage-2-bg',
    'mage-3-bg',
    'mage-4-bg'
  ]

  background = this.backgrounds[Math.floor(Math.random() * 4)]
}
