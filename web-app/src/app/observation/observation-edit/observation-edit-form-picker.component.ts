import { Component, Inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { EventService, FilterService } from 'src/app/upgrade/ajs-upgraded-providers';

@Component({
  selector: 'app-observation-edit-form-picker',
  templateUrl: './observation-edit-form-picker.component.html',
  styleUrls: ['./observation-edit-form-picker.component.scss']
})
export class ObservationEditFormPickerComponent {
  forms: any[]

  constructor(
    @Inject(FilterService) filterService: any,
    @Inject(EventService) eventService: any,
    private bottomSheetRef: MatBottomSheetRef<ObservationEditFormPickerComponent>) {

    const event = filterService.getEvent();
    this.forms = eventService.getFormsForEvent(event, { archived: false });
  }

  formPicked(form: any): void {
    this.bottomSheetRef.dismiss(form)
  }

  cancel(): void {
    this.bottomSheetRef.dismiss()
  }
}
