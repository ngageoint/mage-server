import { animate, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, Inject, Input, OnChanges, OnInit, Output, SimpleChanges, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatTabGroup } from '@angular/material';
import * as moment from 'moment';
import { ObservationFormControl } from '../observation/observation-edit/observation-edit.component';
import { EventService, FilterService, MapService, ObservationService, UserService } from '../upgrade/ajs-upgraded-providers';
import { FeedPanelService } from './feed-panel.service';

@Component({
  selector: 'feed-panel',
  templateUrl: './feed-panel.component.html',
  styleUrls: ['./feed-panel.component.scss'],
  animations: [
    trigger('slide', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('250ms', style({ transform: 'translateX(0%)' })),
      ]),
      transition(':leave', [
        animate('250ms', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class FeedPanelComponent implements OnInit, OnChanges {
  @Input() event: any
  @Input() observationLocation: any
  @Input() observationsChanged: any

  @Output() toggle = new EventEmitter<any>()

  @ViewChild('tabGroup', { static: false }) tabGroup: MatTabGroup
  @ViewChild('permissionDialog', { static: false }) permissionDialog: TemplateRef<any>

  currentFeedPanel = 'observations'
  
  edit = false
  editForm: any

  observation: any
  newObservation: any
  newObservationForm: any
  newObservationForms: any
  newObservationFormGroup: FormGroup

  firstObservationChange = true
  observationBadge: number = null

  viewObservation: any
  editObservation: any

  viewUser: any

  constructor(
    public dialog: MatDialog,
    private feedPanelService: FeedPanelService,
    private formBuilder: FormBuilder,
    @Inject(MapService) private mapService: any,
    @Inject(UserService) private userService: any,
    @Inject(FilterService) private filterService: any,
    @Inject(EventService) private eventService: any,
    @Inject(ObservationService) private observationService: any) { }

  ngOnInit(): void {
    this.eventService.addObservationsChangedListener(this)

    this.feedPanelService.viewUser$.subscribe(event => {
      this.viewUser = event.user
      this.newObservation = null
      this.editObservation = null
      this.viewObservation = null

      this.toggle.emit({
        hidden: false
      })
    })

    this.feedPanelService.viewObservation$.subscribe(event => {
      this.viewObservation = event.observation;
      this.newObservation = null
      this.editObservation = null
      this.viewUser = null

      this.toggle.emit({
        hidden: false
      })
    })

    this.feedPanelService.editObservation$.subscribe(event => {
      this.edit = true;

      const observation = event.observation;
      const formMap = this.eventService.getForms(observation).reduce((map, form) => {
        map[form.id] = form
        return map
      }, {})

      const form = {
        geometryField: {
          title: 'Location',
          type: 'geometry',
          name: 'geometry',
          value: observation.geometry,
          required: true
        },
        timestampField: {
          title: '',
          type: 'date',
          name: 'timestamp',
          value: moment(observation.properties.timestamp).toDate(),
          required: true
        },
        forms: []
      }

      observation.properties.forms.forEach(propertyForm => {
        const observationForm = this.eventService.createForm(propertyForm, formMap[propertyForm.formId])
        form.forms.push(observationForm)
      })

      this.editForm = form
      this.editObservation = observation
    })
  }

  ngOnDestroy(): void {
    this.eventService.removeObservationsChangedListener(this)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.event && changes.event.currentValue) {
      this.newObservation = null
      this.editObservation = null
      this.viewObservation = null
      this.viewUser = null
      this.observationBadge = null
    }

    if (changes.observationLocation && changes.observationLocation.currentValue) {
      // Don't allow new observation if observation create is in progress
      if (this.newObservation || this.newObservationForms) return

      this.createNewObservation(changes.observationLocation.currentValue)
    }
  }

  onObservationsChanged(changed): void {
    if (!this.firstObservationChange && this.tabGroup.selectedIndex !== 0) {
      if (changed.added && changed.added.length) this.observationBadge += changed.added.length
      if (changed.updated && changed.updated.length) this.observationBadge += changed.updated.length
    }

    this.firstObservationChange = false
  }

  createNewObservation(location: any): void {
    const event = this.filterService.getEvent();

    if (!this.eventService.isUserInEvent(this.userService.myself, event)) {
      this.dialog.open(this.permissionDialog, {
        autoFocus: false,
        width: '500px'
      })

      return
    }

    this.observation = {
      id: 'new',
      eventId: event.id,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [location.latLng.lng, location.latLng.lat]
      },
      properties: {
        timestamp: new Date(),
        forms: []
      }
    }

    // TODO multi-form this needs to be done when adding/deleting/reorder of forms
    // Style will be based on first form in observation
    // this.observation.style = {
    //   iconUrl: this.getIconUrl(event, observationForms)
    // }

    this.newObservation = this.observation

    // TODO multi-form make sure this works with no forms
    this.newObservationForms = [];
    this.eventService.getFormsForEvent(event, { archived: false }).forEach(form => {
      for (let i = 0; i < form.min || 0; i++) {
        this.newObservationForms.push({ ...form })
      }

      if (form.default && !form.min) {
        this.newObservationForms.push({ ...form })
      }
    })

    const timestampControl = new FormControl(moment(this.newObservation.properties.timestamp).toDate(), Validators.required);
    (timestampControl as ObservationFormControl).definition = {
      title: '',
      type: 'date',
      name: 'timestamp',
      value: moment(this.newObservation.properties.timestamp).toDate(),
      required: true
    }

    const geometryControl = new FormControl(this.newObservation.geometry, Validators.required);
    (geometryControl as ObservationFormControl).definition = {
      title: 'Location',
      type: 'geometry',
      name: 'geometry',
      value: this.newObservation.geometry,
      required: true
    }

    this.newObservationFormGroup = this.formBuilder.group({
      timestamp: timestampControl,
      geometry: geometryControl,
      forms: new FormArray([])
    });

    // TODO build out other forms in fb group

    this.newObservationForm = {
      geometryField: {
        title: 'Location',
        type: 'geometry',
        name: 'geometry',
        value: this.newObservation.geometry,
        required: true
      },
      timestampField: {
        title: '',
        type: 'date',
        name: 'timestamp',
        value: moment(this.newObservation.properties.timestamp).toDate(),
        required: true
      }
    }
  }

  getIconUrl(event, form): void {
    const fields = form.fields || []
    
    const primary = fields.find(field => {
      return field.name === form.primaryField
    }) || {}

    const secondary = fields.find(field => {
      return field.name === form.variantField
    }) || {}

    return this.observationService.getObservationIconUrlForEvent(event.id, form.id, primary.value, secondary.value)
  }

  cancelNewObservation(): void {
    delete this.newObservationForms
  }

  onUserViewClose(): void {
    this.mapService.deselectFeatureInLayer(this.viewUser, 'People');
    this.viewUser = null;
  }

  onObservationViewClose(): void {
    this.mapService.deselectFeatureInLayer(this.viewObservation, 'Observations');
    this.viewObservation = null;
  }

  onObservationEditClose(observation): void {
    this.newObservation = null;
    this.editObservation = null;

    if (observation && this.viewObservation && this.viewObservation.id === observation.id) {
      this.viewObservation = observation
    }
  }

  onObservationDelete(event): void {
    this.newObservation = null;
    this.editObservation = null;
    this.viewObservation = null;
    this.mapService.removeFeatureFromLayer(event.observation, 'Observations');
  }

  tabChanged(event: number): void {
    if (event === 0) {
      this.observationBadge = null
    }
  }
}
