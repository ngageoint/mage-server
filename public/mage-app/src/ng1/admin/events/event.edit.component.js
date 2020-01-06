class AdminEventEditController {
  constructor($state, $stateParams, Event) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.Event = Event;
  }

  $onInit() {
    if (this.$stateParams.eventId) {
      this.Event.get({id: this.$stateParams.eventId}, event => {
        this.event = new this.Event({
          id: event.id,
          name: event.name,
          description: event.description
        });
      });
    } else {
      this.event = new this.Event();
    }
  }

  saveEvent(event) {
    event.$save(() => {
      this.$state.go('admin.event', { eventId: event.id });
    }, response => {
      if (response.status === 500) {
        this.error = {
          message: response.data
        };
      } else if (response.data && response.data.message) {
        this.error = {
          message: 'Error Saving Event Information',
          errors: response.data.errors
        };
      }
    });
  }

  cancel() {
    if (this.event.id) {
      this.$state.go('admin.event', { eventId: this.event.id })
    } else {
      this.$state.go('admin.events');
    }
  }
}

AdminEventEditController.$inject = ['$state', '$stateParams', 'Event'];

export default {
  template: require('./event.edit.html'),
  controller: AdminEventEditController
};
