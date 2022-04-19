import { Component, OnInit, Inject, Output, EventEmitter, ViewChild, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Banner } from './security-banner.model';
import { Settings } from 'src/app/upgrade/ajs-upgraded-providers';
import { ColorPickerComponent } from 'src/app/color-picker/color-picker.component';
import { Subscription } from 'rxjs';

@Component({
    selector: 'security-banner',
    templateUrl: 'security-banner.component.html',
    styleUrls: ['./security-banner.component.scss']
})
export class SecurityBannerComponent implements OnInit, OnChanges, OnDestroy {
    @Output() saveComplete = new EventEmitter<boolean>();
    @Output() onDirty = new EventEmitter<boolean>();
    @Input() beginSave: any;
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
    @ViewChild('footerBackgroundColor') footerBackgroundColorPicker: ColorPickerComponent;

    isDirty = false;
    subscriptions: Subscription[];

    constructor(
        @Inject(Settings)
        public settings: any) {
        this.subscriptions = [];
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

            this.headerTextColorPicker.hexColor = this.banner.headerTextColor;
            this.headerTextColorPicker.updateColor();
            this.subscriptions.push(this.headerTextColorPicker.onColorChanged.subscribe(event => {
                this.banner.headerTextColor = event.color;
                this.isDirty = true;
            }));

            this.headerBackgroundColorPicker.hexColor = this.banner.headerBackgroundColor;
            this.headerBackgroundColorPicker.updateColor();
            this.subscriptions.push(this.headerBackgroundColorPicker.onColorChanged.subscribe(event => {
                this.banner.headerBackgroundColor = event.color;
                this.isDirty = true;
            }));

            this.footerTextColorPicker.hexColor = this.banner.footerTextColor;
            this.footerTextColorPicker.updateColor();
            this.subscriptions.push(this.footerTextColorPicker.onColorChanged.subscribe(event => {
                this.banner.footerTextColor = event.color;
                this.isDirty = true;
            }));

            this.footerBackgroundColorPicker.hexColor = this.banner.footerBackgroundColor;
            this.footerBackgroundColorPicker.updateColor();
            this.subscriptions.push(this.footerBackgroundColorPicker.onColorChanged.subscribe(event => {
                this.banner.footerBackgroundColor = event.color;
                this.isDirty = true;
            }));
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
        this.settings.update({ type: 'banner' }, this.banner, () => {
            this.saveComplete.emit(true);
        }, () => {
            this.saveComplete.emit(false);
        });
        this.setDirty(false);
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => {
            sub.unsubscribe();
        });
    }
}