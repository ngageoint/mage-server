import { Component, OnInit } from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { LocalStorageService } from 'src/app/http/local-storage.service';

interface TimeFormatOption {
  title: string
  format: 'absolute' | 'relative'
}

@Component({
  selector: 'time-format',
  templateUrl: './time-format.component.html',
  styleUrls: ['./time-format.component.scss']
})
export class TimeFormatComponent implements OnInit {

  formatOptions: TimeFormatOption[] = [{
    title: 'Absolute',
    format: 'absolute'
  }, {
    title: '30 Seconds',
    format: 'relative'
  }]
  formatOption: TimeFormatOption

  constructor(
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    const format = this.localStorageService.getTimeFormat()
    this.formatOption = this.formatOptions.find((option: TimeFormatOption) => option.format === format)
  }

  updateTimeFormat(change: MatSelectChange) {
    this.localStorageService.setTimeFormat(change.value.format);
  }

  public compareFormat = function (option: TimeFormatOption, value: TimeFormatOption): boolean {
    return option.format === value.format
  }
}