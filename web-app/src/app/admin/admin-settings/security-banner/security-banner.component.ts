import {
  Component,
  OnInit,
  ViewChild,
  OnDestroy,
  AfterViewInit,
  signal
} from '@angular/core';
import { Subject, lastValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog as MatDialog } from '@angular/material/dialog';

import { ColorPickerComponent } from '../../../../app/color-picker/color-picker.component';
import { SettingsService } from '../settings.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { AdminSettingsUnsavedComponent } from '../admin-settings-unsaved/admin-settings-unsaved.component';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ColorPickerModule } from '../../../color-picker/color-picker.module';

@Component({
  selector: 'security-banner',
  templateUrl: 'security-banner.component.html',
  styleUrls: ['./security-banner.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSlideToggleModule,
    ColorPickerModule
  ]
})
export class SecurityBannerComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly breadcrumbs: AdminBreadcrumb[] = [{ title: 'Banner', icon: 'page_header' }];

  readonly showHeader = signal(false);
  readonly headerText = signal('');
  readonly headerTextColor = signal('#000000');
  readonly headerBackgroundColor = signal('#FFFFFF');
  readonly showFooter = signal(false);
  readonly footerText = signal('');
  readonly footerTextColor = signal('#000000');
  readonly footerBackgroundColor = signal('#FFFFFF');
  readonly isDirty = signal(false);

  @ViewChild('headerTextColorPicker') headerTextColorPicker?: ColorPickerComponent;
  @ViewChild('headerBackgroundColorPicker') headerBackgroundColorPicker?: ColorPickerComponent;
  @ViewChild('footerTextColorPicker') footerTextColorPicker?: ColorPickerComponent;
  @ViewChild('footerBackgroundColorPicker') footerBackgroundColorPicker?: ColorPickerComponent;

  private destroy$ = new Subject<void>();
  private viewReady = false;
  private settingsLoaded = false;

  constructor(
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private breadcrumbService: AdminBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);

    this.settingsService
      .get('banner')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: any) => {
          const nextBanner = result?.settings ?? result?.banner?.settings;
          if (nextBanner) {
            this.showHeader.set(nextBanner.showHeader ?? false);
            this.headerText.set(nextBanner.headerText ?? '');
            this.headerTextColor.set(nextBanner.headerTextColor ?? '#000000');
            this.headerBackgroundColor.set(nextBanner.headerBackgroundColor ?? '#FFFFFF');
            this.showFooter.set(nextBanner.showFooter ?? false);
            this.footerText.set(nextBanner.footerText ?? '');
            this.footerTextColor.set(nextBanner.footerTextColor ?? '#000000');
            this.footerBackgroundColor.set(nextBanner.footerBackgroundColor ?? '#FFFFFF');
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
    this.isDirty.set(status);
  }

  save(): void {
    this.settingsService
      .update('banner', {
        showHeader: this.showHeader(),
        headerText: this.headerText(),
        headerTextColor: this.headerTextColor(),
        headerBackgroundColor: this.headerBackgroundColor(),
        showFooter: this.showFooter(),
        footerText: this.footerText(),
        footerTextColor: this.footerTextColor(),
        footerBackgroundColor: this.footerBackgroundColor()
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isDirty.set(false);
          this.snackBar.open('Banner saved', undefined, { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to save banner', undefined, { duration: 2000 })
      });
  }

  async onUnsavedChanges(): Promise<boolean> {
    if (!this.isDirty()) return true;
    const ref = this.dialog.open(AdminSettingsUnsavedComponent);
    const result = await lastValueFrom(ref.afterClosed());
    const discard = result ? !!result.discard : true;
    if (discard) this.isDirty.set(false);
    return discard;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private tryInitPickers(): void {
    if (!this.viewReady || !this.settingsLoaded) return;

    this.destroy$.next();

    this.initPicker(this.headerTextColorPicker, this.headerTextColor(), (c) => {
      this.headerTextColor.set(c);
      this.setDirty(true);
    });

    this.initPicker(this.headerBackgroundColorPicker, this.headerBackgroundColor(), (c) => {
      this.headerBackgroundColor.set(c);
      this.setDirty(true);
    });

    this.initPicker(this.footerTextColorPicker, this.footerTextColor(), (c) => {
      this.footerTextColor.set(c);
      this.setDirty(true);
    });

    this.initPicker(this.footerBackgroundColorPicker, this.footerBackgroundColor(), (c) => {
      this.footerBackgroundColor.set(c);
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
