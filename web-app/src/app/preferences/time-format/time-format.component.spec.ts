import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TimeFormatComponent } from './time-format.component';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('TimeFormat Component', () => {
  let component: TimeFormatComponent;
  let fixture: ComponentFixture<TimeFormatComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [TimeFormatComponent],
      imports: [
        MatSelectModule,
        MatIconModule,
        MatFormFieldModule,
        BrowserAnimationsModule,
        MatSelectModule
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimeFormatComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
