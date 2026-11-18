import { Component, inject } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

export enum ObservationOption {
  CLONE,
  DOWNLOAD,
  DELETE
}

export type ObservationOptionsData = {
  canClone: boolean
  canDelete: boolean
}

@Component({
    selector: 'observation-options',
    templateUrl: './observation-options.component.html',
    styleUrls: ['./observation-options.component.scss'],
    imports: [MatIconModule, MatListModule]
})
export class ObservationOptionsComponent {
  private readonly bottomSheetRef = inject(MatBottomSheetRef<ObservationOptionsComponent>)
  readonly data: ObservationOptionsData = inject(MAT_BOTTOM_SHEET_DATA)

  public options: typeof ObservationOption = ObservationOption;

  onOption(option: ObservationOption): void {
    this.bottomSheetRef.dismiss(option)
  }

}
