import { Component, ViewChild } from '@angular/core'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatCheckbox, MatCheckboxModule } from '@angular/material/checkbox';
import { MatError, MatFormFieldModule } from '@angular/material/form-field';
import { By } from '@angular/platform-browser'
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { ObservationEditCheckboxComponent } from './observation-edit-checkbox.component'

@Component({
  selector: `host-component`,
  template: `<observation-edit-checkbox [definition]="definition" [formGroup]="formGroup"></observation-edit-checkbox>`
})
class TestHostComponent {
  formGroup = new FormGroup({
    checkbox: new FormControl(true, Validators.required)
  });
  definition = {
    name: 'checkbox',
    title: 'Checkbox Field',
    required: true
  }

  @ViewChild(ObservationEditCheckboxComponent) component: ObservationEditCheckboxComponent
}

let loader: HarnessLoader;

describe('ObservationEditCheckboxComponent', () => {
  let component: ObservationEditCheckboxComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatCheckboxModule ],
      declarations: [ObservationEditCheckboxComponent, TestHostComponent ]
    })
    .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    loader = TestbedHarnessEnvironment.loader(fixture);
    hostComponent = fixture.componentInstance
    fixture.detectChanges();
    component = hostComponent.component
  })

  it('should create', () => {
    expect(component).toBeTruthy();
  })

  it('should not indicate required', () => {
    component.definition.required = false
    fixture.detectChanges()
    const checkbox = fixture.nativeElement.querySelector('mat-checkbox')
    const label = checkbox.querySelector('.mat-checkbox-label')
    expect(label.textContent).not.toContain('*')
  })

  it('should indicate required', () => {
    component.definition.required = true
    fixture.detectChanges()
    const checkbox = fixture.nativeElement.querySelector('mat-checkbox')
    const label = checkbox.querySelector('.mat-checkbox-label')
    expect(label.textContent).toContain('*')
  })

  it('should not be checked', (done) => {
    component.definition.value = false
    fixture.detectChanges()

    fixture.whenStable().then(() => {
      const checkbox = fixture.debugElement.query(By.directive(MatCheckbox)).componentInstance
      expect(checkbox.checked).toBeFalsy
      done();
    });
  })

  it('should be checked', (done) => {
    component.definition.value = true
    fixture.detectChanges()

    fixture.whenStable().then(() => {
      const checkbox = fixture.debugElement.query(By.directive(MatCheckbox)).componentInstance
      expect(checkbox.checked).toBeTruthy
      done();
    });
  })

  it('should show error on invalid and touched', async () => {
    const checkboxes = await loader.getAllHarnesses(MatCheckboxHarness);
    component.definition.value = true
    component.definition.required = true
    checkboxes[0].toggle()

    fixture.detectChanges()
    await fixture.whenStable()

    const error = fixture.debugElement.query(By.directive(MatError)).query(By.css('span'))
    expect(error.nativeElement.attributes.getNamedItem('hidden')).toBeTruthy()
  })

  it('should not show error on invalid if not touched', async () => {
    component.definition.value = false
    component.definition.required = true

    fixture.detectChanges()
    await fixture.whenStable()

    const error = fixture.debugElement.query(By.directive(MatError)).query(By.css('span'))
    expect(error.nativeElement.attributes.getNamedItem('hidden')).toBeTruthy()
  })
});
