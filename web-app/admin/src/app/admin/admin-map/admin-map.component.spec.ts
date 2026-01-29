import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, ViewChild } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { By } from '@angular/platform-browser';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { AdminMapComponent } from './admin-map.component';
import { MapSettingsService } from '../../../app/map/settings/map.settings.service';

@Component({
  selector: 'host-component',
  template: `<mage-admin-map></mage-admin-map>`
})
class TestHostComponent {
  @ViewChild(AdminMapComponent) component!: AdminMapComponent;
}

describe('AdminMapComponent', () => {
  let component: AdminMapComponent;
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let mockMapSettingsService: jasmine.SpyObj<MapSettingsService>;

  beforeEach(async () => {
    mockMapSettingsService = jasmine.createSpyObj<MapSettingsService>(
      'MapSettingsService',
      ['getMapSettings', 'updateMapSettings']
    );

    mockMapSettingsService.getMapSettings.and.returnValue(
      of({
        webSearchType: 'NONE',
        mobileSearchType: 'NONE',
        webNominatimUrl: '',
        mobileNominatimUrl: ''
      } as any)
    );

    mockMapSettingsService.updateMapSettings.and.returnValue(of({} as any));

    await TestBed.configureTestingModule({
      imports: [
        MatInputModule,
        MatSnackBarModule,
        HttpClientTestingModule,
        NoopAnimationsModule
      ],
      declarations: [AdminMapComponent, TestHostComponent],
      providers: [
        { provide: MapSettingsService, useValue: mockMapSettingsService }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
    component = hostComponent.component;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show web nominatim url input when web search type is NOMINATIM', async () => {
    component.webSearchType = 'NOMINATIM';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const webNominatimInput = fixture.debugElement.query(
      By.css(
        'input.form-input[placeholder="https://nominatim.openstreetmap.org"]'
      )
    );

    expect(webNominatimInput).toBeTruthy();
  });
});
