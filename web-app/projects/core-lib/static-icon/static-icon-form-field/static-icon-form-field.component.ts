import { HttpClient } from '@angular/common/http'
import { Component, OnChanges, OnDestroy, SimpleChanges } from '@angular/core'
import { AbstractControl, ControlValueAccessor, FormControl, FormGroup, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator, Validators } from '@angular/forms'
import { DomSanitizer } from '@angular/platform-browser'
import { StaticIcon, StaticIconReference } from '../static-icon.model'
import { StaticIconService } from '../static-icon.service'


@Component({
  selector: 'mage-static-icon-form-field',
  templateUrl: './static-icon-form-field.component.html',
  styleUrls: ['./static-icon-form-field.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: StaticIconFormFieldComponent
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: StaticIconFormFieldComponent
    },
  ]
})
export class StaticIconFormFieldComponent implements OnChanges, OnDestroy, ControlValueAccessor, Validator {

  iconRef: StaticIconReference = null

  form: FormGroup = new FormGroup({
    iconRefToken: new FormControl(null),
    iconRefType: new FormControl(null, Validators.required)
  })
  icon: StaticIcon | null

  private onChange: (iconRef: StaticIconReference) => void = (iconRef: StaticIconReference) => {}
  private onValidatorChange: () => void = () => {}
  private onTouched: () => void = () => {}

  constructor(private iconService: StaticIconService, private httpClient: HttpClient, private sanitizer: DomSanitizer) {
    this.form.valueChanges.subscribe((x: IconRefFormValue) => {
      this.iconRef = iconRefForFormValue(x)
      this.onChange(this.iconRef)
    })
  }

  registerOnValidatorChange?(fn: () => void): void {
    this.onValidatorChange = fn
  }

  ngOnChanges(changes: SimpleChanges) { }

  ngOnDestroy() { }

  onSelectIcon() { }

  writeValue(iconRef: StaticIconReference): void {
    this.iconRef = iconRef
    const formValue = formValueForIconRef(iconRef)
    this.form.setValue(formValue, { emitEvent: false })
    this.resolveIconRef()
  }

  registerOnChange(fn: (x: StaticIconReference | null) => void): void {
    this.onChange = fn
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn
  }

  setDisabledState?(isDisabled: boolean): void {
    if (isDisabled) {
      this.form.disable()
    }
    else {
      this.form.enable()
    }
  }

  validate(control: AbstractControl): ValidationErrors {
    return this.form.errors
  }

  private resolveIconRef() {
    if (!this.iconRef) {
      this.icon = null
      return
    }
    this.iconService.fetchIconByReference(this.iconRef).subscribe(x => {
      this.icon = x
      if (!this.icon) {
        return
      }
    })
  }
}

enum IconRefType {
  Registered = 'id',
  SourceUrl = 'sourceUrl'
}

type IconRefFormValue = {
  iconRefToken: string | null
  iconRefType: IconRefType | null
}

function iconRefForFormValue(x: IconRefFormValue): StaticIconReference | null {
  if (!x.iconRefType) {
    return null
  }
  switch (x.iconRefType) {
    case IconRefType.Registered:
      return { [IconRefType.Registered]: x.iconRefToken }
    case IconRefType.SourceUrl:
      return { [IconRefType.SourceUrl]: x.iconRefToken }
    default:
      throw new Error('invalid icon ref type: ' + x.iconRefToken)
  }
}

function formValueForIconRef(x: StaticIconReference | null): IconRefFormValue {
  if (!x) {
    return {
      iconRefType: null,
      iconRefToken: null
    }
  }
  let iconRefType: IconRefType | null = null
  let iconRefToken: string | null = null
  if (x.hasOwnProperty(IconRefType.Registered)) {
    iconRefType = IconRefType.Registered || null
    iconRefToken = x[IconRefType.Registered] || null
  }
  else if (x.hasOwnProperty(IconRefType.SourceUrl)) {
    iconRefType = IconRefType.SourceUrl || null
    iconRefToken = x[IconRefType.SourceUrl] || null
  }
  return {
    iconRefType,
    iconRefToken
  }
}
