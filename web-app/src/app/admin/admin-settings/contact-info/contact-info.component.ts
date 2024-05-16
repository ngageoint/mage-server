import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { AdminSettingsService } from "../admin-settings.service";
import { firstValueFrom } from "rxjs";

@Component({
  selector: 'contact-info',
  templateUrl: 'contact-info.component.html',
  styleUrls: ['./contact-info.component.scss']
})
export class ContactInfoComponent implements OnInit, OnChanges {
  @Output() saveComplete = new EventEmitter<boolean>();
  @Output() onDirty = new EventEmitter<boolean>();
  @Input() beginSave: any;

  oldEmail: string;
  oldPhone: string;
  isDirty = false;

  contactinfo = {
    phone: '',
    email: ''
  }

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

      this.contactinfo = settings.contactinfo ? settings.contactinfo.settings : this.contactinfo;

      this.oldEmail = this.contactinfo.email;
      this.oldPhone = this.contactinfo.phone;
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

  save(): void {
    this.settingsService.updateSettings('contactinfo', this.contactinfo).subscribe({
      next: () => {
        this.saveComplete.emit(true);
      },
      error: () => {
        this.saveComplete.emit(false);
      }
    })
  }
}