import { Component, ViewChild } from '@angular/core'
import { async, ComponentFixture, TestBed } from '@angular/core/testing'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatSelectModule } from '@angular/material/select'
import { By } from '@angular/platform-browser'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search'
import { FeedTopic, Service } from '@ngageoint/mage.web-core-lib/feed'
import { AdminFeedEditTopicComponent } from './admin-feed-edit-topic.component'

describe('ChooseServiceTopicComponent', () => {
  @Component({
    selector: 'app-host-component',
    template: `<app-choose-service-topic
      [services]="services" [topics]="topics"
      [selectedService]="selectedService" [selectedTopic]="selectedTopic">
      </app-choose-service-topic>`
  })
  class TestHostComponent {

    services: Service[]
    topics: FeedTopic[]
    selectedService: Service
    selectedTopic: FeedTopic

    @ViewChild(AdminFeedEditTopicComponent, { static: true })
    public chooseServiceTopicComponent: AdminFeedEditTopicComponent
  }

  let fixture: ComponentFixture<TestHostComponent>
  let host: TestHostComponent
  let target: AdminFeedEditTopicComponent
  let element: HTMLElement
  let serviceSelected: jasmine.Spy
  let topicSelected: jasmine.Spy

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatExpansionModule,
        MatSelectModule,
        NgxMatSelectSearchModule,
      ],
      declarations: [
        AdminFeedEditTopicComponent,
        TestHostComponent
      ]
    })
    .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    host = fixture.componentInstance
    target = host.chooseServiceTopicComponent
    element = fixture.nativeElement
    serviceSelected = jasmine.createSpy('serviceSelected')
    topicSelected = jasmine.createSpy('topicSelected')
    target.serviceSelected.subscribe(serviceSelected)
    target.topicSelected.subscribe(topicSelected)
  })

  afterEach(() => {
  })

  it('should create', () => {
    fixture.detectChanges()
    expect(target).toBeTruthy()
  })

  it('sets the service form value from the input selected service', async () => {

    const services: Service[] = [
      {
        id: 'service1',
        serviceType: 'type1',
        summary: 'summary',
        title: 'Hello 1',
        config: {}
      },
      {
        id: 'service2',
        serviceType: 'type1',
        summary: 'summary2',
        title: 'Hello 2',
        config: {}
      }
    ]
    host.services = services
    host.selectedService = services[1]
    fixture.detectChanges()
    await fixture.whenStable()

    expect(element.querySelector('mat-panel-description').innerHTML).toEqual('Hello 2 : ')
    expect(target.selectedService).toEqual(services[1])
    expect(serviceSelected).not.toHaveBeenCalled()
    expect(topicSelected).not.toHaveBeenCalled()
  })

  it('sets the topic form value from the input selected topic', async () => {

    const services: Service[] = [
      {
        id: 'service1',
        serviceType: 'type1',
        summary: 'summary',
        title: 'Hello 1',
        config: {}
      },
      {
        id: 'service2',
        serviceType: 'type1',
        summary: 'summary2',
        title: 'Hello 2',
        config: {}
      }
    ]
    const topics: FeedTopic[] = [
      {
        id: 'topic1',
        title: 'Topic 1'
      },
      {
        id: 'topic2',
        title: 'Topic 2'
      }
    ]
    host.services = services
    host.selectedService = services[0]
    host.topics = topics
    host.selectedTopic = topics[1]
    fixture.detectChanges()
    await fixture.whenStable()

    expect(element.querySelector('mat-panel-description').innerHTML).toEqual('Hello 1 : Topic 2')
    expect(target.selectedService).toEqual(services[0])
    expect(target.selectedTopic).toEqual(topics[1])
    expect(serviceSelected).not.toHaveBeenCalled()
    expect(topicSelected).not.toHaveBeenCalled()
  })

  it('emits service selected when form value changes', async () => {

    const services: Service[] = [
      { id: 'service1', serviceType: 'type1', summary: 'summary', title: 'Service 1', config: {} },
      { id: 'service2', serviceType: 'type1', summary: 'summary2', title: 'Service 2', config: {} }
    ]
    const topics: FeedTopic[] = [
      { id: 'topic1', title: 'Topic 1' },
      { id: 'topic2', title: 'Topic 2' }
    ]
    host.services = services
    host.selectedService = services[0]
    host.topics = topics
    host.selectedTopic = topics[1]
    fixture.detectChanges()
    await fixture.whenStable()

    const serviceSelect = fixture.debugElement.query(By.css('.service-select .mat-select-trigger'))
    serviceSelect.triggerEventHandler('click', null)
    fixture.detectChanges()
    const options = fixture.debugElement.queryAll(By.css('.mat-option'))
    options[1].triggerEventHandler('click', null)
    await fixture.whenStable()
    fixture.detectChanges()

    expect(element.querySelector('mat-panel-description').innerHTML).toEqual('Service 2 : ')
    expect(target.selectedService).toEqual(services[1])
    expect(serviceSelected).toHaveBeenCalledTimes(1)
  })

  it('emits topic selected when form value changes', async () => {

    const services: Service[] = [
      { id: 'service1', serviceType: 'type1', summary: 'summary', title: 'Service 1', config: {} },
      { id: 'service2', serviceType: 'type1', summary: 'summary2', title: 'Service 2', config: {} }
    ]
    const topics: FeedTopic[] = [
      { id: 'topic1', title: 'Topic 1' },
      { id: 'topic2', title: 'Topic 2' }
    ]
    host.services = services
    host.selectedService = services[0]
    host.topics = topics
    host.selectedTopic = topics[1]
    fixture.detectChanges()
    await fixture.whenStable()

    const topicSelect = fixture.debugElement.query(By.css('.topic-select .mat-select-trigger'))
    topicSelect.triggerEventHandler('click', null)
    fixture.detectChanges()
    const options = fixture.debugElement.queryAll(By.css('.mat-option'))
    options[0].triggerEventHandler('click', null)
    await fixture.whenStable()
    fixture.detectChanges()

    expect(element.querySelector('mat-panel-description').innerHTML).toEqual('Service 1 : Topic 1')
    expect(target.selectedService).toEqual(services[0])
    expect(target.selectedTopic).toEqual(topics[0])
    expect(serviceSelected).not.toHaveBeenCalled()
    expect(topicSelected).toHaveBeenCalledTimes(1)
  })

  it('changes selected topic to null before changing selected service from form', async () => {

    const services: Service[] = [
      { id: 'service1', serviceType: 'type1', summary: 'summary', title: 'Service 1', config: {} },
      { id: 'service2', serviceType: 'type1', summary: 'summary2', title: 'Service 2', config: {} }
    ]
    const topics: FeedTopic[] = [
      { id: 'topic1', title: 'Topic 1' },
      { id: 'topic2', title: 'Topic 2'}
    ]
    host.services = services
    host.selectedService = services[0]
    host.topics = topics
    host.selectedTopic = topics[1]
    fixture.detectChanges()
    await fixture.whenStable()

    const changes: { type: 'service' | 'topic', id: string }[] = []
    serviceSelected.and.callFake(id => {
      changes.push({ type: 'service', id })
    })
    topicSelected.and.callFake(id => {
      changes.push({ type: 'topic', id })
    })

    const serviceSelect = fixture.debugElement.query(By.css('.service-select .mat-select-trigger'))
    serviceSelect.triggerEventHandler('click', null)
    fixture.detectChanges()
    const options = fixture.debugElement.queryAll(By.css('.mat-option'))
    options[1].triggerEventHandler('click', null)
    await fixture.whenStable()
    fixture.detectChanges()

    expect(element.querySelector('mat-panel-description').innerHTML).toEqual('Service 2 : ')
    expect(target.selectedService).toEqual(services[1])
    expect(target.selectedTopic).toBeNull()
    expect(serviceSelected).toHaveBeenCalledTimes(1)
    expect(topicSelected).toHaveBeenCalledTimes(1)
    expect(topicSelected)
  })

  it('auto-selects the service if only one exists', async () => {

    const service: Service = {
      id: 'highlander',
      serviceType: 'type1',
      summary: 'There can be only one',
      title: 'Highlander',
      config: {}
    }
    host.services = [ service ]
    fixture.detectChanges()
    await fixture.whenStable()

    expect(target.selectedService).toEqual(service)
    expect(element.querySelector('mat-panel-description').innerHTML).toEqual('Highlander : ')
    expect(serviceSelected).toHaveBeenCalledTimes(1)
    expect(topicSelected).not.toHaveBeenCalled()
  })

  it('does not auto-select service if the selected service changes at the same time as service list', async () => {

    const service: Service = {
      id: 'highlander',
      serviceType: 'type1',
      summary: 'There can be only one',
      title: 'Highlander',
      config: {}
    }
    host.services = [ service ]
    host.selectedService = service
    fixture.detectChanges()
    await fixture.whenStable()

    expect(target.selectedService).toEqual(service)
    expect(element.querySelector('mat-panel-description').innerHTML).toEqual('Highlander : ')
    expect(serviceSelected).not.toHaveBeenCalled()
    expect(topicSelected).not.toHaveBeenCalled()
  })

  it('auto-selects the topic if only one exists', async () => {

    const topic: FeedTopic = { id: 't1', title: 'Topic 1' }
    host.topics = [ topic ]
    fixture.detectChanges()

    expect(target.selectedTopic).toEqual(topic)
    expect(topicSelected).toHaveBeenCalledTimes(1)
  })

  it('does not auto-select a single topic if the selected topic changes at the same as the topic list', async () => {

    const topic: FeedTopic = { id: 't1', title: 'Topic 1' }
    host.topics = [ topic ]
    host.selectedTopic = topic
    fixture.detectChanges()

    expect(target.selectedTopic).toEqual(topic)
    expect(topicSelected).not.toHaveBeenCalled()
  })

  it('replaces selected service with matching service from new service list', async () => {

    const services1: Service[] = [
      { id: 'service1', title: 'Service 1', summary: 'Testing service 1',  config: {}, serviceType: 'type1' },
      { id: 'service2', title: 'Service 2', summary: 'Testing service 2',  config: {}, serviceType: 'type1' }
    ]
    host.services = services1
    host.selectedService = services1[0]
    fixture.detectChanges()
    await fixture.whenStable()

    expect(target.services).toBe(services1)
    expect(target.selectedService).toBe(services1[0])

    const services2: Service[] = [
      { ...services1[0], title: 'Service 1 Mod' },
      { ...services1[1] }
    ]
    host.services = services2
    fixture.detectChanges()
    await fixture.whenStable()

    expect(target.services).toBe(services2)
    expect(target.selectedService).not.toBe(services1[0])
    expect(target.selectedService).toBe(services2[0])
    expect(serviceSelected).not.toHaveBeenCalled()
  })

  it('replaces selected topic with matching topic from new topic list', async () => {

    const services: Service[] = [
      { id: 'service1', title: 'Service 1', summary: 'Testing service 1',  config: {}, serviceType: 'type1' },
      { id: 'service2', title: 'Service 2', summary: 'Testing service 2',  config: {}, serviceType: 'type1' }
    ]
    const topics1: FeedTopic[] = [
      { id: 't1', title: 'Topic 1' },
      { id: 't2', title: 'Topic 2' }
    ]
    host.services = services
    host.selectedService = services[0]
    host.topics = topics1
    host.selectedTopic = topics1[1]
    fixture.detectChanges()
    await fixture.whenStable()

    expect(target.topics).toBe(topics1)
    expect(target.selectedTopic).toBe(topics1[1])

    const topics2: FeedTopic[] = [
      { ...topics1[0] },
      { ...topics1[1], title: 'Topic 2 Mod' }
    ]
    host.topics = topics2
    fixture.detectChanges()
    await fixture.whenStable()

    expect(target.topics).toBe(topics2)
    expect(target.selectedTopic).not.toBe(topics1[1])
    expect(target.selectedTopic).toBe(topics2[1])
    expect(topicSelected).not.toHaveBeenCalled()
  })

  /*
  the following tests are disabled because assuming the host component is
  setting valid states for this component's inputs is easier should be a valid
  assumption.  the FeedEditService should ensure that state is always correct.
  */

  xit('sets null selected service, topic list, and selected topic when only service list changes', async () => {

    const services1: Service[] = [
      { id: 'service1', title: 'Service 1', summary: 'Testing service 1',  config: {}, serviceType: 'type1' },
      { id: 'service2', title: 'Service 2', summary: 'Testing service 2',  config: {}, serviceType: 'type1' }
    ]
    const topics: FeedTopic[] = [
      { id: 't1', title: 'Topic 1' },
      { id: 't2', title: 'Topic 2' }
    ]
    host.services = services1
    host.topics = topics
    host.selectedService = services1[0]
    host.selectedTopic = topics[0]
    fixture.detectChanges()

    expect(target.services).toBe(services1)
    expect(target.selectedService).toBe(services1[0])
    expect(target.topics).toBe(topics)
    expect(target.selectedTopic).toBe(topics[0])

    const services2 = [ { ...services1[0] }, { ...services1[1] } ]
    host.services = services2
    fixture.detectChanges()

    expect(target.services).toBe(services2)
    expect(target.selectedService).toBeNull()
    expect(target.topics).toBeNull()
    expect(target.selectedTopic).toBeNull()
    expect(serviceSelected).not.toHaveBeenCalled()
    expect(topicSelected).not.toHaveBeenCalled()
  })

  xit('sets null topic list and selected topic when service list and selected service changes', async () => {

    const services1: Service[] = [
      { id: 'service1', title: 'Service 1', summary: 'Testing service 1',  config: {}, serviceType: 'type1' },
      { id: 'service2', title: 'Service 2', summary: 'Testing service 2',  config: {}, serviceType: 'type1' }
    ]
    const topics: FeedTopic[] = [
      { id: 't1', title: 'Topic 1' },
      { id: 't2', title: 'Topic 2' }
    ]
    host.services = services1
    host.topics = topics
    host.selectedService = services1[0]
    host.selectedTopic = topics[0]
    fixture.detectChanges()

    expect(target.services).toBe(services1)
    expect(target.selectedService).toBe(services1[0])
    expect(target.topics).toBe(topics)
    expect(target.selectedTopic).toBe(topics[0])

    const services2 = [ { ...services1[0] }, { ...services1[1] } ]
    host.services = services2
    host.selectedService = services2[1]
    fixture.detectChanges()

    expect(target.services).toBe(services2)
    expect(target.selectedService).toBe(services2[1])
    expect(target.topics).toBeNull()
    expect(target.selectedTopic).toBeNull()
    expect(serviceSelected).not.toHaveBeenCalled()
    expect(topicSelected).not.toHaveBeenCalled()
  })

  xit('sets null topic list and selected topic when selected service changes', async () => {

    const services: Service[] = [
      { id: 'service1', title: 'Service 1', summary: 'Testing service 1',  config: {}, serviceType: 'type1' },
      { id: 'service2', title: 'Service 2', summary: 'Testing service 2',  config: {}, serviceType: 'type1' }
    ]
    const topics: FeedTopic[] = [
      { id: 't1', title: 'Topic 1' },
      { id: 't2', title: 'Topic 2' }
    ]
    host.services = services
    host.topics = topics
    host.selectedService = services[0]
    host.selectedTopic = topics[0]
    fixture.detectChanges()

    expect(target.services).toBe(services)
    expect(target.selectedService).toBe(services[0])
    expect(target.topics).toBe(topics)
    expect(target.selectedTopic).toBe(topics[0])

    host.selectedService = services[1]
    fixture.detectChanges()

    expect(target.services).toBe(services)
    expect(target.selectedService).toBe(services[1])
    expect(target.topics).toBeNull()
    expect(target.selectedTopic).toBeNull()
    expect(serviceSelected).not.toHaveBeenCalled()
    expect(topicSelected).not.toHaveBeenCalled()
  })
})
