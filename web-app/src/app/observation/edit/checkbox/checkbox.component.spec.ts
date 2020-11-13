import { Component, ViewChild } from '@angular/core'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { FormsModule } from '@angular/forms'
import { MatCheckbox, MatCheckboxModule, MatError, MatFormFieldModule } from '@angular/material'
import { By } from '@angular/platform-browser'

import { ObservationEditCheckboxComponent } from './checkbox.component'

@Component({
  selector: `host-component`,
  template: `<observation-edit-checkbox [field]="field"></observation-edit-checkbox>`
})
class TestHostComponent {

  field = {
    title: 'Checkbox',
    name: 'field1'
  }

  @ViewChild(ObservationEditCheckboxComponent, { static: false }) component: ObservationEditCheckboxComponent
}

describe('ObservationEditCheckboxComponent', () => {
  let component: ObservationEditCheckboxComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, MatFormFieldModule, MatCheckboxModule ],
      declarations: [ObservationEditCheckboxComponent, TestHostComponent ]
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
    expect(component).toBeTruthy();
  })

  it('should not indicate required', () => {
    component.field.required = false
    fixture.detectChanges()
    const checkbox = fixture.nativeElement.querySelector('mat-checkbox')
    const label = checkbox.querySelector('.mat-checkbox-label')
    expect(label.textContent).not.toContain('*')
  })

  it('should indicate required', () => {
    component.field.required = true
    fixture.detectChanges()
    const checkbox = fixture.nativeElement.querySelector('mat-checkbox')
    const label = checkbox.querySelector('.mat-checkbox-label')
    expect(label.textContent).toContain('*')
  })

  it('should not be checked', (done) => {
    component.field.value = false
    fixture.detectChanges()

    fixture.whenStable().then(() => {
      const checkbox = fixture.debugElement.query(By.directive(MatCheckbox)).componentInstance
      expect(checkbox.checked).toBe(false)
      done();
    });
  })

  it('should be checked', (done) => {
    component.field.value = true
    fixture.detectChanges()

    fixture.whenStable().then(() => {
      const checkbox = fixture.debugElement.query(By.directive(MatCheckbox)).componentInstance
      expect(checkbox.checked).toBe(true)
      done();
    });
  })

  it('should show error on invalid and touched', async () => {
    component.field.value = true
    component.field.required = true
    
    const checkbox = fixture.debugElement.query(By.directive(MatCheckbox)).references['checkbox']
    checkbox.control.markAsTouched()

    fixture.detectChanges()
    await fixture.whenStable()

    const error = fixture.debugElement.query(By.directive(MatError))
    expect(error.nativeElement.innerText).toBe(`${component.field.title} is required`)
  })

  it('should not show error on invalid if not touched', async () => {
    component.field.value = true
    component.field.required = true

    fixture.detectChanges()
    await fixture.whenStable()

    const error = fixture.debugElement.query(By.directive(MatError))
    expect(error).toBeNull()
  })
});
