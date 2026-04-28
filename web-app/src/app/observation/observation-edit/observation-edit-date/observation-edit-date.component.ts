import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { UntypedFormGroup, NgModel } from '@angular/forms';
import moment from 'moment';
import { LocalStorageService } from '../../../http/local-storage.service';

@Component({
  selector: 'observation-edit-date',
  templateUrl: './observation-edit-date.component.html',
  styleUrls: ['./observation-edit-date.component.scss']
})
export class ObservationEditDateComponent implements OnChanges {
  @Input() formGroup: UntypedFormGroup;
  @Input() definition: any;

  @ViewChild('dateModel') dateModel: NgModel;
  @ViewChild('timeModel') timeModel: NgModel;

  date: moment.Moment | null = null;
  time = '';
  timeZone: string;
  timeInvalid = false;

  constructor(private localStorageService: LocalStorageService) {
    this.timeZone = localStorageService.getTimeZoneEdit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.formGroup && changes.formGroup.currentValue) {
      const timestamp = this.formGroup.get(this.definition.name)?.value;

      if (timestamp) {
        const m = moment(timestamp);
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

  toggleTimeZone(): void {
    this.timeZone = this.timeZone === 'gmt' ? 'local' : 'gmt';
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

    if (this.timeZone === 'gmt') {
      date.add(date.utcOffset(), 'minutes');
    }

    const control = this.formGroup?.get(this.definition.name);
    if (!control) {
      return;
    }

    control.setValue(date.toDate());
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
