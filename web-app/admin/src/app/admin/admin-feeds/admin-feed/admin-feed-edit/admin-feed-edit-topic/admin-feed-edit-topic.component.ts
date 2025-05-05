import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core'
import { FeedTopic, Service } from '@ngageoint/mage.web-core-lib/feed'

@Component({
  selector: 'app-choose-service-topic',
  templateUrl: './admin-feed-edit-topic.component.html',
  styleUrls: ['./admin-feed-edit-topic.component.scss']
})
export class AdminFeedEditTopicComponent implements OnInit, OnChanges {

  @Input() services?: Service[] | null
  @Input() topics?: FeedTopic[] | null
  @Input() selectedService?: Service | null = null
  @Input() selectedTopic?: FeedTopic | null = null
  @Input() expanded: boolean
  @Output() serviceSelected = new EventEmitter<string>()
  @Output() topicSelected = new EventEmitter<string>()
  @Output() opened = new EventEmitter()

  constructor() {}

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.services) {
      if (this.services) {
        if (changes.selectedService) {
          if (!this.selectedService && this.services.length === 1) {
            this.selectedService = this.services[0]
            this.onServiceSelected()
          }
        }
        else if (this.selectedService) {
          const updatedService = this.services.find(x => x.id === this.selectedService.id)
          if (updatedService) {
            this.selectedService = updatedService
          }
        }
      }
    }
    if (changes.topics) {
      if (this.topics) {
        if (changes.selectedTopic) {
          if (!this.selectedTopic && this.topics.length === 1) {
            this.selectedTopic = this.topics[0]
            this.onTopicSelected()
          }
        }
        else if (this.selectedTopic) {
          const updatedTopic = this.topics.find(x => x.id === this.selectedTopic.id)
          if (updatedTopic) {
            this.selectedTopic = updatedTopic
          }
        }
      }
    }
  }

  onServiceSelected(): void {
    if (this.selectedTopic) {
      this.selectedTopic = null
      this.onTopicSelected()
    }
    this.serviceSelected.emit(this.selectedService ? this.selectedService.id : null)
  }

  onTopicSelected(): void {
    this.topicSelected.emit(this.selectedTopic ? this.selectedTopic.id : null)
  }
}
