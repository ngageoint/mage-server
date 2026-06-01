import {
  Component,
  OnInit,
  ViewChild,
  OnDestroy,
  AfterViewInit
} from '@angular/core';
import { Subject, lastValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog as MatDialog } from '@angular/material/dialog';

import { Banner } from './security-banner.model';
import { ColorPickerComponent } from '../../../../app/color-picker/color-picker.component';
import { SettingsService } from '../settings.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminSettingsUnsavedComponent } from '../admin-settings-unsaved/admin-settings-unsaved.component';

@Component({
  selector: 'security-banner',
  templateUrl: 'security-banner.component.html',
  styleUrls: ['./security-banner.component.scss'],
  standalone: false
})
export class SecurityBannerComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly breadcrumbs: AdminBreadcrumb[] = [
    { title: 'Banner', icon: 'page_header' }
  ];

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

  constructor(
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

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

  setDirty(status: boolean): void {
    this.isDirty = status;
  }

  save(): void {
    this.settingsService
      .update('banner', this.banner)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isDirty = false;
          this.snackBar.open('Banner saved', undefined, { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to save banner', undefined, { duration: 2000 })
      });
  }

  async onUnsavedChanges(): Promise<boolean> {
    if (!this.isDirty) return true;
    const ref = this.dialog.open(AdminSettingsUnsavedComponent);
    const result = await lastValueFrom(ref.afterClosed());
    const discard = result ? !!result.discard : true;
    if (discard) this.isDirty = false;
    return discard;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
}
