import { Component } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material';

export enum ObservationOption {
  EDIT,
  DOWNLOAD,
  DELETE
}

@Component({
  selector: 'observation-options',
  templateUrl: './observation-options.component.html',
  styleUrls: ['./observation-options.component.scss']
})
export class ObservationOptionsComponent {
  public options: typeof ObservationOption = ObservationOption;

  constructor(
    private bottomSheetRef: MatBottomSheetRef<ObservationOptionsComponent>) {
  }

  onOption(option: ObservationOption): void {
    this.bottomSheetRef.dismiss(option)
  }

}
