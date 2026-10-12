import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SlicePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { Service } from '@ngageoint/mage.web-core-lib/feed';
import { FeedIconModule } from '@ngageoint/mage.web-core-lib/feed/feed-icon';
import { AdminBreadcrumb } from '../../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../../admin-breadcrumb/admin-breadcrumb.service';
import { FeedEditState, FeedMetaData } from './feed-edit.model';
import { FeedEditService } from './feed-edit.service';
import { AdminServiceEditComponent } from '../../admin-service/admin-service-edit/admin-service-edit.component';
import { AdminFeedEditTopicComponent } from './admin-feed-edit-topic/admin-feed-edit-topic.component';
import { AdminFeedEditTopicConfigurationComponent } from './admin-feed-edit-topic/admin-feed-edit-topic-configuration.component';
import { AdminFeedEditItemPropertiesComponent } from './admin-feed-edit-item-properties/admin-feed-edit-item-properties.component';
import { AdminFeedEditConfigurationComponent } from './admin-feed-edit-configuration.component';
import { FeedItemSummaryModule } from '../../../../feed/feed-item/feed-item-summary/feed-item-summary.module';

@Component({
    selector: 'app-feed-edit',
    templateUrl: './admin-feed-edit.component.html',
    styleUrls: ['./admin-feed-edit.component.scss'],
    providers: [FeedEditService],
    imports: [
        SlicePipe,
        MatExpansionModule,
        MatCardModule,
        MatListModule,
        MatIconModule,
        FeedIconModule,
        AdminServiceEditComponent,
        AdminFeedEditTopicComponent,
        AdminFeedEditTopicConfigurationComponent,
        AdminFeedEditItemPropertiesComponent,
        AdminFeedEditConfigurationComponent,
        FeedItemSummaryModule
    ]
})
export class AdminFeedEditComponent implements OnInit {
  private readonly feedEdit = inject(FeedEditService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly breadcrumbService = inject(AdminBreadcrumbService);
  private readonly destroyRef = inject(DestroyRef);

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

  readonly editState = signal<FeedEditState>({
    originalFeed: null,
    availableServices: [],
    selectedService: null,
    availableTopics: [],
    selectedTopic: null,
    fetchParameters: null,
    itemPropertiesSchema: null,
    feedMetaData: null,
    preview: null
  });

  private feedId: string | null = null;

  constructor() {
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

    this.feedEdit.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((x) => {
        const nextOriginalFeed = x.originalFeed;

        if (nextOriginalFeed && !this.editState().originalFeed) {
          this.breadcrumbs[1] = {
            title: nextOriginalFeed.title,
            route: ['/admin/feeds', nextOriginalFeed.id]
          };
          this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
          this.step = 1;
        }

        this.editState.set(x);
      });

    if (this.feedId) {
      this.feedEdit.editFeed(this.feedId);
    } else {
      this.feedEdit.newFeed();
    }
  }

  serviceCreationCancelled(): void {
    this.setStep(0);
  }

  serviceCreated(service: Service): void {
    this.feedEdit.serviceCreated(service);
    this.setStep(0);
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

    this.feedEdit.saveFeed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((feed) => {
        this.router.navigate(['/admin/feeds', feed.id]);
      });
  }

  setStep(index: number): void {
    this.step = index;
  }

  nextStep(): void {
    this.step++;
  }
}
