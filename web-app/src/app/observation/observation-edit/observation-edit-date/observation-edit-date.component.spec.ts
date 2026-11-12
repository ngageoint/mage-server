import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { UntypedFormControl, UntypedFormGroup, FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import moment from 'moment';

import { ObservationEditDateComponent } from './observation-edit-date.component';
import { LocalStorageService } from '../../../http/local-storage.service';

class MockLocalStorageService {
  getTimeZoneEdit(): string {
    return 'local'
  }
}

@Component({
    selector: `host-component`,
    template: `<observation-edit-date [definition]="definition" [formGroup]="formGroup"></observation-edit-date>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ObservationEditDateComponent]
})
class TestHostComponent {
  formGroup = new UntypedFormGroup({
    date: new UntypedFormControl(null)
  })

  definition: any = {
    name: 'date',
    title: 'Date Field'
  }

  component = viewChild.required(ObservationEditDateComponent)
}

describe('ObservationEditDateComponent', () => {
  let component: ObservationEditDateComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatInputModule,
        MatMomentDateModule,
        MatTimepickerModule,
        NoopAnimationsModule,
        ObservationEditDateComponent,
        TestHostComponent
      ],
      providers: [
        { provide: LocalStorageService, useClass: MockLocalStorageService }
      ]
    })
    .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    hostComponent = fixture.componentInstance
    fixture.detectChanges()
    component = hostComponent.component()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should populate date and time from an existing timestamp on the form control', () => {
    const freshFixture = TestBed.createComponent(TestHostComponent)
    const freshHost = freshFixture.componentInstance
    freshHost.formGroup = new UntypedFormGroup({
      date: new UntypedFormControl(moment('2026-03-15T14:30:00').toDate())
    })
    freshFixture.detectChanges()

    expect(freshHost.component().date()).not.toBeNull()
    expect(freshHost.component().timeValue()).not.toBeNull()
    expect(freshHost.component().date()?.date()).toBe(15)
  })

  it('should clear date and time when given a form group whose control has no value', () => {
    const emptyFixture = TestBed.createComponent(TestHostComponent)
    const emptyHost = emptyFixture.componentInstance
    emptyHost.formGroup = new UntypedFormGroup({
      date: new UntypedFormControl(null)
    })
    emptyFixture.detectChanges()

    expect(emptyHost.component().date()).toBeNull()
    expect(emptyHost.component().timeValue()).toBeNull()
  })
});
