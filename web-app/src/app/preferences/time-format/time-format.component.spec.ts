import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TimeFormatComponent } from './time-format.component';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
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
