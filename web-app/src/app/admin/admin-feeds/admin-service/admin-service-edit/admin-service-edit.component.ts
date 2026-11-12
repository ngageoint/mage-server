import { ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, NgZone, OnInit, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { forkJoin } from 'rxjs';
import { Service, ServiceType, FeedService } from '@ngageoint/mage.web-core-lib/feed';
import { JsonSchemaFormWithServiceComponent } from '../../../json-schema/json-schema.component';

@Component({
    selector: 'app-create-service',
    templateUrl: './admin-service-edit.component.html',
    styleUrls: ['./admin-service-edit.component.scss'],
    imports: [
        FormsModule,
        ReactiveFormsModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        NgxMatSelectSearchModule,
        JsonSchemaFormWithServiceComponent
    ]
})
export class AdminServiceEditComponent implements OnInit {
  private readonly feedService: FeedService = inject(FeedService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private readonly ngZone: NgZone = inject(NgZone);

  @Input() expanded = false;
  @Output() serviceCreated = new EventEmitter<Service>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() opened = new EventEmitter<void>();

  serviceTitleSummarySchema: any;
  serviceConfiguration: any;
  serviceTitleSummary: any;
  selectedServiceType!: ServiceType;
  serviceFormReady = false;
  readonly formOptions = { addSubmit: false };
  searchControl: UntypedFormControl = new UntypedFormControl();
  readonly serviceTypes = signal<Array<ServiceType>>([]);
  readonly services = signal<Array<Service>>([]);

  ngOnInit(): void {
    forkJoin({
      serviceTypes: this.feedService.fetchServiceTypes(),
      services: this.feedService.fetchServices()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ serviceTypes, services }) => {
        this.serviceTypes.set(serviceTypes ?? []);
        this.services.set(services ?? []);
      });
  }

  createService(): void {
    if (!this.selectedServiceType) return;

    this.serviceTitleSummary.config = this.serviceConfiguration;
    this.serviceTitleSummary.serviceType = this.selectedServiceType.id;

    this.feedService.createService(this.serviceTitleSummary)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(service => {
        this.serviceCreated.emit(service);
      });
  }

  serviceTypeSelected(): void {
    this.serviceTitleSummarySchema = {
      properties: {
        title: {
          type: 'string',
          title: 'Service Title',
          default: this.selectedServiceType.title
        },
        summary: {
          type: 'string',
          title: 'Summary',
          default: this.selectedServiceType.summary
        }
      }
    };
    this.serviceFormReady = true;

    // WORKAROUND: ajsf fields don't paint until something forces a recheck.
    this.ngZone.onStable.pipe(take(5)).subscribe(() => {
      this.cdr.detectChanges();
    });
  }

  serviceTitleSummaryChanged($event: any): void {
    this.serviceTitleSummary = $event;
  }

  serviceConfigurationChanged($event: any): void {
    this.serviceConfiguration = $event;
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
