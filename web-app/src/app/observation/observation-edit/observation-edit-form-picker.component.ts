import { Component, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { EventService } from '../../event/event.service';
import { FilterService } from '../../filter/filter.service';

@Component({
    selector: 'app-observation-edit-form-picker',
    templateUrl: './observation-edit-form-picker.component.html',
    styleUrls: ['./observation-edit-form-picker.component.scss'],
    imports: [MatDividerModule, MatIconModule, MatListModule]
})
export class ObservationEditFormPickerComponent {
  private readonly bottomSheetRef: MatBottomSheetRef<ObservationEditFormPickerComponent> = inject(MatBottomSheetRef)

  forms: any[]

  constructor() {
    const filterService = inject(FilterService)
    const eventService = inject(EventService)

    const event = filterService.getEvent()
    this.forms = eventService.getFormsForEvent(event, { archived: false })
  }

  formPicked(form: any): void {
    this.bottomSheetRef.dismiss(form)
  }

}
