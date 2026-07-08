import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { NgModel } from '@angular/forms';
import moment from 'moment';

@Component({
    selector: 'datetime-picker',
    templateUrl: './datetime-picker.component.html',
    styleUrls: ['./datetime-picker.component.scss'],
    standalone: false
})
export class DatetimePickerComponent implements OnChanges {
  @Input() title: string;
  @Input() required: boolean;
  @Input() datetime: Date;
  @Input() timezone: 'local' | 'gmt' = 'local';

  @Output() dateTimeChange = new EventEmitter<Date>();

  @ViewChild('dateModel') dateModel: NgModel;

  date: moment.Moment | null = null;
  timeValue: moment.Moment | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.datetime) {
      const value = changes.datetime.currentValue;

      if (value) {
        const m = moment(value);
        this.date = m.clone();
        this.timeValue = m.clone();
      } else {
        this.date = null;
        this.timeValue = null;
      }
    }
  }

  onDate(): void {
    if (!this.date) {
      this.timeValue = null;
      return;
    }

    if (!this.dateModel?.invalid) {
      this.setValue();
    }
  }

  onTime(): void {
    if (this.timeValue) {
      this.setValue();
    }
  }

  private setValue(): void {
    if (!this.date || !this.timeValue) {
      return;
    }

    const date = this.date.clone().set({
      hour: this.timeValue.hours(),
      minute: this.timeValue.minutes(),
      second: this.timeValue.seconds()
    });

    if (this.timezone === 'gmt') {
      date.utc(true);
    }

    this.dateTimeChange.emit(date.toDate());
  }
}
