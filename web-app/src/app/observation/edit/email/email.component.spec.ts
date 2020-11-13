import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatError, MatFormField, MatFormFieldControl, MatFormFieldModule, MatInput, MatInputModule, MatSelect } from '@angular/material';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ObservationEditEmailComponent } from './email.component';

@Component({
  selector: `host-component`,
  template: `<observation-edit-email [field]="field"></observation-edit-email>`
})
class TestHostComponent {

  field = {
    title: 'Email',
    name: 'field1'
  }

  @ViewChild(ObservationEditEmailComponent, { static: false }) component: ObservationEditEmailComponent
}

describe('ObservationEditEmailComponent', () => {
  let component: ObservationEditEmailComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, NoopAnimationsModule],
      providers: [MatFormFieldControl],
      declarations: [ObservationEditEmailComponent, TestHostComponent]
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

  it('should not indicate required', () => {
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

    const input = fixture.debugElement.query(By.directive(MatInput)).references['email']
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
