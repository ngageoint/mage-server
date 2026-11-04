import { Component, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

export enum ObservationOption {
  DOWNLOAD,
  DELETE
}

@Component({
    selector: 'observation-options',
    templateUrl: './observation-options.component.html',
    styleUrls: ['./observation-options.component.scss'],
    imports: [MatIconModule, MatListModule]
})
export class ObservationOptionsComponent {
  private bottomSheetRef = inject(MatBottomSheetRef<ObservationOptionsComponent>)

  public options: typeof ObservationOption = ObservationOption;

  onOption(option: ObservationOption): void {
    this.bottomSheetRef.dismiss(option)
  }

}
