import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { PollingIntervalComponent } from './polling-interval.component';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';

describe('PollingIntervalComponent', () => {
  let component: PollingIntervalComponent;
  let fixture: ComponentFixture<PollingIntervalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PollingIntervalComponent],
      imports: [
        MatSelectModule,
        MatIconModule,
        MatFormFieldModule,
        MatSelectModule,
        BrowserAnimationsModule,
        CommonModule
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PollingIntervalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
