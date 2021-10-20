import { JsonSchemaFormModule } from '@ajsf/core'
import { Component, ViewChild } from '@angular/core'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { MatExpansionModule } from '@angular/material/expansion'
import { By } from '@angular/platform-browser'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { JsonSchemaModule } from '../../../../../json-schema/json-schema.module'
import { AdminFeedEditTopicConfigurationComponent } from './admin-feed-edit-topic-configuration.component'

describe('TopicConfigurationComponent', () => {

  @Component({
    selector: 'app-host-component',
    template: `<app-topic-configuration
                [expanded]="expanded"
                [showPrevious]="showPrevious"
                [fetchParametersSchema]="fetchParametersSchema"
                [initialFetchParameters]="initialFetchParameters">
              </app-topic-configuration>`
  })
  class TestHostComponent {
    expanded: boolean
    showPrevious: boolean
    fetchParametersSchema = { properties: { derp: { type: 'number' } } }
    initialFetchParameters = { derp: 100 }

    @ViewChild(AdminFeedEditTopicConfigurationComponent, { static: true })
    public target: AdminFeedEditTopicConfigurationComponent
  }

  let host: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>
  let target: AdminFeedEditTopicConfigurationComponent
  let element: HTMLElement

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        MatExpansionModule,
        JsonSchemaFormModule,
        JsonSchemaModule,
        NoopAnimationsModule
      ],
      declarations: [
        TestHostComponent,
        AdminFeedEditTopicConfigurationComponent,
      ]
    })
    .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    host = fixture.componentInstance
    target = host.target
    element = fixture.nativeElement
  })

  it('should create', () => {
    fixture.detectChanges()
    expect(target).toBeTruthy()
  })

  it('should create but not show the previous button', () => {

    host.showPrevious = false
    fixture.detectChanges()

    expect(element.querySelectorAll('button').length).toEqual(1)
    element.querySelectorAll('button').forEach(button => {
      expect(button.innerText).not.toEqual('Previous')
    })
  })

  it('should create and show the previous button', () => {

    host.showPrevious = true
    fixture.detectChanges()
    expect(element.querySelectorAll('button').length).toEqual(2)
  })

  it('emits fetch parameters changed event', async () => {

    const emitSpy = spyOn(target.fetchParametersChanged, 'emit')
    fixture.detectChanges()
    await fixture.whenStable()
    const input = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement
    input.value = '10'
    input.dispatchEvent(new Event('input'))
    await fixture.whenStable()

    expect(emitSpy).toHaveBeenCalledWith(host.initialFetchParameters)
    expect(emitSpy.calls.mostRecent().args).toEqual([{ derp: 10 }])
  })

  describe('debouncing the change event', () => {

    beforeEach(() => {
      jasmine.clock().install()
    })

    afterEach(() => {
      jasmine.clock().uninstall()
    })

    it('debounces multiple change events', async () => {

      fixture.detectChanges()
      const changed = jasmine.createSpy('fetchParametersChanged')
      target.fetchParametersChanged.subscribe(changed)
      const input = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement
      input.value = '10'
      input.dispatchEvent(new Event('input'))

      expect(changed).not.toHaveBeenCalled()

      jasmine.clock().tick(target.changeDebounceInterval / 2)

      expect(changed).not.toHaveBeenCalled()

      jasmine.clock().tick(target.changeDebounceInterval / 2 + 2)

      expect(changed).toHaveBeenCalledTimes(1)
      expect(changed).toHaveBeenCalledWith({ derp: 10 })
    })
  })

  it('emits fetch parameters accepted', () => {

    spyOn(target.fetchParametersAccepted, 'emit')
    fixture.detectChanges()
    target.finish()

    expect(target.fetchParametersAccepted.emit).toHaveBeenCalledWith(host.initialFetchParameters)
  })

  it('emits cancelled and not accepted', async () => {

    spyOn(target.fetchParametersAccepted, 'emit')
    spyOn(target.fetchParametersChanged, 'emit')
    spyOn(target.cancelled, 'emit')
    fixture.detectChanges()
    await fixture.whenStable()
    target.cancel()

    expect(target.fetchParametersAccepted.emit).not.toHaveBeenCalled()
    expect(target.fetchParametersChanged.emit).toHaveBeenCalledWith(host.initialFetchParameters)
    expect(target.cancelled.emit).toHaveBeenCalledTimes(1)
  })
})
