import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Service, ServiceType, FeedService } from '@ngageoint/mage.web-core-lib/feed';

@Component({
  selector: 'app-create-service',
  templateUrl: './admin-service-edit.component.html',
  styleUrls: ['./admin-service-edit.component.scss']
})
export class AdminServiceEditComponent implements OnInit, OnChanges {
  @Input() expanded = false;
  @Output() serviceCreated = new EventEmitter<Service>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() opened = new EventEmitter<void>();

  serviceTitleSummarySchema: any;
  serviceConfiguration: any;
  serviceTitleSummary: any;
  serviceConfigurationSchema: any;
  selectedServiceType!: ServiceType;
  serviceFormReady = false;
  formOptions: any;
  searchControl: UntypedFormControl = new UntypedFormControl();
  serviceTypes: Array<ServiceType> = [];
  services: Array<Service> = [];

  constructor(private feedService: FeedService) {
    this.formOptions = {
      addSubmit: false
    };
  }

  ngOnInit(): void {
    forkJoin({
      serviceTypes: this.feedService.fetchServiceTypes(),
      services: this.feedService.fetchServices()
    }).subscribe(({ serviceTypes, services }) => {
      this.serviceTypes = serviceTypes ?? [];
      this.services = services ?? [];
    });
  }

  ngOnChanges(): void {}

  createService(): void {
    if (!this.selectedServiceType) return;

    this.serviceTitleSummary.config = this.serviceConfiguration;
    this.serviceTitleSummary.serviceType = this.selectedServiceType.id;

    this.feedService.createService(this.serviceTitleSummary).subscribe(service => {
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
