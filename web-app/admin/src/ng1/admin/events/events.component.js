import _ from 'underscore';

class AdminEventsController {
  constructor($state, $filter, $uibModal, Event, UserService) {
    this.$state = $state;
    this.$filter = $filter;
    this.$uibModal = $uibModal;
    this.Event = Event;
    this.UserService = UserService;

    this.events = [];
    this.filter = 'active'; // possible values all, active, complete
    this.page = 0;
    this.itemsPerPage = 10;

    this.projection = {
      name: true,
      description: true,
      acl: true,
      complete: true
    };

    // For some reason angular is not calling into filter function with correct context
    this.filterEvents = this._filterEvents.bind(this);
    this.filterComplete = this._filterComplete.bind(this);
  }

  $onInit() {
    this.Event.query(
      {
        state: 'all',
        populate: false,
        projection: JSON.stringify(this.projection)
      },
      (events) => {
        this.events = events;
      }
    );
  }

  handleSearchChange() {
    const filtered = this.events.filter((event) => this._filterEvents(event));

    // If there are filtered results, reset to page 0, else keep the current page
    this.page = filtered.length > 0 ? 0 : this.page;
  }

  _filterEvents(event) {
    const searchTerm = this.eventSearch.trim().toLowerCase();
    if (!searchTerm) {
      return true;
    }
    const nameMatches = event.name.toLowerCase().includes(searchTerm);
    const descriptionMatches =
      event.description && event.description.toLowerCase().includes(searchTerm);
    return nameMatches || descriptionMatches;
  }

  _filterComplete(event) {
    switch (this.filter) {
      case 'all':
        return true;
      case 'active':
        return !event.complete;
      case 'complete':
        return event.complete;
    }
  }

  reset() {
    this.page = 0;
    this.eventSearch = '';
  }

  newEvent() {
    this.$state.go('admin.eventCreate');
  }

  gotoEvent(event) {
    this.$state.go('admin.event', { eventId: event.id });
  }

  editEvent($event, event) {
    $event.stopPropagation();

    this.$state.go('admin.eventEdit', { eventId: event.id });
  }

  hasUpdatePermission(event) {
    return this.hasPermission(event, 'update');
  }

  hasDeletePermission(event) {
    return this.hasPermission(event, 'delete');
  }

  hasPermission(event, permission) {
    var myAccess = event.acl[this.UserService.myself.id];
    var aclPermissions = myAccess ? myAccess.permissions : [];

    switch (permission) {
      case 'update':
        return (
          _.contains(
            this.UserService.myself.role.permissions,
            'UPDATE_EVENT'
          ) || _.contains(aclPermissions, 'update')
        );
      case 'delete':
        return (
          _.contains(
            this.UserService.myself.role.permissions,
            'DELETE_EVENT'
          ) || _.contains(aclPermissions, 'delete')
        );
    }
  }

  deleteEvent($event, event) {
    $event.stopPropagation();

    var modalInstance = this.$uibModal.open({
      resolve: {
        event: () => {
          return event;
        }
      },
      component: 'adminEventDelete'
    });

    modalInstance.result.then((event) => {
      this.events = _.without(this.events, event);
    });
  }
}

AdminEventsController.$inject = ['$state', '$filter', '$uibModal', 'Event', 'UserService'];

export default {
  template: require('./events.html'),
  controller: AdminEventsController
};