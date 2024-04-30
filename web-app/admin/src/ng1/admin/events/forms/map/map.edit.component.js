import _ from 'underscore';
import angular from 'angular';

class AdminFormMapEditController {
  constructor($state, $stateParams, $filter, $uibModal, $transitions, $timeout, LocalStorageService, Event, Form, FormIcon) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$filter = $filter;
    this.$uibModal = $uibModal;
    this.$transitions = $transitions;
    this.$timeout = $timeout;
    this.LocalStorageService = LocalStorageService;
    this.Event = Event;
    this.Form = Form;
    this.FormIcon = FormIcon;

    this.unSavedChanges = false;
    this.unSavedUploads = false;
    this.token = LocalStorageService.getToken();
  
    this.icons = {};
    this.iconMap = {};
    this.styleMap = {};
  
    this.formSaved = false;
    this.filesToUpload = [];
    this.saveTime = 0;

    this.fileUploadOptions = {};
    this.styleKeys = ['fill', 'fillOpacity', 'stroke', 'strokeOpacity', 'strokeWidth'];
  }

  $onInit() {
    this.Event.get({id: this.$stateParams.eventId}, event => {
      this.event = event;
  
      if (this.$stateParams.formId) {
        var form = _.find(event.forms, form => {
          return form.id.toString() === this.$stateParams.formId;
        });
        this.form = new this.Form(form);
  
        _.each(this.form.fields, field => {
          if (field.name === this.form.primaryField) {
            this.primaryField = field;
          }
        });
      } else {
        this.form = new this.Form();
        this.form.archived = false;
        this.form.color = '#' + (Math.random()*0xFFFFFF<<0).toString(16);
        this.form.fields = [];
        this.form.userFields = [];
      }
  
      this.mapStyles();
      this.fetchIcons(this.$stateParams.eventId, this.$stateParams.formId);
      this.populateVariants();
    });

    this.$transitions.onStart({}, transition => { 
      if (this.unSavedChanges) {
        var modalInstance = this.$uibModal.open({
          component: 'adminEventFormEditUnsaved'
        });
  
        modalInstance.result.then(() => {
          this.unSavedChanges = false;
          transition.run();
        });

        return false;
      }

      return true;
    });
  }

  fetchIcons() {
    this.FormIcon.query({eventId: this.$stateParams.eventId, formId: this.$stateParams.formId}, formIcons => {
      _.each(formIcons, icon => {
        if (icon.primary && icon.variant) {
          if (!this.icons[icon.primary]) {
            this.icons[icon.primary] = {};
          }

          this.icons[icon.primary][icon.variant] = _.extend(this.icons[icon.primary][icon.variant] || {}, icon);
        } else if (icon.primary) {
          this.icons[icon.primary] = _.extend(this.icons[icon.primary] || {}, icon);
        } else {
          this.icons = icon;
        }
      });

      this.mapIcons();
    });
  }

  mapIcons() {
    if (this.primaryField) {
      _.each(this.primaryField.choices, primary => {
        this.iconMap[primary.title] = {
          icon: this.getIcon(primary.title)
        };

        _.each(this.variants, variant => {
          this.iconMap[primary.title][variant.title] = {
            icon: this.getIcon(primary.title, variant.title)
          };
        });
      });
    }

    this.iconMap.icon = this.getIcon();
  }


  getIcon(primary, variant) {
    if (primary && this.icons[primary] && variant && this.icons[primary][variant] && this.icons[primary][variant].icon) {
      return this.icons[primary][variant].icon;
    } else if (primary && this.icons[primary] && this.icons[primary].icon) {
      return this.icons[primary].icon;
    } else {
      return this.icons.icon;
    }
  }

  mapStyles() {
    if (this.primaryField) {
      _.each(this.primaryField.choices, primary => {
        this.styleMap[primary.title] = {
          style: this.getStyle(primary.title)
        };

        _.each(this.variants, variant => {
          this.styleMap[primary.title][variant.title] = {
            style: this.getStyle(primary.title, variant.title)
          };
        });
      });
    }

    this.styleMap.style = this.getStyle();
  }

  getStyle(primary, variant) {
    if (!this.event || !this.form) return;

    var style = this.form.style || this.event.style;

    if (primary && style[primary] && variant && style[primary][variant]) {
      return _.pick(style[primary][variant], this.styleKeys);
    } else if (primary && style[primary]) {
      return _.pick(style[primary], this.styleKeys);
    } else {
      return _.pick(style, this.styleKeys);
    }
  }

  onIconAdded(event) {
    var icon = event.icon;
    var primary = event.primary;
    var variant = event.variant;

    this.filesToUpload.push({
      file: event.file,
      primary: primary,
      variant: variant
    });

    if (primary && variant) {
      this.icons[primary] = this.icons[primary] || {};
      this.icons[primary][variant] = _.extend(this.icons[primary][variant] || {}, {icon: icon});

      this.iconMap[primary][variant].icon = this.getIcon(primary, variant);
    } else if (primary) {
      this.icons[primary] = _.extend(this.icons[primary] || {}, {icon: icon});

      _.each(this.variants, variant => {
        this.iconMap[primary][variant.title].icon = this.getIcon(primary, variant.title);
      });
    } else {
      this.icons = _.extend(this.icons || {}, {icon: icon});

      if (this.primaryField) {
        _.each(this.primaryField.choices, primary => {
          _.each(this.variants, variant => {
            this.iconMap[primary.title][variant.title].icon = this.getIcon(primary.title, variant.title);
          });

          this.iconMap[primary.title].icon = this.getIcon(primary.title);
        });
      }
    }

    this.unSavedChanges = true;
  }

  onStyleChanged(event) {
    var style = event.style;
    var primary = event.primary;
    var variant = event.variant;

    this.form.style = this.form.style || angular.copy(this.event.style);

    if (primary && variant) {
      if (!this.form.style[primary]) {
        this.form.style[primary] = angular.copy(this.form.style);
      }
      this.form.style[primary][variant] = _.extend(this.form.style[primary][variant] || {}, style);

      this.styleMap[primary][variant].style = this.getStyle(primary, variant);
    } else if (primary) {
      this.form.style[primary] = _.extend(this.form.style[primary] || {}, style);

      _.each(this.variants, variant => {
        this.styleMap[primary][variant.title].style = this.getStyle(primary, variant.title);
      });
    } else {
      this.form.style = _.extend(this.form.style || {}, style);
    }

    this.unSavedChanges = true;
  }

  save() {
    this.formSaved = false;
    this.saving = true;

    this.form.$save({eventId: this.event.id, id: this.form.id}, () => {
      _.each(this.form.fields, field => {
        if (this.isMemberField(field)) {
          field.choices = [];
        }
      });

      // Upload icons if any
      _.each(this.filesToUpload, fileUpload => {
        this.upload(fileUpload);
      });

      this.saving = false;
      this.formSaved = true;
      this.completeSave();
    }, response => {
      var data = response.data || {};
      this.showError({
        title:  'Error Saving Form',
        message: data.errors ?
          'If the problem persists please contact your MAGE administrator for help.' :
          'Please try again later, if the problem persists please contact your MAGE administrator for help.',
        errors: data.errors
      });
      this.saving = false;
    });
  }

  completeSave() {
    if (this.filesToUpload.length === 0 && this.formSaved) {
      this.saving = false;
      this.unSavedChanges = false;
      delete this.exportError;

      this.fetchIcons();
      this.mapStyles();
    }
  }

  upload(fileUpload) {
    var url = '/api/events/' + this.event.id + '/icons/' + this.form.id +
      (fileUpload.primary ? '/' + fileUpload.primary : '') +
      (fileUpload.variant ? '/' + fileUpload.variant : '');

    var formData = new FormData();
    formData.append('icon', fileUpload.file);

    jQuery.ajax({
      url: url,
      type: 'POST',
      headers: {
        'Authorization':'Bearer ' + this.LocalStorageService.getToken(),
      },
      xhr: () => {
        var myXhr = jQuery.ajaxSettings.xhr();
        return myXhr;
      },
      success: () => {
        this.$timeout(() => {
          this.filesToUpload = _.reject(this.filesToUpload, upload => {
            return fileUpload.file === upload.file;
          });

          this.completeSave();
        });
      },
      data: formData,
      cache: false,
      contentType: false,
      processData: false
    });
  }

  showError(error) {
    this.$uibModal.open({
      component: 'adminEventFormEditError',
      resolve: {
        model: () => {
          return error;
        }
      }
    });
  }

  populateVariants() {
    if (!this.form) return;

    this.primaryField = _.find(this.form.fields, field => {
      return field.name === this.form.primaryField;
    });

    this.variantField = _.find(this.form.fields, field => {
      return field.name === this.form.variantField;
    });

    if (!this.primaryField || this.primaryField.archived) {
      this.variants = [];
      this.form.primaryField = null;
      this.form.variantField = null;
      this.mapIcons();
      this.mapStyles();

      return;
    }

    if (!this.variantField) {
      // they do not want a variant
      this.variants = [];
      this.form.variantField = null;
      this.mapIcons();
      this.mapStyles();

      return;
    }

    if (this.variantField.type === 'dropdown') {
      this.variants = this.$filter('orderBy')(this.variantField.choices, 'value');
      this.showNumberVariants = false;
    } else if (this.variantField.type === 'date') {
      this.variantField.choices = this.variantField.choices || [];
      this.variants = this.$filter('orderBy')(this.variantField.choices, 'value');
      this.showNumberVariants = true;
    }

    this.mapIcons();
    this.mapStyles();
  }

  primaryChanged() {
    this.populateVariants();
    this.unSavedChanges = true;
  }

  variantChanged() {
    this.populateVariants();
    this.unSavedChanges = true;
  }

  symbologyFilter(otherFilterField, currentFilterField) {
    return function(field) {
      return field.type === 'dropdown' && 
        (!otherFilterField || otherFilterField.name !== field.name) && 
        ((currentFilterField && field.name === currentFilterField.name) || !field.archived);
    };
  }

  removeVariant(variant) {
    this.variantField.choices = _.without(this.variantField.choices, variant);
    this.variants = this.$filter('orderBy')(this.variantField.choices, 'value');
  }

  addVariantOption(min) {
    var newOption = {
      id: this.variantField.choices.length,
      title: min,
      value: min
    };

    this.variantField.choices = this.variantField.choices || new Array();
    this.variantField.choices.push(newOption);
    this.variants = this.$filter('orderBy')(this.variantField.choices, 'value');
  }

  isMemberField (field) {
    return _.contains(this.form.userFields, field.name);
  }
}

AdminFormMapEditController.$inject = ['$state', '$stateParams', '$filter', '$uibModal', '$transitions', '$timeout', 'LocalStorageService', 'Event', 'Form', 'FormIcon'];

export default {
  template: require('./map.edit.html'),
  controller: AdminFormMapEditController
};

