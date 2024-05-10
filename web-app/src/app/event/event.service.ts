import { Injectable } from "@angular/core";
import { Subject } from "rxjs";
import * as _ from 'underscore';
import * as moment from 'moment'

@Injectable({
  providedIn: 'root'
})
export class EventService {

  eventsById:any = {}

  private observationsSource = new Subject<any>()

  observations$ = this.observationsSource.asObservable()

  isUserInEvent(user: any, event: any) {
    if (!event) return false

    return _.some(event.teams, function (team: any) {
      return _.contains(team.userIds, user.id)
    });
  }

  getForms(observation: any, options?: any) {
    var event = this.eventsById[observation.eventId]
    return this.getFormsForEvent(event, options)
  }

  getFormsForEvent(event: any, options: any) {
    options = options || {}
    var forms = event.forms
    if (options.archived === false) {
      forms = _.filter(forms, function (form: any) {
        return !form.archived
      });
    }

    return forms;
  }

  getFormField(form: any, fieldName: any) {
    return _.find(form.fields, function (field: any) { return field.name === fieldName })
  }

  createForm(observationForm: any, formDefinition: any, viewModel?: any) {
    const form = (JSON.parse(JSON.stringify(formDefinition)))

    form.remoteId = observationForm.id

    const existingPropertyFields = []

    _.each(observationForm, function (value: any, key: any) {
      const field = this.getFormField(form, key)
      if (field) {
        if (field.type === 'date' && field.value) {
          field.value = moment(value).toDate()
        } else {
          field.value = value
        }
        existingPropertyFields.push(field)
      }
    });

    if (viewModel) {
      observationForm.fields = _.intersection(observationForm.fields, existingPropertyFields)
    }

    return form
  }

}