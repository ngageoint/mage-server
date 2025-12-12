import _ from 'underscore';

class AdminEventsController {
  constructor($state, $filter, $uibModal, Event, UserService) {
    this.$state = $state;
    this.$filter = $filter;
    this.$uibModal = $uibModal;
    this.Event = Event;
    this.UserService = UserService;

    this.events = [];
    this.totalEvents = 0;
    this.filter = 'active'; // possible values all, active, complete
    this.page = 0;
    this.itemsPerPage = 10;
    this.eventSearch = '';
    this.searchTimeout = null;

    this.projection = {
      name: true,
      description: true,
      acl: true,
      complete: true
    };
  }

  $onInit() {
    this.loadEvents();
  }

  loadEvents() {
    const params = {
      state: this.filter,
      populate: false,
      projection: JSON.stringify(this.projection),
      page: this.page,
      page_size: this.itemsPerPage,
      includePagination: true
    };

    if (this.eventSearch && this.eventSearch.trim()) {
      params.term = this.eventSearch.trim();
    }

    this.Event.queryWithPagination(params, (response) => {
      this.events = response.items || [];
      this.totalEvents = response.totalCount || 0;
    });
  }

  handleSearchChange() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.page = 0;
      this.loadEvents();
    }, 300);
  }

  handleFilterChange() {
    this.page = 0;
    this.loadEvents();
  }

  handlePageChange() {
    this.loadEvents();
  }

  nextPage() {
    if ((this.page + 1) * this.itemsPerPage < this.totalEvents) {
      this.page++;
      this.loadEvents();
    }
  }

  previousPage() {
    if (this.page > 0) {
      this.page--;
      this.loadEvents();
    }
  }

  reset() {
    this.page = 0;
    this.eventSearch = '';
    this.filter = 'active';
    this.loadEvents();
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