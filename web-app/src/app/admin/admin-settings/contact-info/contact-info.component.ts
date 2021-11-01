import { Component, EventEmitter, Inject, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { Settings } from "src/app/upgrade/ajs-upgraded-providers";

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
        this.settings.update({ type: 'contactinfo' }, this.contactinfo, () => {
            this.saveComplete.emit(true);
        }, () => {
            this.saveComplete.emit(false);
        });
    }
}