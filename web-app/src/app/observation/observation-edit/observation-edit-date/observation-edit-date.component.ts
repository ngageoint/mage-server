import {
  Component,
  effect,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';
import { FormsModule, NgModel, UntypedFormGroup } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatTimepickerModule } from '@angular/material/timepicker';
import moment from 'moment';
import { LocalStorageService } from '../../../http/local-storage.service';

@Component({
    selector: 'observation-edit-date',
    templateUrl: './observation-edit-date.component.html',
    styleUrls: ['./observation-edit-date.component.scss'],
    imports: [FormsModule, MatDatepickerModule, MatFormFieldModule, MatInputModule, MatMomentDateModule, MatTimepickerModule]
})
export class ObservationEditDateComponent {
  private readonly localStorageService: LocalStorageService = inject(LocalStorageService)

  formGroup = input<UntypedFormGroup>()
  definition = input<any>()

  dateModel = viewChild.required<NgModel>('dateModel')

  date = signal<moment.Moment | null>(null)
  timeValue = signal<moment.Moment | null>(null)
  timeZone: string
  second = 0

  constructor() {
    this.timeZone = this.localStorageService.getTimeZoneEdit()

    effect(() => {
      const formGroup = this.formGroup()
      const definition = this.definition()
      if (!formGroup) return

      const timestamp = formGroup.get(definition?.name)?.value

      if (timestamp) {
        const m =
          this.timeZone === 'gmt'
            ? moment.utc(timestamp)
            : moment(timestamp).local()
        this.date.set(m.clone())
        this.second = m.second()
        this.timeValue.set(m.clone())
      } else {
        this.date.set(null)
        this.timeValue.set(null)
        this.second = 0
      }
    })
  }

  onDate(): void {
    if (!this.date()) {
      this.timeValue.set(null)
      return
    }

    if (!this.dateModel().invalid) {
      this.setValue(true)
    }
  }

  onTime(): void {
    if (this.timeValue() && this.date() && !this.dateModel().invalid) {
      this.setValue(false)
    }
  }

  private setValue(preserveSeconds: boolean): void {
    const date = this.date()
    const timeValue = this.timeValue()
    if (!date || !timeValue) {
      return
    }

    const updated = date.clone().set({
      hour: timeValue.hours(),
      minute: timeValue.minutes(),
      second: preserveSeconds ? this.second : 0
    })

    if (this.timeZone === 'gmt') {
      updated.add(updated.utcOffset(), 'minutes')
    }

    const control = this.formGroup()?.get(this.definition()?.name)
    if (!control) {
      return
    }

    control.setValue(updated.toDate())
  }
}
