import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatSelectModule as MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { PollingIntervalComponent } from './polling-interval.component';
import { PollingService } from '../../event/polling.service';

describe('PollingIntervalComponent', () => {
  let component: PollingIntervalComponent;
  let fixture: ComponentFixture<PollingIntervalComponent>;
  let pollingService: jasmine.SpyObj<PollingService>;
  let pollingIntervalSubject: BehaviorSubject<number>;

  beforeEach(waitForAsync(() => {
    pollingIntervalSubject = new BehaviorSubject<number>(30000);
    pollingService = jasmine.createSpyObj('PollingService', ['setPollingInterval'], {
      pollingInterval$: pollingIntervalSubject.asObservable()
    });

    TestBed.configureTestingModule({
      declarations: [PollingIntervalComponent],
      imports: [
        MatSelectModule,
        MatIconModule,
        MatFormFieldModule,
        BrowserAnimationsModule,
        CommonModule
      ],
      providers: [
        { provide: PollingService, useValue: pollingService }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PollingIntervalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('selects the option matching the current polling interval', () => {
      fixture.detectChanges();
      expect(component.pollingOption).toEqual({ title: '30 Seconds', interval: 30000 });
    });

    it('leaves the option unset when the interval matches nothing', () => {
      pollingIntervalSubject.next(999);
      fixture.detectChanges();
      expect(component.pollingOption).toBeUndefined();
    });

    it('updates the selected option as the interval changes', () => {
      fixture.detectChanges();
      pollingIntervalSubject.next(300000);
      expect(component.pollingOption).toEqual({ title: '5 Minutes', interval: 300000 });
    });

    it('stops updating after the component is destroyed', () => {
      fixture.detectChanges();
      component.ngOnDestroy();

      pollingIntervalSubject.next(5000);

      expect(component.pollingOption).toEqual({ title: '30 Seconds', interval: 30000 });
    });
  });

  describe('updatePollingInterval', () => {
    it('sets the polling interval on the service', () => {
      fixture.detectChanges();
      component.updatePollingInterval({ value: { title: '2 Minutes', interval: 120000 } } as any);
      expect(pollingService.setPollingInterval).toHaveBeenCalledWith(120000);
    });
  });

  describe('compareOption', () => {
    it('compares options by interval', () => {
      expect(component.compareOption({ interval: 5000 }, { interval: 5000 })).toBeTrue();
      expect(component.compareOption({ interval: 5000 }, { interval: 30000 })).toBeFalse();
    });

    it('handles null option or value', () => {
      expect(component.compareOption(null, null)).toBeTrue();
      expect(component.compareOption({ interval: 5000 }, null)).toBeFalse();
    });
  });
});
