import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  MatLegacySnackBar as MatSnackBar,
  MatLegacySnackBarModule as MatSnackBarModule
} from '@angular/material/legacy-snack-bar';
import {
  MatLegacyDialog as MatDialog,
  MatLegacyDialogModule as MatDialogModule
} from '@angular/material/legacy-dialog';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';

import { AdminSettingsComponent } from './admin-settings.component';
import { AdminSettingsUnsavedComponent } from './admin-settings-unsaved/admin-settings-unsaved.component';

describe('AdminSettingsComponent', () => {
  let component: AdminSettingsComponent;
  let fixture: ComponentFixture<AdminSettingsComponent>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(waitForAsync(() => {
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatDialogModule,
        MatSnackBarModule,
        MatTabsModule,
        MatIconModule
      ],
      declarations: [AdminSettingsComponent],
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('save should reset onSave object', () => {
    const prev = component.onSave;
    component.save();
    expect(component.onSave).not.toBe(prev);
  });

  it('isDirty should return false when nothing dirty', () => {
    component.isBannerDirty = false;
    component.isDisclaimerDirty = false;
    component.isAuthenticationDirty = false;
    component.isContactInfoDirty = false;
    expect(component.isDirty()).toBe(false);
  });

  it('isDirty should return true when any dirty', () => {
    component.isContactInfoDirty = true;
    expect(component.isDirty()).toBe(true);
  });

  it('onBannerDirty should set flag', () => {
    component.onBannerDirty(true);
    expect(component.isBannerDirty).toBe(true);
  });

  it('onDisclaimerDirty should set flag', () => {
    component.onDisclaimerDirty(true);
    expect(component.isDisclaimerDirty).toBe(true);
  });

  it('onContactInfoDirty should set flag', () => {
    component.onContactInfoDirty(true);
    expect(component.isContactInfoDirty).toBe(true);
  });

  it('onBannerSaved should show success snack and clear dirty', () => {
    component.isBannerDirty = true;
    component.onBannerSaved(true);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Banner successfully saved',
      undefined,
      { duration: 2000 }
    );
    expect(component.isBannerDirty).toBe(false);
  });

  it('onBannerSaved should show failure snack and clear dirty', () => {
    component.isBannerDirty = true;
    component.onBannerSaved(false);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Failed to save banner',
      undefined,
      { duration: 2000 }
    );
    expect(component.isBannerDirty).toBe(false);
  });

  it('onDisclaimerSaved should show success snack and clear dirty', () => {
    component.isDisclaimerDirty = true;
    component.onDisclaimerSaved(true);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Disclaimer successfully saved',
      undefined,
      { duration: 2000 }
    );
    expect(component.isDisclaimerDirty).toBe(false);
  });

  it('onDisclaimerSaved should show failure snack and clear dirty', () => {
    component.isDisclaimerDirty = true;
    component.onDisclaimerSaved(false);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Failed to save disclaimer',
      undefined,
      { duration: 2000 }
    );
    expect(component.isDisclaimerDirty).toBe(false);
  });

  it('onContactInfoSaved should show success snack and clear dirty', () => {
    component.isContactInfoDirty = true;
    component.onContactInfoSaved(true);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Contact info successfully saved',
      undefined,
      { duration: 2000 }
    );
    expect(component.isContactInfoDirty).toBe(false);
  });

  it('onContactInfoSaved should show failure snack and clear dirty', () => {
    component.isContactInfoDirty = true;
    component.onContactInfoSaved(false);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Failed to save contact info',
      undefined,
      { duration: 2000 }
    );
    expect(component.isContactInfoDirty).toBe(false);
  });

  it('onUnsavedChanges should return true without opening dialog when not dirty', async () => {
    component.isBannerDirty = false;
    component.isDisclaimerDirty = false;
    component.isAuthenticationDirty = false;
    component.isContactInfoDirty = false;

    const result = await component.onUnsavedChanges();

    expect(result).toBe(true);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('onUnsavedChanges should return false when user chooses stay', async () => {
    component.isBannerDirty = true;

    dialog.open.and.returnValue({
      afterClosed: () => of({ discard: false })
    } as any);

    const result = await component.onUnsavedChanges();

    expect(dialog.open).toHaveBeenCalledWith(AdminSettingsUnsavedComponent);
    expect(result).toBe(false);
    expect(component.isBannerDirty).toBe(true);
  });

  it('onUnsavedChanges should discard and reset flags when user chooses discard', async () => {
    component.isBannerDirty = true;
    component.isDisclaimerDirty = true;
    component.isAuthenticationDirty = true;
    component.isContactInfoDirty = true;

    dialog.open.and.returnValue({
      afterClosed: () => of({ discard: true })
    } as any);

    const result = await component.onUnsavedChanges();

    expect(dialog.open).toHaveBeenCalledWith(AdminSettingsUnsavedComponent);
    expect(result).toBe(true);
    expect(component.isBannerDirty).toBe(false);
    expect(component.isDisclaimerDirty).toBe(false);
    expect(component.isAuthenticationDirty).toBe(false);
    expect(component.isContactInfoDirty).toBe(false);
  });

  it('onUnsavedChanges should discard by default when dialog result is undefined', async () => {
    component.isBannerDirty = true;

    dialog.open.and.returnValue({
      afterClosed: () => of(undefined)
    } as any);

    const result = await component.onUnsavedChanges();

    expect(dialog.open).toHaveBeenCalledWith(AdminSettingsUnsavedComponent);
    expect(result).toBe(true);
    expect(component.isBannerDirty).toBe(false);
  });
});
