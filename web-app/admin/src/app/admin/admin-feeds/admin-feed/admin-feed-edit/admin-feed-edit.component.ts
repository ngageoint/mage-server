import { Component, OnInit } from '@angular/core';
import { StateService } from '@uirouter/angular';
import * as _ from 'underscore';
import { Service } from '@ngageoint/mage.web-core-lib/feed';
import { AdminBreadcrumb } from '../../../admin-breadcrumb/admin-breadcrumb.model';
import { FeedEditState, FeedMetaData } from './feed-edit.model'
import { FeedEditService } from './feed-edit.service'

@Component({
  selector: 'app-feed-edit',
  templateUrl: './admin-feed-edit.component.html',
  styleUrls: ['./admin-feed-edit.component.scss'],
  providers: [FeedEditService]
})
export class AdminFeedEditComponent implements OnInit {
  breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Feeds',
    icon: 'rss_feed',
    state: {
      name: 'admin.feeds'
    }
  }]
  step = 0;
  hasFeedDeletePermission: boolean;
  editState: FeedEditState = {
    originalFeed: null,
    availableServices: [],
    selectedService: null,
    availableTopics: [],
    selectedTopic: null,
    fetchParameters: null,
    itemPropertiesSchema: null,
    feedMetaData: null,
    preview: null
  }

  constructor(
    private feedEdit: FeedEditService,
    private stateService: StateService
  ) {
    if (this.stateService.params.feedId) {
      this.breadcrumbs = this.breadcrumbs.concat([
        { title: '' },
        { title: 'Edit' }
      ]);
    }
    else {
      this.breadcrumbs.push({ title: 'New' })
    }
  }

  ngOnInit(): void {
    this.feedEdit.state$.subscribe(x => {
      const nextOriginalFeed = x.originalFeed
      if (nextOriginalFeed && !this.editState.originalFeed) {
        this.breadcrumbs[1] = {
          title: nextOriginalFeed.title,
          state: {
            name: 'admin.feed',
            params: {
              feedId: nextOriginalFeed.id
            }
          }
        }
        this.step = 1;
      }
      this.editState = x
    })
    if (this.stateService.params.feedId) {
      this.feedEdit.editFeed(this.stateService.params.feedId)
    }
    else {
      this.feedEdit.newFeed()
    }
  }

  noServicesExist(): void {
    this.setStep(0);
  }

  serviceCreationCancelled(): void {
    this.setStep(0);
  }

  serviceCreated(service: Service): void {
    this.feedEdit.serviceCreated(service)
    this.setStep(0);
  }

  itemPropertiesSchemaToTitleMap(value: any): any {
    if (!value.schema) {
      return;
    }
    return {
      name: value.schema.title,
      value: value.key
    };
  }

  onServiceSelected(serviceId: string): void {
    this.feedEdit.selectService(serviceId)
  }

  onTopicSelected(topicId: string): void {
    this.feedEdit.selectTopic(topicId)
    if (topicId) {
      this.nextStep();
    }
  }

  onFetchParametersAccepted(fetchParameters: any): void {
    this.nextStep()
  }

  onFetchParametersChanged(fetchParameters: any): void {
    this.feedEdit.fetchParametersChanged(fetchParameters)
  }

  onItemPropertiesSchemaChanged(itemProperties: any): void {
    this.feedEdit.itemPropertiesSchemaChanged(itemProperties)
  }

  onItemPropertiesSchemaAccepted(): void {
    this.nextStep();
  }

  onFeedMetaDataChanged(metaData: FeedMetaData): void {
    this.feedEdit.feedMetaDataChanged(metaData)
  }

  onFeedMetaDataAccepted(metaData: FeedMetaData): void {
    if (metaData) {
      this.feedEdit.feedMetaDataChanged(metaData)
    }
    this.feedEdit.saveFeed().subscribe(feed => {
      this.stateService.go('admin.feed', { feedId: feed.id })
    })
  }

  setStep(index: number): void {
    this.step = index;
  }

  nextStep(): void {
    this.step++;
  }

  prevStep(): void {
    this.step--;
  }

  goToFeeds(): void {
    this.stateService.go('admin.feeds');
  }
}
