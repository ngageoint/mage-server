import { Component } from '@angular/core';

@Component({
  selector: 'mage',
  templateUrl: './mage.component.html',
  styleUrls: ['./mage.component.scss']
})
export class MageComponent {
  map: any
  hideFeed: boolean
  filteredEvent: any
  newObservation: any

  onMapAvailable($event: any): void {
    this.map = $event.map;
  }

  onToggleFeed($event) {
    this.hideFeed = $event.hidden;
  }

  onAddObservation($event) {
    // if (this.hideFeed) {
    //   this.showFeed();
    // }

    // this.newObservation = $event;
  }
}
