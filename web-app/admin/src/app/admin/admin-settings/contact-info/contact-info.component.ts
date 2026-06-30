import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { SettingsService } from '../../../../../src/app/services/settings.service';
import { take } from 'rxjs/operators';

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
  oldShowDevContact: boolean;
  isDirty = false;

  contactinfo = {
    phone: '',
    email: '',
    showDevContact: false
  };

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    this.settingsService
      .get('contactinfo')
      .pipe(take(1))
      .subscribe({
        next: (res: any) => {
          const loaded = res?.settings ?? res ?? null;

          if (loaded) {
            this.contactinfo = {
              ...this.contactinfo,
              ...loaded
            };
          }

          this.oldEmail = this.contactinfo.email;
          this.oldPhone = this.contactinfo.phone;
          this.oldShowDevContact = this.contactinfo.showDevContact;
        },
        error: (err) => {
          console.log(err);
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.beginSave && !changes.beginSave.firstChange) {
      if (this.isDirty) this.save();
    }
  }

  setDirty(status: boolean): void {
    this.isDirty = status;
    this.onDirty.emit(this.isDirty);
  }

  save(): void {
    this.settingsService
      .update('contactinfo', this.contactinfo)
      .pipe(take(1))
      .subscribe({
        next: () => this.saveComplete.emit(true),
        error: () => this.saveComplete.emit(false)
      });
  }
}
