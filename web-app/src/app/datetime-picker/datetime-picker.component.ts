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
  styleUrls: ['./datetime-picker.component.scss']
})
export class DatetimePickerComponent implements OnChanges {
  @Input() title: string;
  @Input() required: boolean;
  @Input() datetime: Date;
  @Input() timezone: 'local' | 'gmt' = 'local';

  @Output() dateTimeChange = new EventEmitter<Date>();

  @ViewChild('dateModel') dateModel: NgModel;
  @ViewChild('timeModel') timeModel: NgModel;

  date: moment.Moment | null = null;
  time = '';
  timeInvalid = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.datetime) {
      const value = changes.datetime.currentValue;

      if (value) {
        const m = moment(value);
        this.date = m.clone();
        this.time = m.format('HH:mm:ss');
      } else {
        this.date = null;
        this.time = '';
      }

      this.timeInvalid = false;
    }
  }

  onDate(): void {
    if (!this.date) {
      this.time = '';
      return;
    }

    if (!this.dateModel?.invalid) {
      this.setValue();
    }
  }

  onTime(): void {
    this.timeInvalid = !this.isValidTime(this.time);

    if (!this.timeInvalid) {
      this.setValue();
    }
  }

  private setValue(): void {
    if (!this.date) {
      return;
    }

    const parsedTime = this.parseTime(this.time);
    if (!parsedTime) {
      return;
    }

    const date = this.date.clone().set({
      hour: parsedTime.hour,
      minute: parsedTime.minute,
      second: parsedTime.second
    });

    if (this.timezone === 'gmt') {
      date.utc(true);
    }

    this.dateTimeChange.emit(date.toDate());
  }

  showTimePicker(input: HTMLInputElement): void {
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }

  private isValidTime(value: string): boolean {
    return !!this.parseTime(value);
  }

  private parseTime(
    value: string
  ): { hour: number; minute: number; second: number } | null {
    if (!value) {
      return { hour: 0, minute: 0, second: 0 };
    }

    const match = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) {
      return null;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = match[3] ? Number(match[3]) : 0;

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      Number.isNaN(second) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59 ||
      second < 0 ||
      second > 59
    ) {
      return null;
    }

    return { hour, minute, second };
  }
}
