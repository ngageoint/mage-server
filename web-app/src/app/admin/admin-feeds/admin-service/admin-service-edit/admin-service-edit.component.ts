import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private readonly feedService = inject(FeedService);
  private readonly destroyRef = inject(DestroyRef);

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
