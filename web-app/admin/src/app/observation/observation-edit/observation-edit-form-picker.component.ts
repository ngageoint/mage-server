import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { EventService } from 'src/app/event/event.service';
import { FilterService } from 'src/app/filter/filter.service';

@Component({
  selector: 'app-observation-edit-form-picker',
  standalone: true,
  imports: [
    CommonModule,
    MatDividerModule,
    MatListModule,
    MatIconModule
  ],
  templateUrl: './observation-edit-form-picker.component.html',
  styleUrls: ['./observation-edit-form-picker.component.scss']
})
export class ObservationEditFormPickerComponent {
  forms: any[]

  constructor(
    filterService: FilterService,
    eventService: EventService,
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
