import { HttpClientTestingModule } from '@angular/common/http/testing'
import { Component } from '@angular/core'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { By } from '@angular/platform-browser'
import { of } from 'rxjs'
import { MageCommonModule } from '@ngageoint/mage.web-core-lib/common'
import { StaticIcon, StaticIconReference } from '../static-icon.model'
import { StaticIconService } from '../static-icon.service'
import { StaticIconFormFieldComponent } from './static-icon-form-field.component'

@Component({
  selector: 'test-host',
  template: `<form [formGroup]="form"><mage-static-icon-form-field formControlName="icon"></mage-static-icon-form-field></form>`
})
class TestHostComponent {

  form = new FormGroup({
    icon: new FormControl(null)
  })
}

describe('StaticIconFormFieldComponent', () => {

  let host: TestHostComponent
  let target: StaticIconFormFieldComponent
  let fixture: ComponentFixture<TestHostComponent>
  let iconService: jasmine.SpyObj<StaticIconService>

  beforeEach(async(() => {

    iconService = jasmine.createSpyObj<StaticIconService>('MockStaticIconService', [
      'fetchIconByReference'
    ])
    iconService.fetchIconByReference.and.returnValue(of(null))

    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        MageCommonModule,
        HttpClientTestingModule
      ],
      declarations: [
        StaticIconFormFieldComponent,
        TestHostComponent
      ],
      providers: [
        {
          provide: StaticIconService,
          useValue: iconService
        }
      ]
    })
    .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    host = fixture.componentInstance
    target = fixture.debugElement.query(By.directive(StaticIconFormFieldComponent)).componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(target).toBeTruthy()
  })

  it('accepts value from host', () => {

    const icon: StaticIconReference = { id: 'icon1' }
    host.form.setValue({ icon })

    expect(target.iconRef).toEqual(icon)
  })

  it('fetches the icon by reference when ref changes', () => {

    const icon: StaticIcon = {
      id: 'icon1',
      sourceUrl: 'test://icon1.png',
      contentPath: '/icons/icon1'
    }
    const iconRef: StaticIconReference = { id: 'icon1' }
    iconService.fetchIconByReference.withArgs(iconRef).and.returnValue(of(icon))
    host.form.setValue({ icon: iconRef })

    expect(target.icon).toEqual(icon)
    expect(iconService.fetchIconByReference).toHaveBeenCalledTimes(1)
    expect(iconService.fetchIconByReference).toHaveBeenCalledWith(iconRef)
  })
})