import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { PollingIntervalComponent } from './polling-interval.component';

describe('PollingIntervalComponent', () => {
  let component: PollingIntervalComponent;
  let fixture: ComponentFixture<PollingIntervalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PollingIntervalComponent],
      imports: []
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
