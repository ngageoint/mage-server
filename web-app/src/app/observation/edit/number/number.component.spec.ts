import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatError, MatFormField, MatFormFieldModule, MatInput, MatInputModule } from '@angular/material';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaxValueDirective } from './max-value.directive';
import { MinValueDirective } from './min-value.directive';

import { ObservationEditNumberComponent } from './number.component';

@Component({
  selector: `host-component`,
  template: `<observation-edit-number [field]="field"></observation-edit-number>`
})
class TestHostComponent {

  field = {
    title: 'Number',
    name: 'field1'
  }

  @ViewChild(ObservationEditNumberComponent, { static: false }) component: ObservationEditNumberComponent
}

describe('ObservationEditNumberComponent', () => {
  let component: ObservationEditNumberComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, NoopAnimationsModule],
      declarations: [ObservationEditNumberComponent, MaxValueDirective, MinValueDirective, TestHostComponent]
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
    expect(component).toBeTruthy()
  })

  fit('should not indicate required', () => {
    component.field.required = false
    fixture.detectChanges()
    const input = fixture.debugElement.query(By.directive(MatFormField)).componentInstance
    expect(input._control.required).toBeFalsy()
  })

  it('should indicate required', () => {
    component.field.required = true
    fixture.detectChanges()
    const input = fixture.debugElement.query(By.directive(MatFormField)).componentInstance
    expect(input._control.required).toBeTruthy()
  })

  it('should show error on invalid and touched', async () => {
    component.field.required = true

    const input = fixture.debugElement.query(By.directive(MatInput)).references['number']
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
