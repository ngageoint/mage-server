import { TestBed, waitForAsync } from '@angular/core/testing'
import { MageArcModule } from '@@main'
import { createNgModule, Injector, NgModuleRef, Type } from '@angular/core'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { PlatformModule } from '@angular/cdk/platform'
import { A11yModule } from '@angular/cdk/a11y'
import { CommonModule } from '@angular/common'
import { ArcService } from './arc.service'
import { HttpClientTestingModule } from '@angular/common/http/testing'

describe('arcgis web-app module', () => {

  let testModule: NgModuleRef<unknown>

  beforeEach(waitForAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        PlatformModule,
        BrowserTestingModule,
        CommonModule,
        HttpClientTestingModule,
        A11yModule,
      ]
    })
    .compileComponents()
    testModule = createNgModule(TestBed.ngModule as Type<any>)
  }))

  it('provides the arcgis service', () => {
    const injector = TestBed.inject(Injector)
    const arcgisModule = createNgModule(MageArcModule, injector)
    const admin = arcgisModule.injector.get(ArcService)
    expect(admin).toBeDefined()
  })
})