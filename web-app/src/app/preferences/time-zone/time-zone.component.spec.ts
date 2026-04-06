import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TimeZoneComponent } from './time-zone.component';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';

describe('TimeZone Component', () => {
  let component: TimeZoneComponent;
  let fixture: ComponentFixture<TimeZoneComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [TimeZoneComponent],
      imports: [
        MatSelectModule,
        MatIconModule,
        MatFormFieldModule,
        MatSelectModule
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimeZoneComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
