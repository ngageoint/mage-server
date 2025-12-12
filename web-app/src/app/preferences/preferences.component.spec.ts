import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { PreferencesComponent } from './preferences.component';
import { CoordinateSystemComponent } from './coordinate-system/coordinate-system.component';
import { TimeZoneComponent } from './time-zone/time-zone.component';
import { PollingIntervalComponent } from './polling-interval/polling-interval.component';
import { TimeFormatComponent } from './time-format/time-format.component';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

describe('Preferences Component', () => {
  let component: PreferencesComponent;
  let fixture: ComponentFixture<PreferencesComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        PreferencesComponent,
        CoordinateSystemComponent,
        TimeZoneComponent,
        PollingIntervalComponent,
        TimeFormatComponent
      ],
      imports: [MatIconModule, MatFormFieldModule, MatSelectModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PreferencesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
