import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Service, ServiceType, FeedService } from '@ngageoint/mage.web-core-lib/feed';

@Component({
  selector: 'app-create-service',
  templateUrl: './admin-service-edit.component.html',
  styleUrls: ['./admin-service-edit.component.scss']
})
export class AdminServiceEditComponent implements OnInit, OnChanges {

  @Input() expanded: boolean;
  @Output() serviceCreated = new EventEmitter<Service>();
  @Output() cancelled = new EventEmitter();
  @Output() opened = new EventEmitter();

  serviceTitleSummarySchema: any;
  serviceConfiguration: any;
  serviceTitleSummary: any;
  serviceConfigurationSchema: any;
  selectedServiceType: ServiceType;
  serviceFormReady = false;
  formOptions: any;
  searchControl: FormControl = new FormControl();
  serviceTypes: Array<ServiceType>;
  services: Array<Service>;

  constructor(private feedService: FeedService) {
    this.formOptions = {
      addSubmit: false
    };
  }

  ngOnInit(): void {
    forkJoin(
      this.feedService.fetchServiceTypes(),
      this.feedService.fetchServices()
    ).subscribe(result => {
      this.serviceTypes = result[0]
      this.services = result[1]
    });
  }

  ngOnChanges(): void {

  }

  createService(): void {
    this.serviceTitleSummary.config = this.serviceConfiguration;
    this.serviceTitleSummary.serviceType = this.selectedServiceType.id;
    this.feedService.createService(this.serviceTitleSummary).subscribe(service => {
      this.serviceCreated.emit(service);
    })
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
