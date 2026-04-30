import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { UntypedFormGroup, NgModel } from '@angular/forms';
import moment from 'moment';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { LocalStorageService } from '../../../http/local-storage.service';

@Component({
  selector: 'observation-edit-date',
  templateUrl: './observation-edit-date.component.html',
  styleUrls: ['./observation-edit-date.component.scss']
})
export class ObservationEditDateComponent implements OnChanges, OnDestroy {
  @Input() formGroup: UntypedFormGroup;
  @Input() definition: any;

  @ViewChild('dateModel') dateModel: NgModel;
  @ViewChild('timeModel') timeModel: NgModel;
  @ViewChild('timeInput') timeInput?: ElementRef<HTMLInputElement>;

  date: moment.Moment | null = null;
  time = '';
  timeZone: string;
  timeInvalid = false;
  second = 0;

  private timeChange$ = new Subject<void>();
  private timeChangeSub: Subscription;

  constructor(private localStorageService: LocalStorageService) {
    this.timeZone = localStorageService.getTimeZoneEdit();
    this.timeChangeSub = this.timeChange$
      .pipe(debounceTime(300))
      .subscribe(() => {
        this.timeInvalid = !this.isValidTime(this.time);
        if (!this.timeInvalid) {
          this.setValue(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.timeChangeSub.unsubscribe();
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
        this.time = m.format('HH:mm');
      } else {
        this.date = null;
        this.time = '';
        this.second = 0;
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
      this.setValue(true);
    }
  }

  onTime(): void {
    this.timeChange$.next();
  }

  openTimePicker(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const input = this.timeInput?.nativeElement as
      | (HTMLInputElement & { showPicker?: () => void })
      | undefined;

    if (!input) {
      return;
    }

    input.focus();
    input.click();
    input.showPicker?.();
  }

  toggleTimeZone(): void {
    this.timeZone = this.timeZone === 'gmt' ? 'local' : 'gmt';
  }

  private setValue(preserveSeconds: boolean): void {
    if (!this.date) {
      return;
    }

    const parsedTime = this.parseTime(
      this.time,
      preserveSeconds ? this.second : 0
    );
    if (!parsedTime) {
      return;
    }

    this.second = parsedTime.second;

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
    return !!this.parseTime(value, this.second);
  }

  private parseTime(
    value: string,
    defaultSecond = 0
  ): { hour: number; minute: number; second: number } | null {
    if (!value) {
      return { hour: 0, minute: 0, second: defaultSecond };
    }

    const match = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) {
      return null;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = match[3] ? Number(match[3]) : defaultSecond;

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
