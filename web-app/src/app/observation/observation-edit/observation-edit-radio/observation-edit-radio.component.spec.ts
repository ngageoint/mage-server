import { Component, ViewChild } from '@angular/core'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { FormsModule } from '@angular/forms'
import { MatError, MatFormFieldModule, MatRadioGroup, MatRadioModule } from '@angular/material'
import { By } from '@angular/platform-browser'

import { ObservationEditRadioComponent } from './observation-edit-radio.component'

@Component({
  selector: `host-component`,
  template: `<observation-edit-radio [field]="field"></observation-edit-radio>`
})
class TestHostComponent {

  field = {
    title: 'Radio',
    name: 'field1',
    choices: [{
      title: 'choice1'
    },{
      title: 'choice2'
    }]
  }

  @ViewChild(ObservationEditRadioComponent, { static: false }) component: ObservationEditRadioComponent
}

describe('ObservationEditRadioComponent', () => {
  let component: ObservationEditRadioComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, MatFormFieldModule, MatRadioModule],
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

  it('should not indicate required', () => {
    component.field.required = false
    fixture.detectChanges()
    const label = fixture.debugElement.query(By.directive(ObservationEditRadioComponent)).query(By.css('label')).nativeElement
    expect(label.innerText).not.toContain('*')
  })

  it('should indicate required', () => {
    component.field.required = true
    fixture.detectChanges()
    const label = fixture.debugElement.query(By.directive(ObservationEditRadioComponent)).query(By.css('label')).nativeElement
    expect(label.innerText).toContain('*')
  })

  it('should show error on invalid and touched', async () => {
    component.field.required = true

    const input = fixture.debugElement.query(By.directive(MatRadioGroup)).references['radio']
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
