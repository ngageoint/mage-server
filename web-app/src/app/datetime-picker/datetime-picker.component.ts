import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { NgModel } from '@angular/forms';
import * as moment from 'moment'
import { LocalStorageService } from '../http/local-storage.service';

@Component({
  selector: 'datetime-picker',
  templateUrl: './datetime-picker.component.html',
  styleUrls: ['./datetime-picker.component.scss']
})
export class DatetimePickerComponent implements OnChanges {

  @Input() title: string
  @Input() required: boolean
  @Input() datetime: Date
  @Input() timezone: 'local' | 'gmt'

  @Output() dateTimeChange = new EventEmitter<Date>()

  @ViewChild('dateModel') dateModel: NgModel
  @ViewChild('timeModel') timeModel: NgModel

  date: moment.Moment
  time: moment.Moment

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.datetime && changes.datetime.currentValue) {
      this.date = moment(changes.datetime.currentValue)
      this.time = moment(changes.datetime.currentValue)
      this.setValue()
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

  private setValue(): void {
    const date = this.date.set({
      hour: this.time ? this.time.get('hour') : 0,
      minute: this.time ? this.time.get('minute') : 0,
      second: this.time ? this.time.get('second') : 0,
    })

    if (this.timezone === 'gmt') {
      date.utc(true)
    }

    this.dateTimeChange.emit(date.toDate())
  }
}
