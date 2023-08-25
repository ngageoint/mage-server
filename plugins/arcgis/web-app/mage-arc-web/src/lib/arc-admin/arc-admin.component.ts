import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog'
import { AttributeConfig, AttributeConcatenationConfig, AttributeDefaultConfig, AttributeValueConfig } from '../ArcGISConfig';
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from '../ArcGISPluginConfig'
import { ArcService } from '../arc.service'
import { Subject } from 'rxjs';
import { EventResult, FormResult } from '../EventsResult';

@Component({
  selector: 'arc-admin',
  templateUrl: './arc-admin.component.html',
  styleUrls: ['./arc-admin.component.scss']
})
export class ArcAdminComponent implements OnInit {

  config: ArcGISPluginConfig;
  configChangedNotifier: Subject<void> = new Subject<void>();

  infoTitle: string;
  infoMessage: string;
  editConfig: ArcGISPluginConfig;
  editFieldMappings: boolean;
  editAttributes: boolean;
  editType: string;
  editObject: any;
  editName: string;
  editValue: any;
  editOptions: any[];
  events: EventResult[] = [];

  @ViewChild('infoDialog', { static: true })
  private infoTemplate: TemplateRef<unknown>
  @ViewChild('editProcessingDialog', { static: true })
  private editProcessingTemplate: TemplateRef<unknown>
  @ViewChild('editAttributesDialog', { static: true })
  private editAttributesTemplate: TemplateRef<unknown>
  @ViewChild('deleteFieldDialog', { static: true })
  private deleteFieldTemplate: TemplateRef<unknown>
  @ViewChild('addFieldDialog', { static: true })
  private addFieldTemplate: TemplateRef<unknown>
  @ViewChild('addFieldValueDialog', { static: true })
  private addFieldValueTemplate: TemplateRef<unknown>
  @ViewChild('addFieldAutoDialog', { static: true })
  private addFieldAutoTemplate: TemplateRef<unknown>
  @ViewChild('addFieldAutoValueDialog', { static: true })
  private addFieldAutoValueTemplate: TemplateRef<unknown>
  @ViewChild('editFieldDialog', { static: true })
  private editFieldTemplate: TemplateRef<unknown>
  @ViewChild('editFieldAutoDialog', { static: true })
  private editFieldAutoTemplate: TemplateRef<unknown>
  @ViewChild('editBooleanFieldDialog', { static: true })
  private editBooleanFieldTemplate: TemplateRef<unknown>
  @ViewChild('editAttributeConfigDialog', { static: true })
  private editAttributeConfigTemplate: TemplateRef<unknown>

  constructor(private arcService: ArcService, private dialog: MatDialog) {
    this.config = defaultArcGISPluginConfig;
    this.editConfig = defaultArcGISPluginConfig;
    this.editFieldMappings = false;
    arcService.fetchArcConfig().subscribe(x => {
      this.config = x;
      arcService.fetchPopulatedEvents().subscribe(x => this.handleEventResults(x));
    })
  }

  configChanged(config: ArcGISPluginConfig) {
    this.config = config;
    this.configChangedNotifier.next();
  }

  ngOnInit(): void {
  }

  handleEventResults(x: EventResult[]) {
    this.events = x
  }

  onDeleteLayer(layerUrl: string) {
    let index = 0;
    for (const featureServiceConfig of this.config.featureServices) {
      if (featureServiceConfig.url == layerUrl) {
        break;
      }
      index++;
    }
    if (index < this.config.featureServices.length) {
      this.config.featureServices.splice(index, 1);
    }
    this.saveConfig();
  }

  onEditProcessing() {
    this.editConfig = this.copyConfig()
    this.dialog.open<unknown, unknown, string>(this.editProcessingTemplate)
  }

  onEditAttributes() {
    this.editConfig = this.copyConfig()
    this.dialog.open<unknown, unknown, string>(this.editAttributesTemplate)
  }

  setField(field: string, value: any) {
    if (value != undefined && value.length == 0) {
      value = undefined
    }
    (this.editConfig as any)[field] = value
    console.log('Editing field: ' + field + ', value: ' + value)
  }

  setNumberField(field: string, value: any, min: number) {
    if (value != undefined) {
      if (value.length == 0) {
        value = undefined
      } else {
        value = Number(value)
        if (value < min) {
          value = undefined
        }
      }
    }
    (this.editConfig as any)[field] = value
    console.log('Editing field: ' + field + ', value: ' + value)
  }

  copyConfig(): ArcGISPluginConfig {
    return JSON.parse(JSON.stringify(this.config))
  }

  saveEdit() {
    if (this.editConfig.enabled != undefined && this.editConfig.enabled != this.config.enabled) {
      this.config.enabled = this.editConfig.enabled
      console.log('Edited enabled: ' + this.config.enabled)
    }
    if (this.editConfig.intervalSeconds != undefined && this.editConfig.intervalSeconds != this.config.intervalSeconds) {
      this.config.intervalSeconds = this.editConfig.intervalSeconds
      console.log('Edited intervalSeconds: ' + this.config.intervalSeconds)
    }
    if (this.editConfig.startupIntervalSeconds != undefined && this.editConfig.startupIntervalSeconds != this.config.startupIntervalSeconds) {
      this.config.startupIntervalSeconds = this.editConfig.startupIntervalSeconds
      console.log('Edited startupIntervalSeconds: ' + this.config.startupIntervalSeconds)
    }
    if (this.editConfig.updateIntervalSeconds != undefined && this.editConfig.updateIntervalSeconds != this.config.updateIntervalSeconds) {
      this.config.updateIntervalSeconds = this.editConfig.updateIntervalSeconds
      console.log('Edited updateIntervalSeconds: ' + this.config.updateIntervalSeconds)
    }
    if (this.editConfig.batchSize != undefined && this.editConfig.batchSize != this.config.batchSize) {
      this.config.batchSize = this.editConfig.batchSize
      console.log('Edited batchSize: ' + this.config.batchSize)
    }
    if (this.editConfig.attachmentModifiedTolerance != undefined && this.editConfig.attachmentModifiedTolerance != this.config.attachmentModifiedTolerance) {
      this.config.attachmentModifiedTolerance = this.editConfig.attachmentModifiedTolerance
      console.log('Edited attachmentModifiedTolerance: ' + this.config.attachmentModifiedTolerance)
    }
    if (this.editConfig.observationIdField != undefined && this.editConfig.observationIdField != this.config.observationIdField) {
      this.config.observationIdField = this.editConfig.observationIdField
      console.log('Edited observationIdField: ' + this.config.observationIdField)
    }
    if (this.editConfig.idSeparator != undefined && this.editConfig.idSeparator != this.config.idSeparator) {
      this.config.idSeparator = this.editConfig.idSeparator
      console.log('Edited idSeparator: ' + this.config.idSeparator)
    }
    if (this.editConfig.eventIdField != this.config.eventIdField) {
      this.config.eventIdField = this.editConfig.eventIdField
      console.log('Edited eventIdField: ' + this.config.eventIdField)
    }
    if (this.editConfig.lastEditedDateField != this.config.lastEditedDateField) {
      this.config.lastEditedDateField = this.editConfig.lastEditedDateField
      console.log('Edited lastEditedDateField: ' + this.config.lastEditedDateField)
    }
    if (this.editConfig.eventNameField != this.config.eventNameField) {
      this.config.eventNameField = this.editConfig.eventNameField
      console.log('Edited eventNameField: ' + this.config.eventNameField)
    }
    if (this.editConfig.userIdField != this.config.userIdField) {
      this.config.userIdField = this.editConfig.userIdField
      console.log('Edited userIdField: ' + this.config.userIdField)
    }
    if (this.editConfig.usernameField != this.config.usernameField) {
      this.config.usernameField = this.editConfig.usernameField
      console.log('Edited usernameField: ' + this.config.usernameField)
    }
    if (this.editConfig.userDisplayNameField != this.config.userDisplayNameField) {
      this.config.userDisplayNameField = this.editConfig.userDisplayNameField
      console.log('Edited userDisplayNameField: ' + this.config.userDisplayNameField)
    }
    if (this.editConfig.deviceIdField != this.config.deviceIdField) {
      this.config.deviceIdField = this.editConfig.deviceIdField
      console.log('Edited deviceIdField: ' + this.config.deviceIdField)
    }
    if (this.editConfig.createdAtField != this.config.createdAtField) {
      this.config.createdAtField = this.editConfig.createdAtField
      console.log('Edited createdAtField: ' + this.config.createdAtField)
    }
    if (this.editConfig.lastModifiedField != this.config.lastModifiedField) {
      this.config.lastModifiedField = this.editConfig.lastModifiedField
      console.log('Edited lastModifiedField: ' + this.config.lastModifiedField)
    }
    if (this.editConfig.geometryType != this.config.geometryType) {
      this.config.geometryType = this.editConfig.geometryType
      console.log('Edited geometryType: ' + this.config.geometryType)
    }
    this.saveConfig()
    console.log('Saved configuration edit')
  }

  cancelEdit() {
    console.log('Canceled configuration edit')
  }

  keys(value: any): string[] {
    let keys: string[]
    if (value != undefined) {
      keys = Object.keys(value)
    } else {
      keys = []
    }
    return keys
  }

  hasAttributeConfig(attribute: string): boolean {
    return this.attributeConfig(attribute) != undefined
  }

  getAttributeConfig(attribute: string): AttributeConfig {
    return this.attributeConfig(attribute)!
  }

  private attributeConfig(attribute: string): AttributeConfig | undefined {
    let attributeConfig = undefined
    if (this.config.attributes) {
      attributeConfig = this.config.attributes[attribute]
    }
    return attributeConfig
  }

  hasConcatenation(attribute: string): boolean {
    return this.concatenation(attribute) != undefined
  }

  getConcatenation(attribute: string): AttributeConcatenationConfig {
    return this.concatenation(attribute)!
  }

  getSameForms(attribute: string): boolean {
    const concatenation = this.getConcatenation(attribute)
    return concatenation.sameForms == undefined || concatenation.sameForms
  }

  getDifferentForms(attribute: string): boolean {
    const concatenation = this.getConcatenation(attribute)
    return concatenation.differentForms == undefined || concatenation.differentForms
  }

  private concatenation(attribute: string): AttributeConcatenationConfig | undefined {
    let concat = undefined
    const attributeConfig = this.attributeConfig(attribute)
    if (attributeConfig) {
      concat = attributeConfig.concatenation
    }
    return concat
  }

  hasMappings(attribute: string): boolean {
    return this.mappings(attribute) != undefined
  }

  getMappings(attribute: string): { [value: string]: any } {
    return this.mappings(attribute)!
  }

  private mappings(attribute: string): { [value: string]: any } | undefined {
    let mappings = undefined
    const attributeConfig = this.attributeConfig(attribute)
    if (attributeConfig) {
      mappings = attributeConfig.mappings
    }
    return mappings
  }

  hasDefaults(attribute: string): boolean {
    return this.defaults(attribute) != undefined
  }

  getDefaults(attribute: string): AttributeDefaultConfig[] {
    return this.defaults(attribute)!
  }

  private defaults(attribute: string): AttributeDefaultConfig[] | undefined {
    let defaults = undefined
    const attributeConfig = this.attributeConfig(attribute)
    if (attributeConfig) {
      defaults = attributeConfig.defaults
    }
    return defaults
  }

  hasOmit(attribute: string): boolean {
    return this.omit(attribute) != undefined
  }

  getOmit(attribute: string): boolean {
    return this.omit(attribute)!
  }

  private omit(attribute: string): boolean | undefined {
    let omit = undefined
    const attributeConfig = this.attributeConfig(attribute)
    if (attributeConfig) {
      omit = attributeConfig.omit
    }
    return omit
  }

  findEvent(event: string): EventResult | undefined {
    let eventResult = undefined
    if (this.events != undefined) {
      const index = this.events.findIndex((element) => {
        return element.name === event;
      })
      if (index != -1) {
        eventResult = this.events[index]
      }
    }
    return eventResult
  }

  findForm(event: string, form: string): FormResult | undefined {
    let formResult = undefined
    let eventResult = this.findEvent(event)
    if (eventResult != undefined && eventResult.forms != undefined) {
      const index = eventResult.forms.findIndex((element) => {
        return element.name === form;
      })
      if (index != -1) {
        formResult = eventResult.forms[index]
      }
    }
    return formResult
  }

  eventId(event: string): number {
    const eventResult = this.findEvent(event)
    return eventResult != undefined ? eventResult.id : -1
  }

  formId(event: string, form: string): number {
    const formResult = this.findForm(event, form)
    return formResult != undefined ? formResult.id : -1
  }

  selectableEvents(): string[] {
    const events: string[] = []
    if (this.events != undefined) {
      for (const event of this.events) {
        if (this.eventMappings(event.name) == undefined) {
          events.push(event.name)
        }
      }
      this.sortArray(events)
    }
    return events
  }

  selectableForms(event: string): string[] {
    const forms: string[] = []
    const eventResult = this.findEvent(event)
    if (eventResult != undefined && eventResult.forms != undefined) {
      for (const form of eventResult.forms) {
        if (this.formMappings(event, form.name) == undefined) {
          forms.push(form.name)
        }
      }
    }
    this.sortArray(forms)
    return forms
  }

  selectableFields(event: string, form: string): string[] {
    const fields: string[] = []
    const formResult = this.findForm(event, form)
    if (formResult != undefined && formResult.fields != undefined) {
      for (const field of formResult.fields) {
        if (this.fieldMapping(event, form, field.title) == undefined) {
            fields.push(field.title)
        }
      }
    }
    this.sortArray(fields)
    return fields
  }

  selectableAttributes(): string[] {

    const exclude = new Set<string>()
    if (this.config.attributes != undefined) {
      for (const attribute of Object.keys(this.config.attributes)) {
        exclude.add(attribute)
      }
    }

    return this.getSelectableAttributes(exclude)
  }

  selectableConditionAttributes(attribute: string, conditions: AttributeValueConfig[]): string[] {

    const exclude = new Set<string>()
    exclude.add(attribute)
    if (conditions != undefined) {
      for (const condition of conditions) {
        exclude.add(condition.attribute)
      }
    }

    return this.getSelectableAttributes(exclude)
  }

  private getSelectableAttributes(exclude: Set<string>): string[] {

    const attributes: string[] = []

    this.addAttribute(this.config.eventNameField, attributes, exclude)
    this.addAttribute(this.config.userIdField, attributes, exclude)
    this.addAttribute(this.config.usernameField, attributes, exclude)
    this.addAttribute(this.config.userDisplayNameField, attributes, exclude)
    this.addAttribute(this.config.deviceIdField, attributes, exclude)
    this.addAttribute(this.config.createdAtField, attributes, exclude)
    this.addAttribute(this.config.lastModifiedField, attributes, exclude)
    this.addAttribute(this.config.geometryType, attributes, exclude)

    if (this.config.fieldAttributes != undefined) {
      for (const formMappings of Object.values(this.config.fieldAttributes)) {
        for (const fieldMappings of Object.values(formMappings as any)) {
          for (const attribute of Object.values(fieldMappings as any)) {
            this.addAttribute(attribute as string, attributes, exclude)
          }
        }
      }
    }

    if (this.events != undefined) {
      for (const event of this.events) {
        if (event.forms != undefined) {
          for (const form of event.forms) {
            if (form.fields != undefined) {
              for (const field of form.fields) {
                if (this.fieldMapping(event.name, form.name, field.title) == undefined) {
                  this.addAttribute(field.title, attributes, exclude)
                }
              }
            }
          }
        }
      }
    }

    this.sortArray(attributes)
    return attributes
  }

  private addAttribute(attribute: string | undefined, attributes: string[], unique: Set<string>) {
    if (attribute != undefined) {
      const attributeAdd = this.replaceSpaces(attribute)
      if (!unique.has(attributeAdd)) {
        attributes.push(attributeAdd)
        unique.add(attributeAdd)
      }
    }
  }

  private eventMappings(event: string): any {
    let events = undefined
    if (this.config.fieldAttributes != undefined) {
      events = this.config.fieldAttributes[event]
    }
    return events
  }

  private formMappings(event: string, form: string): any {
    let forms = undefined
    let events = this.eventMappings(event)
    if (events != undefined) {
      forms = events[form]
    }
    return forms
  }

  private fieldMapping(event: string, form: string, field: string): string {
    let attribute = undefined
    let forms = this.formMappings(event, form)
    if (forms != undefined) {
      attribute = forms[field]
    }
    return attribute
  }

  private sortArray(array: string[]) {
    array.sort((a, b) => {
      return a.toLowerCase() < b.toLowerCase() ? -1 : 1
    })
  }

  private replaceSpaces(name: string): string {
    return name.replace(/ /g, '_')
  }

  showInfo(title: string, message: string) {
    this.infoTitle = title
    this.infoMessage = message
    this.dialog.open<unknown, unknown, string>(this.infoTemplate)
  }

  showDeleteField(type: string, object: any, name: string, value: string) {
    this.editType = type;
    this.editObject = object;
    this.editName = name;
    this.editValue = value;
    this.dialog.open<unknown, unknown, string>(this.deleteFieldTemplate)
  }

  deleteField() {
    if (this.editObject != undefined) {
      if (Array.isArray(this.editObject)) {
        this.editObject.splice(this.editValue, 1)
      } else {
        delete this.editObject[this.editValue]
      }
      this.updateConfigForDeletion()
    }
  }

  showAddField(type: string, object: any) {
    this.editType = type;
    this.editObject = object;
    this.dialog.open<unknown, unknown, string>(this.addFieldTemplate)
  }

  addField(name: string) {
    if (this.editObject == undefined) {
      if (this.editType == 'Event') {
        this.config.fieldAttributes = {}
        this.editObject = this.config.fieldAttributes
      } else if (this.editType == 'Attribute') {
        this.config.attributes = {}
        this.editObject = this.config.attributes
      }
    }
    if (this.editType == 'Default') {
      if (this.editObject.defaults == undefined) {
        this.editObject.defaults = []
      }
      const attributeDefault = {} as AttributeDefaultConfig
      attributeDefault.value = name
      this.editObject.defaults.push(attributeDefault)
      this.saveConfig()
    } else if (Array.isArray(this.editObject)) {
      this.editObject.push(name)
      this.saveConfig()
    } else if (this.editObject[name] == undefined) {
      this.editObject[name] = {}
      this.saveConfig()
    }
  }

  showAddFieldValue(type: string, object: any) {
    this.editType = type;
    this.editObject = object;
    this.dialog.open<unknown, unknown, string>(this.addFieldValueTemplate)
  }

  addFieldValue(name: string, value: any) {
    if (this.editType == 'Condition Attribute') {
      if (this.editObject.condition == undefined) {
        this.editObject.condition = []
      }
      const attributeValue = {} as AttributeValueConfig
      attributeValue.attribute = name
      attributeValue.values = [value]
      this.editObject.condition.push(attributeValue)
    } else {
      this.editObject[name] = value
    }
    this.saveConfig()
  }

  showAddFieldAuto(type: string, object: any, options: any[]) {
    this.editType = type;
    this.editObject = object;
    this.editOptions = options;
    this.dialog.open<unknown, unknown, string>(this.addFieldAutoTemplate)
  }

  showAddFieldAutoValue(type: string, object: any, options: any[]) {
    this.editType = type;
    this.editObject = object;
    this.editOptions = options;
    this.dialog.open<unknown, unknown, string>(this.addFieldAutoValueTemplate)
  }

  showEditField(name: string, field: string, object: any, value: any) {
    this.editName = name;
    this.editType = field;
    this.editObject = object;
    this.editValue = value;
    this.dialog.open<unknown, unknown, string>(this.editFieldTemplate)
  }

  editField(value: any) {
    if (value != this.editValue) {
      const editObjectValue = this.editObject[this.editType]
      const existingValue = editObjectValue[this.editValue]
      if (existingValue != undefined) {
        const newValue: any = {}
        for (const valueEntry of Object.entries(editObjectValue)) {
          const existingKey = valueEntry[0]
          const existingValue: any = valueEntry[1]
          if (existingKey == this.editValue) {
            newValue[value] = existingValue
          } else if(existingKey != value) {
            newValue[existingKey] = existingValue
          }
        }
        value = newValue
      }
      this.editObject[this.editType] = value
      this.saveConfig()
    }
  }

  showEditFieldAuto(name: string, field: string, object: any, value: any, options: any[]) {
    this.editName = name;
    this.editType = field;
    this.editObject = object;
    this.editValue = value;
    const index = options.indexOf(value);
    if (index != 0) {
      if (index > 0) {
        options.splice(index, 1);
      }
      options.unshift(value);
    }
    this.editOptions = options;
    this.dialog.open<unknown, unknown, string>(this.editFieldAutoTemplate)
  }

  showEditBooleanField(name: string, field: string, object: any, value: any) {
    this.editName = name;
    this.editType = field;
    this.editObject = object;
    this.editValue = value;
    this.dialog.open<unknown, unknown, string>(this.editBooleanFieldTemplate)
  }

  editBooleanField(value: any) {
    this.editObject[this.editType] = value
    this.saveConfig()
  }

  showEditAttributeConfig(attribute: string) {
    this.editName = attribute
    this.dialog.open<unknown, unknown, string>(this.editAttributeConfigTemplate)
  }

  editAttributeConfig(concatenation: boolean, mappings: boolean, defaults: boolean, omit: boolean) {

    const attributeConfig = this.attributeConfig(this.editName)

    if (attributeConfig != undefined) {

      const hasConcatenation = this.hasConcatenation(this.editName)
      if (concatenation) {
        if (!hasConcatenation) {
          attributeConfig.concatenation = { delimiter: ', ' }
        }
      } else if (hasConcatenation) {
        attributeConfig.concatenation = undefined
      }

      const hasMappings = this.hasMappings(this.editName)
      if (mappings) {
        if (!hasMappings) {
          attributeConfig.mappings = {}
        }
      } else if (hasMappings) {
        attributeConfig.mappings = undefined
      }

      const hasDefaults = this.hasDefaults(this.editName)
      if (defaults) {
        if (!hasDefaults) {
          attributeConfig.defaults = []
        }
      } else if (hasDefaults) {
        attributeConfig.defaults = undefined
      }

      const hasOmit = this.hasOmit(this.editName)
      if (omit) {
        if (!hasOmit) {
          attributeConfig.omit = true
        }
      } else if (hasOmit) {
        attributeConfig.omit = undefined
      }

      this.saveConfig()
    }

  }

  updateFieldMappings(update: boolean) {
    if (update) {
      this.cleanFieldMappings(true)
      this.saveConfig()
    }
  }

  updateAttributeSettings(update: boolean) {
    if (update) {
      this.cleanAttributeSettings(true)
      this.saveConfig()
    }
  }

  private saveConfig() {
    this.arcService.putArcConfig(this.config)
  }

  private updateConfigForDeletion() {
    this.cleanFieldMappings(false)
    this.cleanAttributeSettings(false)
    this.saveConfig()
  }

  private cleanFieldMappings(finalize: boolean) {

    if (finalize && this.config.fieldAttributes != undefined) {
      for (const event of Object.keys(this.config.fieldAttributes)) {
        for (const form of Object.keys(this.config.fieldAttributes[event])) {
          const fields = this.config.fieldAttributes[event][form]
          if (Object.keys(fields).length == 0) {
            delete this.config.fieldAttributes[event][form]
          }
        }
        if (Object.keys(this.config.fieldAttributes[event]).length == 0) {
          delete this.config.fieldAttributes[event]
        }
      }
      if (Object.keys(this.config.fieldAttributes).length == 0) {
        delete this.config.fieldAttributes
      }
    }

  }

  private cleanAttributeSettings(finalize: boolean) {

    if (this.config.attributes != undefined) {
      for (const attributesEntry of Object.entries(this.config.attributes)) {
        const attribute = attributesEntry[0]
        const attributeConfig = attributesEntry[1]

        if (finalize && attributeConfig.concatenation != undefined) {
          if (attributeConfig.concatenation.sameForms != undefined
            && attributeConfig.concatenation.sameForms) {
              delete attributeConfig.concatenation.sameForms
          }
          if (attributeConfig.concatenation.differentForms != undefined
            && attributeConfig.concatenation.differentForms) {
              delete attributeConfig.concatenation.differentForms
          }
        }

        if (finalize && attributeConfig.mappings != undefined && Object.keys(attributeConfig.mappings).length == 0) {
          delete attributeConfig.mappings
        }

        if (attributeConfig.defaults != undefined) {
          for (const attributeDefault of attributeConfig.defaults) {
            if (attributeDefault.condition != undefined) {
              for (let i = attributeDefault.condition.length - 1; i >= 0; i--) {
                const attributeValueConfig = attributeDefault.condition[i]
                if (attributeValueConfig.values.length == 0) {
                  attributeDefault.condition.splice(i, 1)
                }
              }
              if (attributeDefault.condition.length == 0) {
                delete attributeDefault.condition
              }
            }
          }
          if (finalize && attributeConfig.defaults.length == 0) {
            delete attributeConfig.defaults
          }
        }

        if (finalize && attributeConfig.omit != undefined && !attributeConfig.omit) {
          delete attributeConfig.omit
        }

        if (finalize
          && attributeConfig.concatenation == undefined
          && attributeConfig.mappings == undefined
          && attributeConfig.defaults == undefined
          && attributeConfig.omit == undefined) {
            delete this.config.attributes[attribute]
        }

      }
      if (Object.keys(this.config.attributes).length == 0) {
        delete this.config.attributes
      }
    }

  }

}
