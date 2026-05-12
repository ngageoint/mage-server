import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { SecurityDisclaimerComponent } from './security-disclaimer.component';
import { SettingsService } from 'admin/src/app/services/settings.service';

describe('SecurityDisclaimerComponent', () => {
  let component: SecurityDisclaimerComponent;
  let settingsService: jasmine.SpyObj<SettingsService>;

  function createComponent(): void {
    settingsService = jasmine.createSpyObj<SettingsService>('SettingsService', [
      'get',
      'update'
    ]);

    settingsService.get.and.returnValue(
      of({
        settings: {
          show: true,
          title: 'T',
          text: 'X'
        }
      })
    );

    settingsService.update.and.returnValue(of({}));

    component = new SecurityDisclaimerComponent(settingsService);
    component.ngOnInit();
  }

  beforeEach(() => {
    createComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load disclaimer settings on init', () => {
    expect(settingsService.get).toHaveBeenCalledWith('disclaimer');

    expect(component.disclaimer).toEqual(
      jasmine.objectContaining({
        show: true,
        title: 'T',
        text: 'X'
      })
    );
  });

  it('should save when dirty and beginSave changes', fakeAsync(() => {
    component.setDirty(true);
    settingsService.update.calls.reset();

    component.ngOnChanges({
      beginSave: {
        currentValue: {},
        previousValue: null,
        firstChange: false,
        isFirstChange: () => false
      }
    } as any);

    tick();

    expect(settingsService.update).toHaveBeenCalledWith(
      'disclaimer',
      component.disclaimer
    );
    expect(component.isDirty).toBeFalse();
  }));

  it('should emit saveComplete true on successful save', fakeAsync(() => {
    const emitSpy = spyOn(component.saveComplete, 'emit');

    component.setDirty(true);

    component.ngOnChanges({
      beginSave: {
        currentValue: {},
        previousValue: null,
        firstChange: false,
        isFirstChange: () => false
      }
    } as any);

    tick();

    expect(emitSpy).toHaveBeenCalledWith(true);
  }));

  it('should emit saveComplete false on save error', fakeAsync(() => {
    const emitSpy = spyOn(component.saveComplete, 'emit');

    settingsService.update.and.returnValue(
      throwError(() => ({ error: 'nope' }))
    );

    component.setDirty(true);

    component.ngOnChanges({
      beginSave: {
        currentValue: {},
        previousValue: null,
        firstChange: false,
        isFirstChange: () => false
      }
    } as any);

    tick();

    expect(emitSpy).toHaveBeenCalledWith(false);
  }));
});