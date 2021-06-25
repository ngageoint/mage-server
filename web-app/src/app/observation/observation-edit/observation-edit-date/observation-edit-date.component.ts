import { Component, Inject, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core'
import { FormGroup, NgModel } from '@angular/forms'
import { LocalStorageService } from 'src/app/upgrade/ajs-upgraded-providers'
import * as moment from 'moment'

interface DateField {
  title: string,
  name: string,
  value: Date,
  required: boolean
}

@Component({
  selector: 'observation-edit-date',
  templateUrl: './observation-edit-date.component.html',
  styleUrls: ['./observation-edit-date.component.scss']
})
export class ObservationEditDateComponent implements OnChanges {
  @Input() formGroup: FormGroup
  @Input() definition: any

  @ViewChild('dateModel') dateModel: NgModel
  @ViewChild('timeModel') timeModel: NgModel

  date: moment.Moment
  time: moment.Moment
  timeZone: string

  constructor(@Inject(LocalStorageService) localStorageService: any) {
    this.timeZone = localStorageService.getTimeZoneEdit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.formGroup && changes.formGroup.currentValue) {
      const timestamp = this.formGroup.get(this.definition.name).value
      this.date = moment(timestamp)
      this.time = moment(timestamp)
    }
  }

  onDate(): void {
    if (!this.date) {
      this.time = null;
      return
    }

    if (!this.dateModel.invalid) {
      this.setValue()
    }
  }

  onTime(): void {
    if (!this.timeModel.invalid) {
      this.setValue()
    }
  }

  toggleTimeZone(): void {
    this.timeZone = this.timeZone === 'gmt' ? 'local' : 'gmt'
  }

  private setValue(): void {
    const date = this.date.set({
      hour: this.time ? this.time.get('hour') : 0,
      minute: this.time ? this.time.get('minute') : 0,
      second: this.time ? this.time.get('second') : 0,
    })

    if (this.timeZone === 'gmt') {
      date.add(date.utcOffset(), 'minutes')
    }

    this.formGroup.get(this.definition.name).setValue(date.toDate())
  }

}
