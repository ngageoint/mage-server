import { Component, EventEmitter, Input } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { SecurityBannerComponent } from './security-banner.component';
import { SettingsService } from '../settings.service';

@Component({
    selector: 'color-picker',
    template: '',
    standalone: true
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
      imports: [SecurityBannerComponent, NoopAnimationsModule],
      providers: [{ provide: SettingsService, useClass: MockSettingsService }]
    })
      .overrideComponent(SecurityBannerComponent, {
        set: { imports: [MockColorPickerComponent] }
      })
      .overrideTemplate(
        SecurityBannerComponent,
        `
          <color-picker #headerTextColorPicker></color-picker>
          <color-picker #headerBackgroundColorPicker></color-picker>
          <color-picker #footerTextColorPicker></color-picker>
          <color-picker #footerBackgroundColorPicker></color-picker>
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
    expect(component.headerTextColor()).toBe('#000000');
    expect(component.headerText()).toBe('');
    expect(component.headerBackgroundColor()).toBe('#FFFFFF');
    expect(component.footerTextColor()).toBe('#000000');
    expect(component.footerText()).toBe('');
    expect(component.footerBackgroundColor()).toBe('#FFFFFF');
    expect(component.showHeader()).toBe(false);
    expect(component.showFooter()).toBe(false);
  });

  it('should initialize pickers with loaded values and update banner on color change', () => {
    expect(component.isDirty()).toBe(false);

    component.headerTextColorPicker?.onColorChanged.emit({ color: '#111111' });

    expect(component.headerTextColor()).toBe('#111111');
    expect(component.isDirty()).toBe(true);
  });
});
