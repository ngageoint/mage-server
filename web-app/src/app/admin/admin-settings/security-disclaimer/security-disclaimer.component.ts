import { Component, OnInit, Inject, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Disclaimer } from './security-disclaimer.model';
import { Settings } from 'src/app/upgrade/ajs-upgraded-providers';

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
        @Inject(Settings)
        public settings: any) {
    }

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
        this.settings.update({ type: 'disclaimer' }, this.disclaimer, () => {
            this.saveComplete.emit(true);
        }, () => {
            this.saveComplete.emit(false);
        });

        this.setDirty(false);
    }
}