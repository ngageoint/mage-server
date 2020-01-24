import _ from 'underscore';

class AdminEventAccessController {
  constructor($state, $stateParams, $q, $filter, Event, EventAccess, UserService) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$q = $q;
    this.$filter = $filter;
    this.Event = Event;
    this.EventAccess = EventAccess;
    this.UserService = UserService;

    this.users = [];

    this.member = {};
  
    this.roles = [{
      name: 'GUEST',
      title: 'Guest',
      description: 'Read only access to this event.'
    },{
      name: 'MANAGER',
      title: 'Manager',
      description: 'Read and Update access to this event.'
    },{
      name: 'OWNER',
      title: 'Owner',
      description: 'Read, Update and Delete access to this event.'
    }];

    // For some reason angular is not calling into filter function with correct context
    this.filterMembers = this._filterMembers.bind(this);  
  }

  $onInit() {
    this.$q.all({users: this.UserService.getAllUsers(), event: this.Event.get({id: this.$stateParams.eventId, populate: false}).$promise}).then(result => {
      this.users = result.users;
  
      this.role = {
        selected: this.roles[0]
      };
  
      this.refreshMembers(result.event);
    });
  }

  _filterMembers(member) {
    var filteredMembers = this.$filter('filter')([member], this.memberSearch);
    return filteredMembers && filteredMembers.length;
  }

  refreshMembers(event) {
    this.event = event;

    var usersById = _.indexBy(this.users, 'id');

    this.eventMembers = _.map(this.event.acl, (access, userId) => {
      var member = _.pick(usersById[userId], 'displayName', 'avatarUrl', 'lastUpdated');
      member.id = userId;
      member.role = {
        selected: _.find(this.roles, role => { return role.name === access.role; })
      };

      return member;
    });

    this.nonMembers = _.reject(this.users, user => {
      return _.where(this.eventMembers, {id: user.id}).length > 0;
    });

    this.owners = this.getOwners();
  }

  getOwners() {
    return _.filter(this.eventMembers, member => {
      return member.role.selected.name === 'OWNER';
    });
  }

  addMember(member, role) {
    this.EventAccess.update({
      eventId: this.event.id,
      userId: member.id,
      role: role.name
    }, event => {
      delete this.member.selected;
      this.refreshMembers(event);
    });
  }

  removeMember(member) {
    this.EventAccess.delete({
      eventId: this.event.id,
      userId: member.id
    }, event => {
      this.refreshMembers(event);
    });
  }

  updateRole(member, role) {
    this.EventAccess.update({
      eventId: this.event.id,
      userId: member.id,
      role: role.name
    }, event => {
      this.refreshMembers(event);
    });
  }

  gotoUser(member) {
    this.$state.go('admin.user', { userId: member.id });
  }

}

AdminEventAccessController.$inject = ['$state', '$stateParams', '$q', '$filter', 'Event', 'EventAccess', 'UserService'];

export default {
  template: require('./event.access.html'),
  controller: AdminEventAccessController
};