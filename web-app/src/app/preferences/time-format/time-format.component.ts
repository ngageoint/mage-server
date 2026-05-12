import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange as MatSelectChange, MatSelectModule } from '@angular/material/select';
import { LocalStorageService } from 'src/app/http/local-storage.service';

interface TimeFormatOption {
  title: string
  format: 'absolute' | 'relative'
}

@Component({
  selector: 'time-format',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './time-format.component.html',
  styleUrls: ['./time-format.component.scss']
})
export class TimeFormatComponent implements OnInit {

  formatOptions: TimeFormatOption[] = [{
    title: 'Absolute',
    format: 'absolute'
  }, {
    title: 'Relative',
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