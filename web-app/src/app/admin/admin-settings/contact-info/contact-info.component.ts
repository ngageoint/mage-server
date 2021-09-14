import { Component, DoCheck, EventEmitter, Inject, OnInit, Output } from "@angular/core";
import { Settings } from "src/app/upgrade/ajs-upgraded-providers";

@Component({
    selector: 'contact-info',
    templateUrl: 'contact-info.component.html',
    styleUrls: ['./contact-info.component.scss']
})
export class ContactInfoComponent implements OnInit, DoCheck {
    @Output() saveEvent = new EventEmitter<boolean>();
    oldEmail: string;
    oldPhone: string;
    isDirty = false;

    contactinfo = {
        phone: '',
        email: ''
    }

    constructor(
        @Inject(Settings) private settings) { }

    ngOnInit(): void {
        const settingsPromise = this.settings.query().$promise;

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

    ngDoCheck(): void {
        if (this.oldPhone !== this.contactinfo.phone) {
            this.isDirty = true;
        }
        if (this.oldEmail !== this.contactinfo.email) {
            this.isDirty = true;
        }
    }

    save(): void {
        this.settings.update({ type: 'contactinfo' }, this.contactinfo, () => {
            this.saveEvent.emit(true);
        }, () => {
            this.saveEvent.emit(false);
        });
    }
}