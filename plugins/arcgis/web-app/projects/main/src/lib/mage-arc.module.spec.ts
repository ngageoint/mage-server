import { TestBed, waitForAsync } from '@angular/core/testing'
import { ArcAdminComponent, MageArcModule } from '@@main'
import { createComponent, createNgModule, Injector, NgModuleRef, PLATFORM_ID, Type } from '@angular/core'
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing'
import { BrowserAnimationsModule, NoopAnimationsModule } from '@angular/platform-browser/animations'
import { MatCommonModule } from '@angular/material/core'
import { Platform, PlatformModule } from '@angular/cdk/platform'
import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing'
import { A11yModule, HighContrastModeDetector } from '@angular/cdk/a11y'
import { CommonModule } from '@angular/common'
import { BrowserModule } from '@angular/platform-browser'
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