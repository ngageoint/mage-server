import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TimeFormatComponent } from './time-format.component';

describe('TimeFormat Component', () => {
  let component: TimeFormatComponent;
  let fixture: ComponentFixture<TimeFormatComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [TimeFormatComponent],
      imports: []
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
