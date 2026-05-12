import { Component, ElementRef, Input, OnInit, HostBinding } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface Banner {
    headerTextColor: string;
    headerText: string;
    headerBackgroundColor: string;
    footerTextColor: string;
    footerText: string;
    footerBackgroundColor: string;
    showHeader: boolean;
    showFooter: boolean;
}

@Component({
    selector: 'banner',
    standalone: true,
    imports: [
      CommonModule
    ],
    templateUrl: './banner.component.html',
    styleUrls: ['./banner.component.scss']
})
export class BannerComponent implements OnInit {
    @HostBinding('class.banner') bannerClass = true;
    @Input() type: 'header' | 'footer';

    banner: Banner = {
        headerTextColor: '#000000',
        headerText: '',
        headerBackgroundColor: '#FFFFFF',
        footerTextColor: '#000000',
        footerText: '',
        footerBackgroundColor: '#FFFFFF',
        showHeader: false,
        showFooter: false
    };

    constructor(
        private readonly http: HttpClient,
        private readonly elementRef: ElementRef
    ) { }

    ngOnInit(): void {
        this.http.get<any>('/api/settings/banner').subscribe(
            (response) => {
                if (response && response.settings) {
                    this.banner = response.settings;
                } else if (response) {
                    this.banner = response;
                }
                this.applyStyles();
            },
            (error) => {
                console.error('Failed to load banner settings:', error);
            }
        );
    }

    private applyStyles(): void {
        const element = this.elementRef.nativeElement;

        if (this.type === 'header' && this.banner.showHeader) {
            if (this.banner.headerBackgroundColor) {
                element.style.backgroundColor = this.banner.headerBackgroundColor;
            }
            if (this.banner.headerTextColor) {
                element.style.color = this.banner.headerTextColor;
            }
        }

        if (this.type === 'footer' && this.banner.showFooter) {
            if (this.banner.footerBackgroundColor) {
                element.style.backgroundColor = this.banner.footerBackgroundColor;
            }
            if (this.banner.footerTextColor) {
                element.style.color = this.banner.footerTextColor;
            }
        }
    }
}
