import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core'
import { AbstractControl, ControlValueAccessor, UntypedFormControl, UntypedFormGroup, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator, Validators } from '@angular/forms'
import { StaticIconReference } from '../static-icon.model'
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
    ],
    standalone: false
})
export class StaticIconFormFieldComponent implements OnChanges, OnDestroy, ControlValueAccessor, Validator {

  iconRef: StaticIconReference = null

  @Input()
  accessToken: string | null = null

  form: UntypedFormGroup = new UntypedFormGroup({
    iconRefToken: new UntypedFormControl(null),
    iconRefType: new UntypedFormControl(null, Validators.required)
  })
  iconContentPath: string | null
  iconSrc: string | null = null

  private updateIconSrc(): void {
    this.iconSrc = !this.iconContentPath || this.iconContentPath.startsWith('data:') || !this.accessToken
      ? this.iconContentPath
      : `${this.iconContentPath}?access_token=${encodeURIComponent(this.accessToken)}`
  }

  private onChange = (iconRef: StaticIconReference) => {}
  private onValidatorChange: () => void = () => {}
  private onTouched: () => void = () => {}

  constructor(
    private iconService: StaticIconService,
    private ref: ChangeDetectorRef
  ) {
    this.form.valueChanges.subscribe((x: IconRefFormValue) => {
      this.iconRef = iconRefForFormValue(x)
      this.onChange(this.iconRef)
    })
  }

  registerOnValidatorChange?(fn: () => void): void {
    this.onValidatorChange = fn
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.accessToken) {
      this.updateIconSrc()
    }
  }

  ngOnDestroy() { }

  onSelectIcon($event: any) {
    const inputElement = $event.target as HTMLInputElement
    const files = inputElement.files
    if (files && files.length) {
      this.updateValue({ file: files[0] }, true)
    }
  }

  writeValue(iconRef: StaticIconReference): void {
    this.updateValue(iconRef, false)
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

  private updateValue(iconRef: StaticIconReference, emitEvent: boolean = false) {
    this.iconRef = iconRef
    const formValue = formValueForIconRef(iconRef)
    this.form.setValue(formValue, { emitEvent })
    this.resolveIconRef()
  }

  validate(control: AbstractControl): ValidationErrors {
    return this.form.errors
  }

  private resolveIconRef() {
    if (!this.iconRef) {
      this.iconContentPath = null
      this.updateIconSrc()
      return
    }

    if (this.iconRef.file) {
      const reader = new FileReader()
      reader.onload = (): void => {
        this.iconContentPath = reader.result as string
        this.updateIconSrc()
      }
      reader.readAsDataURL(this.iconRef.file)
    } else {
      this.iconService.fetchIconByReference(this.iconRef).subscribe(x => {
        this.iconContentPath = x ? x.contentPath : null
        this.updateIconSrc()
      })
    }
  }
}

enum IconRefType {
  Registered = 'id',
  SourceUrl = 'sourceUrl',
  File = 'file'
}

type IconRefFormValue = {
  iconRefToken: File | string | null
  iconRefType: IconRefType | null
}

function iconRefForFormValue(x: IconRefFormValue): StaticIconReference | null {
  if (!x.iconRefType) {
    return null
  }
  switch (x.iconRefType) {
    case IconRefType.Registered:
      return { [IconRefType.Registered]: x.iconRefToken as string }
    case IconRefType.SourceUrl:
      return { [IconRefType.SourceUrl]: x.iconRefToken as string }
    case IconRefType.File:
      return { [IconRefType.File]: x.iconRefToken as File }
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
  let iconRefToken: File | string | null = null
  if (x.hasOwnProperty(IconRefType.Registered)) {
    iconRefType = IconRefType.Registered || null
    iconRefToken = x[IconRefType.Registered] || null
  } else if (x.hasOwnProperty(IconRefType.SourceUrl)) {
    iconRefType = IconRefType.SourceUrl || null
    iconRefToken = x[IconRefType.SourceUrl] || null
  } else if (x.hasOwnProperty(IconRefType.File)) {
    iconRefType = IconRefType.File || null
    iconRefToken = x[IconRefType.File] || null
  }

  return {
    iconRefType,
    iconRefToken
  }
}
