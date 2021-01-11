import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, ViewChild } from '@angular/core';

import { ObservationEditSelectComponent } from './observation-edit-select.component';
import { By } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatError, MatInputModule, MatSelect, MatSelectModule } from '@angular/material';

@Component({
  template: `<observation-edit-dropdown [field]="field"></observation-edit-dropdown>`
})
class TestHostComponent {
  field = {
    title: 'Colors',
    choices: [{
      title: 'red'
    },{
      title: 'green'
    },{
      title: 'blue'
    }]
  }

  @ViewChild(ObservationEditSelectComponent, { static: false }) component: ObservationEditSelectComponent
}

describe('ObservationEditSelectComponent', () => {
  let component: ObservationEditSelectComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, FormsModule, ReactiveFormsModule, NgxMatSelectSearchModule, MatInputModule, MatSelectModule],
      declarations: [ObservationEditSelectComponent, TestHostComponent]
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    hostComponent = fixture.componentInstance
    fixture.detectChanges();
    component = hostComponent.component
  })

  it('should create', () => {
    expect(fixture.debugElement.query(By.directive(ObservationEditSelectComponent))).toBeTruthy();
  });

  it('should not indicate required', () => {
    component.field.required = false
    fixture.detectChanges()
    const select = fixture.debugElement.query(By.directive(MatSelect)).componentInstance
    expect(select.required).toBeFalsy()
  })

  it('should indicate required', () => {
    component.field.required = true
    fixture.detectChanges()
    const select = fixture.debugElement.query(By.directive(MatSelect)).componentInstance
    expect(select.required).toBeTruthy()
  })

  it('should show error on invalid and touched', async () => {
    component.field.required = true

    const input = fixture.debugElement.query(By.directive(MatSelect)).references['dropdown']
    input.control.markAsTouched()

    fixture.detectChanges()
    await fixture.whenStable()

    const error = fixture.debugElement.query(By.directive(MatError))
    expect(error.nativeElement.innerText).toBe('You must enter a value')
  })

  it('should not show error on invalid if not touched', async () => {
    component.field.required = true

    fixture.detectChanges()
    await fixture.whenStable()

    const error = fixture.debugElement.query(By.directive(MatError))
    expect(error).toBeNull()
  })
});
