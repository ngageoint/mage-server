import {
    Component,
    OnInit,
    Output,
    EventEmitter,
    ViewChild,
    Input,
    OnChanges,
    SimpleChanges,
    OnDestroy,
    AfterViewInit
  } from '@angular/core';
  import { Banner } from './security-banner.model';
  import { ColorPickerComponent } from '../../../../app/color-picker/color-picker.component';
  import { Subject } from 'rxjs';
  import { takeUntil } from 'rxjs/operators';
  import { SettingsService } from '../../../../../src/app/services/settings.service';
  
  @Component({
    selector: 'security-banner',
    templateUrl: 'security-banner.component.html',
    styleUrls: ['./security-banner.component.scss']
  })
  export class SecurityBannerComponent
    implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  
    @Output() saveComplete = new EventEmitter<boolean>();
    @Output() onDirty = new EventEmitter<boolean>();
    @Input() beginSave: any;
  
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
  
    @ViewChild('headerTextColor') headerTextColorPicker?: ColorPickerComponent;
    @ViewChild('headerBackgroundColor') headerBackgroundColorPicker?: ColorPickerComponent;
    @ViewChild('footerTextColor') footerTextColorPicker?: ColorPickerComponent;
    @ViewChild('footerBackgroundColor') footerBackgroundColorPicker?: ColorPickerComponent;
  
    isDirty = false;
  
    private destroy$ = new Subject<void>();
    private viewReady = false;
    private settingsLoaded = false;
  
    constructor(private settingsService: SettingsService) {}
  
    ngOnInit(): void {
      this.settingsService
        .get('banner')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result: any) => {
            const nextBanner = result?.settings ?? result?.banner?.settings;
            if (nextBanner) {
              this.banner = nextBanner;
            }
            this.settingsLoaded = true;
            this.tryInitPickers();
          },
          error: (err) => {
            console.log(err);
          }
        });
    }
  
    ngAfterViewInit(): void {
      this.viewReady = true;
      this.tryInitPickers();
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
  
    private tryInitPickers(): void {
      if (!this.viewReady || !this.settingsLoaded) return;
  
      this.destroy$.next();
  
      this.initPicker(this.headerTextColorPicker, this.banner.headerTextColor, (c) => {
        this.banner.headerTextColor = c;
        this.setDirty(true);
      });
  
      this.initPicker(this.headerBackgroundColorPicker, this.banner.headerBackgroundColor, (c) => {
        this.banner.headerBackgroundColor = c;
        this.setDirty(true);
      });
  
      this.initPicker(this.footerTextColorPicker, this.banner.footerTextColor, (c) => {
        this.banner.footerTextColor = c;
        this.setDirty(true);
      });
  
      this.initPicker(this.footerBackgroundColorPicker, this.banner.footerBackgroundColor, (c) => {
        this.banner.footerBackgroundColor = c;
        this.setDirty(true);
      });
    }
  
    private initPicker(
      picker: ColorPickerComponent | undefined,
      initialHex: string,
      onChange: (hex: string) => void
    ): void {
      if (!picker) return;
  
      picker.hexColor = initialHex;
      picker.updateColor();
  
      picker.onColorChanged
        .pipe(takeUntil(this.destroy$))
        .subscribe((event: any) => {
          onChange(event.color);
        });
    }
  
    private save(): void {
      this.settingsService
        .update('banner', this.banner)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.saveComplete.emit(true),
          error: () => this.saveComplete.emit(false)
        });
  
      this.setDirty(false);
    }
  
    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }
  }
  