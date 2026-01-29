import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import {
  Feed,
  Service,
  ServiceType,
  FeedService
} from '@ngageoint/mage.web-core-lib/feed';

import { AdminUserService } from '../../services/admin-user.service';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminServiceDeleteComponent } from './admin-service-delete/admin-service-delete.component';

@Component({
  selector: 'app-admin-service',
  templateUrl: './admin-service.component.html',
  styleUrls: ['./admin-service.component.scss']
})
export class AdminServiceComponent implements OnInit {
  breadcrumbs: AdminBreadcrumb[] = [
    {
      title: 'Feeds',
      icon: 'rss_feed',
      route: ['../../feeds']
    }
  ];

  serviceLoaded!: Promise<boolean>;
  service!: Service;
  serviceType!: ServiceType;

  feeds: Feed[] = [];
  feedPage = 0;
  itemsPerPage = 5;

  hasServiceEditPermission = false;
  hasServiceDeletePermission = false;

  configOptions = {
    addSubmit: false,
    defautWidgetOptions: {
      readonly: true
    }
  };

  serviceId: string | null = null;

  constructor(
    private feedService: FeedService,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    private adminUserService: AdminUserService
  ) {}

  ngOnInit(): void {
    this.serviceId = this.route.snapshot.paramMap.get('serviceId');
    if (!this.serviceId) return;

    this.adminUserService.getMyself().subscribe({
      next: (myself) => {
        const perms: string[] = myself?.role?.permissions || [];
        this.hasServiceEditPermission = perms.includes('FEEDS_CREATE_SERVICE');
        this.hasServiceDeletePermission = perms.includes('FEEDS_CREATE_SERVICE');
      },
      error: () => {
        this.hasServiceEditPermission = false;
        this.hasServiceDeletePermission = false;
      }
    });

    forkJoin({
      service: this.feedService.fetchService(this.serviceId),
      feeds: this.feedService.fetchServiceFeeds(this.serviceId)
    }).subscribe(({ service, feeds }) => {
      this.service = service;
      this.feeds = feeds ?? [];

      this.breadcrumbs.push({
        title: this.service.title,
      });

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

        this.serviceLoaded = Promise.resolve(true);
      });
    });
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
