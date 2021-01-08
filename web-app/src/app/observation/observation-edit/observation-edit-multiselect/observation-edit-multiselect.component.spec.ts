import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'

import { ObservationEditMultiselectComponent } from './observation-edit-multiselect.component'
import { MatInputModule, MatAutocompleteModule, MatChipsModule, MatIconModule, MatFormFieldModule, MatChipInputEvent, MatChipList, MatError } from '@angular/material'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { By } from '@angular/platform-browser'

describe('ObservationEditMultiselectComponent', () => {
  let component: ObservationEditMultiselectComponent
  let fixture: ComponentFixture<ObservationEditMultiselectComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, BrowserAnimationsModule, ReactiveFormsModule, MatInputModule, MatAutocompleteModule, MatChipsModule, MatIconModule, MatFormFieldModule ],
      declarations: [ObservationEditMultiselectComponent ],
      schemas: [ CUSTOM_ELEMENTS_SCHEMA ]
    })
    .compileComponents()
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationEditMultiselectComponent);
    component = fixture.componentInstance;
    component.field = {
      name: 'field1',
      required: false,
      title: 'Colors',
      choices: [{
        title: 'red'
      }, {
        title: 'green'
      }, {
        title: 'blue'
      }]
    }

    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should not indicate required', () => {
    component.field.required = false
    fixture.detectChanges()
    const select = fixture.debugElement.query(By.directive(MatChipList)).componentInstance
    expect(select.required).toBeFalsy()
  })

  it('should indicate required', () => {
    component.field.required = true
    fixture.detectChanges()
    const select = fixture.debugElement.query(By.directive(MatChipList)).componentInstance
    expect(select.required).toBeTruthy()
  })

  it('should select choice', () => {
    const event: any = {
      option: {
        value: 'red'
      }
    }

    component.selected(event)

    expect(component.field.value).toEqual(['red'])
  })

  it('should add choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'red'
    }
    component.add(event)

    expect(component.field.value).toEqual(['red'])
  })

  it('should not add invalid choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'purple'
    }
    component.add(event)

    expect(component.field.value).toBeUndefined()
  })

  it('should not add duplicate choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'red'
    }
    component.add(event)
    component.add(event)

    expect(component.field.value).toEqual(['red'])
  })

  it('should remove choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'red'
    }
    component.add(event)
    component.remove('red')

    expect(component.field.value).toBeUndefined()
  })

  it('should not remove non existing choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'red'
    }
    component.add(event)
    component.remove('blue')

    expect(component.field.value).toEqual(['red'])
  })

  it('should show error on invalid and touched', async () => {
    component.field.required = true

    const input = fixture.debugElement.query(By.directive(MatChipList)).references['dropdown']
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
