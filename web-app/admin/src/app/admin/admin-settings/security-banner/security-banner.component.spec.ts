import { Component, EventEmitter, Input } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { SecurityBannerComponent } from './security-banner.component';
import { SettingsService } from 'admin/src/app/services/settings.service';

@Component({
  selector: 'color-picker',
  template: ''
})
class MockColorPickerComponent {
  @Input() hexColor: string = '';
  onColorChanged = new EventEmitter<{ color: string }>();

  updateColor(): void {}
}

class MockSettingsService {
  get = jasmine.createSpy('get').and.returnValue(
    of({
      type: 'banner',
      settings: {
        headerTextColor: '#000000',
        headerText: '',
        headerBackgroundColor: '#FFFFFF',
        footerTextColor: '#000000',
        footerText: '',
        footerBackgroundColor: '#FFFFFF',
        showHeader: false,
        showFooter: false
      }
    })
  );

  update = jasmine.createSpy('update').and.returnValue(of({}));
}

describe('SecurityBannerComponent', () => {
  let component: SecurityBannerComponent;
  let fixture: ComponentFixture<SecurityBannerComponent>;
  let settingsService: MockSettingsService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      declarations: [SecurityBannerComponent, MockColorPickerComponent],
      providers: [{ provide: SettingsService, useClass: MockSettingsService }]
    })
      .overrideTemplate(
        SecurityBannerComponent,
        `
          <color-picker #headerTextColor></color-picker>
          <color-picker #headerBackgroundColor></color-picker>
          <color-picker #footerTextColor></color-picker>
          <color-picker #footerBackgroundColor></color-picker>
        `
      )
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SecurityBannerComponent);
    component = fixture.componentInstance;
    settingsService = TestBed.inject(
      SettingsService
    ) as unknown as MockSettingsService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load banner settings on init', () => {
    expect(settingsService.get).toHaveBeenCalledWith('banner');
    expect(component.banner).toEqual({
      headerTextColor: '#000000',
      headerText: '',
      headerBackgroundColor: '#FFFFFF',
      footerTextColor: '#000000',
      footerText: '',
      footerBackgroundColor: '#FFFFFF',
      showHeader: false,
      showFooter: false
    });
  });

  it('should initialize pickers with loaded values and update banner on color change', () => {
    expect(component.isDirty).toBe(false);

    const dirtySpy = spyOn(component.onDirty, 'emit');

    component.headerTextColorPicker?.onColorChanged.emit({ color: '#111111' });

    expect(component.banner.headerTextColor).toBe('#111111');
    expect(component.isDirty).toBe(true);
    expect(dirtySpy).toHaveBeenCalledWith(true);
  });
});
