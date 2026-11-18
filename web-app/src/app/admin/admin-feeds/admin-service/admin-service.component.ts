import { Component, DestroyRef, OnInit, OnDestroy, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, map, switchMap, tap } from 'rxjs';
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
import { RouteReuse } from '../../../route-reuse.strategy';

@Component({
    selector: 'app-admin-service',
    templateUrl: './admin-service.component.html',
    styleUrls: ['./admin-service.component.scss'],
    imports: [
      SlicePipe,
      RouterLink,
      MatButtonModule,
      MatCardModule,
      MatIconModule,
      MatListModule,
      MatPaginatorModule,
      MatProgressSpinnerModule
    ]
})
export class AdminServiceComponent implements OnInit, OnDestroy {
  static readonly routeReuse: RouteReuse = RouteReuse.RecreateOnParamChange;

  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly feedService: FeedService = inject(FeedService);
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly sessionService: SessionService = inject(SessionService);
  private readonly breadcrumbService: AdminBreadcrumbService = inject(AdminBreadcrumbService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Feeds',
    icon: 'rss_feed',
    route: ['/admin/feeds']
  }];

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  readonly serviceId: string = this.route.snapshot.paramMap.get('serviceId');

  readonly service = signal<Service | undefined>(undefined);
  readonly serviceType = signal<ServiceType | undefined>(undefined);

  readonly feeds = signal<Feed[]>([]);
  feedPage = 0;
  itemsPerPage = 5;

  get hasServiceDeletePermission(): boolean {
    return this.sessionService.hasPermission('FEEDS_CREATE_SERVICE');
  }

  readonly configEntries = computed(() => {
    const properties = this.serviceType()?.configSchema?.properties ?? {};
    const config = this.service()?.config ?? {};
    return Object.entries(properties).map(([key, prop]: [string, any]) => ({
      label: prop.title ?? key,
      value: config[key] != null ? String(config[key]) : '—'
    }));
  });

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    forkJoin({
      service: this.feedService.fetchService(this.serviceId),
      feeds: this.feedService.fetchServiceFeeds(this.serviceId)
    }).pipe(
      tap(({ service, feeds }) => {
        this.service.set(service);
        this.feeds.set(feeds ?? []);

        this.breadcrumbs = [...this.breadcrumbs, { title: service.title }];
        this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
      }),
      switchMap(({ service }) =>
        this.feedService.fetchServiceType((service.serviceType as ServiceType).id).pipe(
          map((serviceType) => ({ service, serviceType }))
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ service, serviceType }) => {
      const schema = serviceType.configSchema;

      if (
        schema &&
        Object.prototype.hasOwnProperty.call(schema, 'type') &&
        schema.type !== 'object'
      ) {
        this.service.set({ ...service, config: { wrapped: service.config } });
        this.serviceType.set({
          ...serviceType,
          configSchema: {
            type: 'object',
            properties: {
              wrapped: schema
            }
          }
        });
      } else {
        this.serviceType.set(serviceType);
      }
    });
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
  }

  deleteService(): void {
    const service = this.service();
    if (!service) return;

    this.dialog
      .open(AdminServiceDeleteComponent, {
        data: {
          service,
          feeds: this.feeds()
        },
        disableClose: true
      })
      .afterClosed()
      .subscribe((result) => {
        if (result === true) {
          this.feedService.deleteService(service).subscribe(() => {
            history.back();
          });
        }
      });
  }
}
