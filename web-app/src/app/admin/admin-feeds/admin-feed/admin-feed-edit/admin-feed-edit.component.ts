import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Service } from '@ngageoint/mage.web-core-lib/feed';
import { AdminBreadcrumb } from '../../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../../admin-breadcrumb/admin-breadcrumb.service';
import { FeedEditState, FeedMetaData } from './feed-edit.model';
import { FeedEditService } from './feed-edit.service';

@Component({
    selector: 'app-feed-edit',
    templateUrl: './admin-feed-edit.component.html',
    styleUrls: ['./admin-feed-edit.component.scss'],
    providers: [FeedEditService],
    standalone: false
})
export class AdminFeedEditComponent implements OnInit {
  private _breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Feeds',
    icon: 'rss_feed',
    route: ['/admin/feeds']
  }];
  set breadcrumbs(value: AdminBreadcrumb[]) {
    this._breadcrumbs = value;
    this.breadcrumbService.setBreadcrumbs(value);
  }
  get breadcrumbs(): AdminBreadcrumb[] {
    return this._breadcrumbs;
  }

  step = 0;
  hasFeedDeletePermission = false;

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
  };

  private feedId: string | null = null;

  constructor(
    private feedEdit: FeedEditService,
    private route: ActivatedRoute,
    private router: Router,
    private breadcrumbService: AdminBreadcrumbService
  ) {
    this.feedId = this.route.snapshot.paramMap.get('feedId');

    if (this.feedId) {
      this.breadcrumbs = this.breadcrumbs.concat([{ title: '' }, { title: 'Edit' }]);
    } else {
      this.breadcrumbs.push({ title: 'New' });
      this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    }
  }

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);

    this.feedEdit.state$.subscribe((x) => {
      const nextOriginalFeed = x.originalFeed;

      if (nextOriginalFeed && !this.editState.originalFeed) {
        this.breadcrumbs[1] = {
          title: nextOriginalFeed.title,
          route: ['/admin/feeds', nextOriginalFeed.id]
        };
        this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
        this.step = 1;
      }

      this.editState = x;
    });

    if (this.feedId) {
      this.feedEdit.editFeed(this.feedId);
    } else {
      this.feedEdit.newFeed();
    }
  }

  noServicesExist(): void {
    this.setStep(0);
  }

  serviceCreationCancelled(): void {
    this.setStep(0);
  }

  serviceCreated(service: Service): void {
    this.feedEdit.serviceCreated(service);
    this.setStep(0);
  }

  itemPropertiesSchemaToTitleMap(value: any): any {
    if (!value?.schema) return;
    return {
      name: value.schema.title,
      value: value.key
    };
  }

  onServiceSelected(serviceId: string): void {
    this.feedEdit.selectService(serviceId);
  }

  onTopicSelected(topicId: string): void {
    this.feedEdit.selectTopic(topicId);
    if (topicId) {
      this.nextStep();
    }
  }

  onFetchParametersAccepted(fetchParameters: any): void {
    this.nextStep();
  }

  onFetchParametersChanged(fetchParameters: any): void {
    this.feedEdit.fetchParametersChanged(fetchParameters);
  }

  onItemPropertiesSchemaChanged(itemProperties: any): void {
    this.feedEdit.itemPropertiesSchemaChanged(itemProperties);
  }

  onItemPropertiesSchemaAccepted(): void {
    this.nextStep();
  }

  onFeedMetaDataChanged(metaData: FeedMetaData): void {
    this.feedEdit.feedMetaDataChanged(metaData);
  }

  onFeedMetaDataAccepted(metaData: FeedMetaData): void {
    if (metaData) {
      this.feedEdit.feedMetaDataChanged(metaData);
    }

    this.feedEdit.saveFeed().subscribe((feed) => {
      this.router.navigate(['/admin/feeds', feed.id]);
    });
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
}
