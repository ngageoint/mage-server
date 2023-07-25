import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms'
import { debounceTime, map } from 'rxjs/operators'
import { FeedTopic } from '@ngageoint/mage.web-core-lib/feed'
import { StaticIconReference } from '@ngageoint/mage.web-core-lib/static-icon'
import { FeedMetaData, feedMetaDataLean, FeedMetaDataNullable } from './feed-edit.model'

export type IconModel = Readonly<
  | { iconFile: string }
  | { iconUrl: string }
  | { iconId: string }
  >

export interface MapStyle {
  icon: IconModel
}

@Component({
  selector: 'app-feed-configuration',
  templateUrl: './admin-feed-edit-configuration.component.html',
  styleUrls: ['./admin-feed-edit-configuration.component.scss']
})
export class AdminFeedEditConfigurationComponent implements OnInit, OnChanges {

  @Input() topic: FeedTopic | null;
  @Input() itemPropertiesSchema: any;
  @Input() feedMetaData: FeedMetaData | null;
  @Input() expanded: boolean;
  @Input() buttonText: string;
  @Output() feedMetaDataAccepted = new EventEmitter<any>();
  @Output() feedMetaDataChanged = new EventEmitter<FeedMetaData>();
  @Output() cancelled = new EventEmitter();
  @Output() opened = new EventEmitter();

  feedMetaDataForm: FormGroup = new FormGroup({
    title: new FormControl(),
    summary: new FormControl(),
    icon: new FormControl(),
    itemsHaveIdentity: new FormControl(),
    itemsHaveSpatialDimension: new FormControl(),
    itemPrimaryProperty: new FormControl(),
    itemSecondaryProperty: new FormControl(),
    itemTemporalProperty: new FormControl(),
    updateFrequencySeconds: new FormControl()
  })
  itemSchemaPropertyTitles: { key: string, title: string }[] = [];
  readonly changeDebounceInterval = 500

  ngOnInit(): void {
    this.feedMetaDataForm.valueChanges.pipe(
      debounceTime(this.changeDebounceInterval),
      map(metaDataFromFormValue)
    )
    .subscribe(metaDataFromForm => {
      this.feedMetaData = metaDataFromForm
      this.feedMetaDataChanged.emit(this.feedMetaData)
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.itemPropertiesSchema) {
      const schema = this.itemPropertiesSchema || {}
      const schemaProperties = schema.properties || {}
      this.itemSchemaPropertyTitles = Object.getOwnPropertyNames(schemaProperties).map(key => {
        const schemaProperty = schemaProperties[key] || {}
        return { key, title: schemaProperty.title || key }
      })
    }
    if (changes.topic) {
      if (!changes.feedMetaData) {
        // leave feed meta-data if changing at the same time as the topic
        this.feedMetaData = null
      }
      this.resetFormWithMergedMetaData()
    }
    else if (changes.feedMetaData) {
      if (this.feedMetaData) {
        this.updateFormFromMetaDataRespectingUserChanges()
      }
      else {
        this.resetFormWithMergedMetaData()
      }
    }
  }

  onPreviousStep(): void {
    this.cancelled.emit()
  }

  onAccepted(): void {
    if (this.feedMetaDataForm.dirty) {
      this.feedMetaData = metaDataFromFormValue(this.feedMetaDataForm.value)
      this.feedMetaDataAccepted.emit(this.feedMetaData)
    }
    else {
      this.feedMetaDataAccepted.emit(null)
    }
  }

  private resetFormWithMergedMetaData(): void {
    const merged = mergedMetaData(this.feedMetaData, this.topic || {})
    this.feedMetaDataForm.reset(merged, { emitEvent: false })
  }

  private updateFormFromMetaDataRespectingUserChanges(): void {
    const metaData = {
      ...feedMetaDataLean(this.topic || {}),
      ...feedMetaDataLean(this.feedMetaData || {})
    } as FeedMetaData
    const form = this.feedMetaDataForm
    const updateValue: FeedMetaDataNullable = {
      title: formUpdateValueForTextControl('title', form, metaData),
      summary: formUpdateValueForTextControl('summary', form, metaData),
      icon: formUpdateValueForIconControl('icon', form, metaData),
      itemPrimaryProperty: formUpdateValueForTextControl('itemPrimaryProperty', form, metaData),
      itemSecondaryProperty: formUpdateValueForTextControl('itemSecondaryProperty', form, metaData),
      itemTemporalProperty: formUpdateValueForTextControl('itemTemporalProperty', form, metaData),
      itemsHaveIdentity: formUpdateValueForBooleanControl('itemsHaveIdentity', form, metaData),
      itemsHaveSpatialDimension: formUpdateValueForBooleanControl('itemsHaveSpatialDimension', form, metaData),
      updateFrequencySeconds: formUpdateValueForNumberControl('updateFrequencySeconds', form, metaData)
    }
    form.setValue(updateValue, { emitEvent: false })
  }
}

type FeedMetaDataStringKeys = { [K in keyof FeedMetaData]: FeedMetaData[K] extends string ? K : never }[keyof FeedMetaData]
type FeedMetaDataBooleanKeys = { [K in keyof FeedMetaData]: FeedMetaData[K] extends boolean ? K : never }[keyof FeedMetaData]
type FeedMetaDataNumberKeys = { [K in keyof FeedMetaData]: FeedMetaData[K] extends number ? K : never }[keyof FeedMetaData]

function formUpdateValueForTextControl(key: FeedMetaDataStringKeys, form: FormGroup, updateMetaData: FeedMetaData): string | null {
  const control = form.get(key)
  return control.dirty ? control.value as string || null : updateMetaData[key] || null
}

function formUpdateValueForBooleanControl(key: FeedMetaDataBooleanKeys, form: FormGroup, updateMetaData: FeedMetaData): boolean | null {
  const control = form.get(key)
  return control.dirty ? control.value : (typeof updateMetaData[key] === 'boolean' ? updateMetaData[key] : null)
}

function formUpdateValueForNumberControl(key: FeedMetaDataNumberKeys, form: FormGroup, updateMetaData: FeedMetaData): number | null {
  const control = form.get(key)
  if (control.dirty) {
    return typeof control.value === 'number' ? control.value : null
  }
  return typeof updateMetaData[key] === 'number' ? updateMetaData[key] : null
}

function formUpdateValueForIconControl(key: keyof Pick<FeedMetaData, 'icon'>, form: FormGroup, updateMetaData: FeedMetaData): StaticIconReference | null {
  const control = form.get(key)
  return control.dirty ? control.value as StaticIconReference : (updateMetaData.icon || null)
}

export function formValueForMetaData(metaData: FeedMetaData): Required<FeedMetaDataNullable> {
  metaData = metaData || {}
  return {
    title: metaData.title || null,
    summary: metaData.summary || null,
    icon: metaData.icon || null,
    itemPrimaryProperty: metaData.itemPrimaryProperty || null,
    itemSecondaryProperty: metaData.itemSecondaryProperty || null,
    itemTemporalProperty: metaData.itemTemporalProperty || null,
    itemsHaveIdentity: typeof metaData.itemsHaveIdentity === 'boolean' ? metaData.itemsHaveIdentity : null,
    itemsHaveSpatialDimension: typeof metaData.itemsHaveSpatialDimension === 'boolean' ? metaData.itemsHaveSpatialDimension : null,
    updateFrequencySeconds: typeof metaData.updateFrequencySeconds === 'number' ? metaData.updateFrequencySeconds : null
  }
}

function metaDataFromFormValue(formValue: FeedMetaDataNullable): FeedMetaData {
  return feedMetaDataLean(formValue)
}

function mergedMetaData(feedMetaData: FeedMetaData | null, topic: FeedMetaData | null): FeedMetaData {
  const topicMetaData = feedMetaDataLean(topic || {})
  const mergedMetaData = { ...topicMetaData, ...feedMetaData }
  return mergedMetaData
}


