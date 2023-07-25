import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatError, MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import { By } from '@angular/platform-browser'
import { by } from 'protractor';

import { ObservationEditRadioComponent } from './observation-edit-radio.component'

@Component({
  selector: `host-component`,
  template: `<observation-edit-radio [definition]="definition" [formGroup]="formGroup"></observation-edit-radio>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class TestHostComponent {
  formGroup = new FormGroup({
    radio: new FormControl()
  })

  definition = {
    title: 'Radio',
    name: 'radio',
    choices: [{
      title: 'choice1'
    },{
      title: 'choice2'
    }]
  }

  @ViewChild(ObservationEditRadioComponent) component: ObservationEditRadioComponent
}

describe('ObservationEditRadioComponent', () => {
  let component: ObservationEditRadioComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatRadioModule],
      declarations: [ObservationEditRadioComponent, TestHostComponent]
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

  it('should not indicate required', async () => {
    component.definition.required = false

    const control = component.formGroup.get('radio')
    control.clearValidators()
    control.updateValueAndValidity()

    fixture.detectChanges()
    await fixture.whenStable()

    expect(control.valid).toBe(true)
    const error = fixture.debugElement.query(By.directive(MatError)).query(By.css('span'))
    expect(error.nativeElement.attributes.getNamedItem('hidden')).toBeTruthy()
  })

  it('should indicate required', async () => {
    component.definition.required = true

    const control = component.formGroup.get('radio')
    control.setValidators(Validators.required)
    control.updateValueAndValidity()

    fixture.detectChanges()
    await fixture.whenStable()

    expect(control.valid).toBe(false)
  })

  it('should show error on invalid and touched', async () => {
    component.definition.required = true

    const control = component.formGroup.get('radio')
    control.setValidators(Validators.required)
    control.updateValueAndValidity()
    control.markAsTouched()

    fixture.detectChanges()
    await fixture.whenStable()

    expect(control.valid).toBe(false)
    const error = fixture.debugElement.query(By.directive(MatError)).query(By.css('span'))
    expect(error.nativeElement.innerText).toBe('Radio is required')
  })

  it('should not show error on invalid if not touched', async () => {
    component.definition.required = true

    const control = component.formGroup.get('radio')
    control.setValidators(Validators.required)
    control.updateValueAndValidity()

    fixture.detectChanges()
    await fixture.whenStable()

    expect(control.valid).toBe(false)
    const error = fixture.debugElement.query(By.directive(MatError)).query(By.css('span'))
    expect(error.nativeElement.attributes.getNamedItem('hidden')).toBeTruthy()
  })
});
