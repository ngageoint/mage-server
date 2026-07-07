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
    styleUrls: ['./observation-edit-date.component.scss'],
    standalone: false
})
export class ObservationEditDateComponent implements OnChanges {
  @Input() formGroup: UntypedFormGroup;
  @Input() definition: any;

  @ViewChild('dateModel') dateModel: NgModel;

  date: moment.Moment | null = null;
  timeValue: moment.Moment | null = null;
  timeZone: string;
  second = 0;

  constructor(localStorageService: LocalStorageService) {
    this.timeZone = localStorageService.getTimeZoneEdit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.formGroup && changes.formGroup.currentValue) {
      const timestamp = this.formGroup.get(this.definition.name)?.value;

      if (timestamp) {
        const m =
          this.timeZone === 'gmt'
            ? moment.utc(timestamp)
            : moment(timestamp).local();
        this.date = m.clone();
        this.second = m.second();
        this.timeValue = m.clone();
      } else {
        this.date = null;
        this.timeValue = null;
        this.second = 0;
      }
    }
  }

  onDate(): void {
    if (!this.date) {
      this.timeValue = null;
      return;
    }

    if (!this.dateModel?.invalid) {
      this.setValue(true);
    }
  }

  onTime(): void {
    if (this.timeValue && this.date && !this.dateModel?.invalid) {
      this.setValue(false);
    }
  }

  toggleTimeZone(): void {
    this.timeZone = this.timeZone === 'gmt' ? 'local' : 'gmt';
  }

  private setValue(preserveSeconds: boolean): void {
    if (!this.date || !this.timeValue) {
      return;
    }

    const date = this.date.clone().set({
      hour: this.timeValue.hours(),
      minute: this.timeValue.minutes(),
      second: preserveSeconds ? this.second : 0
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
}
