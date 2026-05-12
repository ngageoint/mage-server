import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, NgZone } from '@angular/core';
import { MatDialogRef as MatDialogRef } from '@angular/material/dialog';

import { AdminSettingsUnsavedComponent } from './admin-settings-unsaved.component';

describe('AdminSettingsUnsavedComponent', () => {
  let component: AdminSettingsUnsavedComponent;
  let fixture: ComponentFixture<AdminSettingsUnsavedComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AdminSettingsUnsavedComponent>>;
  let ngZone: NgZone;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<
      MatDialogRef<AdminSettingsUnsavedComponent>
    >('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [AdminSettingsUnsavedComponent],
      providers: [{ provide: MatDialogRef, useValue: dialogRef }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSettingsUnsavedComponent);
    component = fixture.componentInstance;

    ngZone = TestBed.inject(NgZone);
    spyOn(ngZone, 'run').and.callFake((fn: () => any) => fn());
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stay should close dialog with discard false inside zone', () => {
    component.stay();

    expect(ngZone.run).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith({ discard: false });
  });

  it('discard should close dialog with discard true inside zone', () => {
    component.discard();

    expect(ngZone.run).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith({ discard: true });
  });
});
