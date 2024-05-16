import { Component, OnInit, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Disclaimer } from './security-disclaimer.model';
import { AdminSettingsService } from '../admin-settings.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'security-disclaimer',
  templateUrl: 'security-disclaimer.component.html',
  styleUrls: ['./security-disclaimer.component.scss']
})
export class SecurityDisclaimerComponent implements OnInit, OnChanges {
  @Output() saveComplete = new EventEmitter<boolean>();
  @Output() onDirty = new EventEmitter<boolean>();
  @Input() beginSave: any;
  disclaimer: Disclaimer = {
    show: false,
    title: '',
    text: ''
  }

  isDirty = false;

  constructor(
    private settingsService: AdminSettingsService
  ) { }

  ngOnInit(): void {
    const settingsPromise = firstValueFrom(this.settingsService.getSettings())

    settingsPromise.then(result => {
      const settings: any = {};

      result.forEach(element => {
        settings[element.type] = {};
        Object.keys(element).forEach(key => {
          if (key !== 'type') {
            settings[element.type][key] = element[key];
          }
        });
      });

      this.disclaimer = settings.disclaimer ? settings.disclaimer.settings : this.disclaimer;
    }).catch(err => {
      console.log(err);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.beginSave && !changes.beginSave.firstChange) {
      if (this.isDirty) {
        this.save();
      }
    }
  }

  setDirty(status: boolean): void {
    this.isDirty = status;
    this.onDirty.emit(this.isDirty);
  }

  private save(): void {
    this.settingsService.updateSettings('disclaimer', this.disclaimer).subscribe({
      next: () => {
        this.saveComplete.emit(true);
      },
      error: () => {
        this.saveComplete.emit(false);

      }
    })

    this.setDirty(false);
  }
}