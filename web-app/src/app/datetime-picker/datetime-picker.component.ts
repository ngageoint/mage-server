import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  input,
  linkedSignal,
  output,
  viewChild
} from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTimepickerModule } from '@angular/material/timepicker';
import moment from 'moment';

@Component({
  selector: 'datetime-picker',
  templateUrl: './datetime-picker.component.html',
  styleUrls: ['./datetime-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatTimepickerModule]
})
export class DatetimePickerComponent {
  title = input('')
  required = input(false, { transform: booleanAttribute })
  datetime = input<Date | null>(null)
  timezone = input<'local' | 'gmt'>('local')

  dateTimeChange = output<Date>()

  dateModel = viewChild<NgModel>('dateModel')

  date = linkedSignal<moment.Moment | null>(() => this.datetime() ? moment(this.datetime()) : null)
  timeValue = linkedSignal<moment.Moment | null>(() => this.datetime() ? moment(this.datetime()) : null)

  onDate(): void {
    if (!this.date()) {
      this.timeValue.set(null)
      return
    }

    if (!this.dateModel()?.invalid) {
      this.setValue()
    }
  }

  onTime(): void {
    if (this.timeValue()) {
      this.setValue()
    }
  }

  private setValue(): void {
    const date = this.date()
    const time = this.timeValue()
    if (!date || !time) {
      return
    }

    const value = date.clone().set({
      hour: time.hours(),
      minute: time.minutes(),
      second: time.seconds()
    })

    if (this.timezone() === 'gmt') {
      value.utc(true)
    }

    this.dateTimeChange.emit(value.toDate())
  }
}
