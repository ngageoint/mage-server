import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import moment from 'moment';
import { DatetimePickerComponent } from './datetime-picker.component';

describe('DatetimePickerComponent', () => {
  let component: DatetimePickerComponent;
  let fixture: ComponentFixture<DatetimePickerComponent>;
  let emitted: Date[];

  const datetime = new Date(2024, 0, 15, 10, 30, 0);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatetimePickerComponent, MatMomentDateModule, BrowserAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(DatetimePickerComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.dateTimeChange.subscribe(value => emitted.push(value));
  });

  it('starts empty when there is no datetime', () => {
    fixture.detectChanges();

    expect(component.date()).toBeNull();
    expect(component.timeValue()).toBeNull();
  });

  it('seeds the date and time from the datetime input', () => {
    fixture.componentRef.setInput('datetime', datetime);
    fixture.detectChanges();

    expect(component.date()?.toDate()).toEqual(datetime);
    expect(component.timeValue()?.toDate()).toEqual(datetime);
  });

  it('reseeds when the datetime input changes', () => {
    fixture.componentRef.setInput('datetime', datetime);
    fixture.detectChanges();
    const next = new Date(2024, 5, 1, 8, 0, 0);

    fixture.componentRef.setInput('datetime', next);
    fixture.detectChanges();

    expect(component.date()?.toDate()).toEqual(next);
    expect(component.timeValue()?.toDate()).toEqual(next);
  });

  it('emits the combined date and time when the date changes', () => {
    fixture.componentRef.setInput('datetime', datetime);
    fixture.detectChanges();

    component.date.set(moment(new Date(2024, 1, 20)));
    component.onDate();

    expect(emitted).toEqual([new Date(2024, 1, 20, 10, 30, 0)]);
  });

  it('emits the combined date and time when the time changes', () => {
    fixture.componentRef.setInput('datetime', datetime);
    fixture.detectChanges();

    component.timeValue.set(moment(new Date(2024, 0, 15, 14, 45, 0)));
    component.onTime();

    expect(emitted).toEqual([new Date(2024, 0, 15, 14, 45, 0)]);
  });

  it('does not emit when a time is picked before a date', () => {
    fixture.detectChanges();

    component.timeValue.set(moment(new Date(2024, 0, 15, 14, 45, 0)));
    component.onTime();

    expect(emitted).toEqual([]);
  });

  it('clears the time and does not emit when the date is cleared', () => {
    fixture.componentRef.setInput('datetime', datetime);
    fixture.detectChanges();

    component.date.set(null);
    component.onDate();

    expect(component.timeValue()).toBeNull();
    expect(emitted).toEqual([]);
  });

  it('keeps the picked wall clock time as UTC in gmt mode', () => {
    fixture.componentRef.setInput('datetime', datetime);
    fixture.componentRef.setInput('timezone', 'gmt');
    fixture.detectChanges();

    component.timeValue.set(moment(new Date(2024, 0, 15, 14, 45, 0)));
    component.onTime();

    expect(emitted[0].toISOString()).toBe('2024-01-15T14:45:00.000Z');
  });

  it('treats the required attribute string as true', () => {
    fixture.componentRef.setInput('required', 'true');
    fixture.detectChanges();

    expect(component.required()).toBeTrue();
  });
});
