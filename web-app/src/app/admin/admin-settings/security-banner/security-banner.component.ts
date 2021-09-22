import { Component, OnInit, Inject, Output, EventEmitter, ViewChild } from '@angular/core';
import { Banner } from './security-banner.model';
import { ColorEvent } from 'ngx-color';
import { Settings } from 'src/app/upgrade/ajs-upgraded-providers';
import { ColorPickerComponent } from 'src/app/color-picker/color-picker.component';

@Component({
    selector: 'security-banner',
    templateUrl: 'security-banner.component.html',
    styleUrls: ['./security-banner.component.scss']
})
export class SecurityBannerComponent implements OnInit {
    @Output() saveEvent = new EventEmitter<boolean>();
    banner: Banner = {
        headerTextColor: '#000000',
        headerText: '',
        headerBackgroundColor: 'FFFFFF',
        footerTextColor: '#000000',
        footerText: '',
        footerBackgroundColor: 'FFFFFF',
        showHeader: false,
        showFooter: false
    };
    @ViewChild('headerTextColor') headerTextColorPicker: ColorPickerComponent;
    @ViewChild('headerBackgroundColor') headerBackgroundColorPicker: ColorPickerComponent;
    @ViewChild('footerTextColor') footerTextColorPicker: ColorPickerComponent;
    @ViewChild('footerBackgroundColor') footerBackgroundColoricker: ColorPickerComponent;

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

            this.banner = settings.banner ? settings.banner.settings : this.banner;

            //TODO dont call ngoninit
            this.headerTextColorPicker.hexColor = this.banner.headerTextColor;
            this.headerTextColorPicker.ngOnInit();
            this.headerBackgroundColorPicker.hexColor = this.banner.headerBackgroundColor;
            this.headerBackgroundColorPicker.ngOnInit();
            this.footerTextColorPicker.hexColor = this.banner.footerTextColor;
            this.footerTextColorPicker.ngOnInit();
            this.footerBackgroundColoricker.hexColor = this.banner.footerBackgroundColor;
            this.footerBackgroundColoricker.ngOnInit();
        }).catch(err => {
            console.log(err);
        });
    }

    colorChanged(event: ColorEvent, key: string): void {
        if (this.banner.hasOwnProperty(key)) {
            this.banner[key] = event.color;
        } else {
            console.log(key + ' is not a valid banner property');
        }
    }

    save(): void {
        this.settings.update({ type: 'banner' }, this.banner, () => {
            this.saveEvent.emit(true);
        }, () => {
            this.saveEvent.emit(false);
        });
    }
}