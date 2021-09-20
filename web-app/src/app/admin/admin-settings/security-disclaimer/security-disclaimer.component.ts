import { Component, OnInit, Inject, Output, EventEmitter } from '@angular/core';
import { Disclaimer } from './security-disclaimer.model';
import { Settings } from 'src/app/upgrade/ajs-upgraded-providers';

@Component({
    selector: 'security-disclaimer',
    templateUrl: 'security-disclaimer.component.html',
    styleUrls: ['./security-disclaimer.component.scss']
})
export class SecurityDisclaimerComponent implements OnInit {
    @Output() saveEvent = new EventEmitter<boolean>();
    disclaimer: Disclaimer = {
        show: false,
        title: '',
        text: ''
    }

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

    save(): void {
        this.settings.update({ type: 'disclaimer' }, this.disclaimer, () => {
            this.saveEvent.emit(true);
        }, () => {
            this.saveEvent.emit(false);
        });
    }
}