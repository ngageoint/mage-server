import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import {
  Feed,
  Service,
  ServiceType,
  FeedService
} from '@ngageoint/mage.web-core-lib/feed';

import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { AdminServiceDeleteComponent } from './admin-service-delete/admin-service-delete.component';
import { SessionService } from 'mage-web-app/http/session.service';

@Component({
    selector: 'app-admin-service',
    templateUrl: './admin-service.component.html',
    styleUrls: ['./admin-service.component.scss'],
    standalone: false
})
export class AdminServiceComponent implements OnInit, OnDestroy {
  breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Feeds',
    icon: 'rss_feed',
    route: ['/admin/feeds']
  }];

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  service!: Service;
  serviceType!: ServiceType;

  feeds: Feed[] = [];
  feedPage = 0;
  itemsPerPage = 5;

  serviceId: string | null = null;

  get hasServiceDeletePermission(): boolean {
    return this.sessionService.hasPermission('FEEDS_CREATE_SERVICE');
  }

  get configEntries(): { label: string; value: string }[] {
    const properties = this.serviceType?.configSchema?.properties ?? {};
    const config = this.service?.config ?? {};
    return Object.entries(properties).map(([key, prop]: [string, any]) => ({
      label: prop.title ?? key,
      value: config[key] != null ? String(config[key]) : '—'
    }));
  }

  constructor(
    private feedService: FeedService,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    private sessionService: SessionService,
    private breadcrumbService: AdminBreadcrumbService
  ) { }

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    this.serviceId = this.route.snapshot.paramMap.get('serviceId');
    if (!this.serviceId) return;

    forkJoin({
      service: this.feedService.fetchService(this.serviceId),
      feeds: this.feedService.fetchServiceFeeds(this.serviceId)
    }).subscribe(({ service, feeds }) => {
      this.service = service;
      this.feeds = feeds ?? [];

      this.breadcrumbs.push({
        title: this.service.title,
      });
      this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);

      const serviceType: ServiceType = this.service.serviceType as ServiceType;

      this.feedService.fetchServiceType(serviceType.id).subscribe((st) => {
        this.serviceType = st;

        if (
          this.serviceType.configSchema &&
          Object.prototype.hasOwnProperty.call(this.serviceType.configSchema, 'type') &&
          this.serviceType.configSchema.type !== 'object'
        ) {
          this.serviceType.configSchema = {
            type: 'object',
            properties: {
              wrapped: this.serviceType.configSchema
            }
          };

          this.service.config = {
            wrapped: this.service.config
          };
        }

      });
    });
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
  }

  deleteService(): void {
    this.dialog
      .open(AdminServiceDeleteComponent, {
        data: {
          service: this.service,
          feeds: this.feeds
        },
        autoFocus: false,
        disableClose: true
      })
      .afterClosed()
      .subscribe((result) => {
        if (result === true) {
          this.feedService.deleteService(this.service).subscribe(() => {
            history.back();
          });
        }
      });
  }
}
