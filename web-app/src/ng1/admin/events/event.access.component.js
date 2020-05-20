import _ from 'underscore';

class AdminEventAccessController {
  constructor($state, $stateParams, $q, $filter, Event, EventAccess, UserService, UserPagingService) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$q = $q;
    this.$filter = $filter;
    this.Event = Event;
    this.EventAccess = EventAccess;
    this.UserService = UserService;
    this.UserPagingService = UserPagingService;

    this.aclMembers = [];

    this.nonMember = null;

    //This is the list of users returned from a search
    this.nonMemberSearchResults = [];
    this.isSearching = false;
    this.userState = 'all';
    this.nonAclUserState = this.userState + '.nonacl';
    this.memberSearch = '';
    this.stateAndData = this.UserPagingService.constructDefault();
  
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
  }

  $onInit() {
    this.$q.all({event: this.Event.get({id: this.$stateParams.eventId, populate: false}).$promise}).then(result => {  
      this.role = {
        selected: this.roles[0]
      };
  
      let clone = JSON.parse(JSON.stringify(this.stateAndData[this.userState]));
      this.stateAndData[this.nonAclUserState] = clone;
      delete this.stateAndData['active'];
      delete this.stateAndData['inactive'];
      delete this.stateAndData['disabled'];

      let aclIds = Object.keys(result.event.acl);
      let allIds = aclIds.concat(result.event.userIds);

      this.stateAndData[this.userState].userFilter.in = { _id: Object.keys(result.event.acl) };
      this.stateAndData[this.userState].countFilter.in = { _id: Object.keys(result.event.acl) };
      this.stateAndData[this.nonAclUserState].userFilter.nin = { _id: allIds };
      this.stateAndData[this.nonAclUserState].countFilter.nin = { _id: allIds };
      this.UserPagingService.refresh(this.stateAndData).then(() => {
        this.refreshMembers(result.event);
      });
    });
  }

  refreshMembers(event) {
    this.event = event;

    this.aclMembers = _.map(this.event.acl, (access, userId) => {
      var member = _.pick(this.UserPagingService.users(this.stateAndData[this.userState]).find(user => user.id == userId), 'displayName', 'avatarUrl', 'lastUpdated');
      member.id = userId;
      member.role = {
        selected: _.find(this.roles, role => { return role.name === access.role; })
      };
      return member;
    });

    this.owners = _.filter(this.aclMembers, member => {
      return member.role === 'OWNER';
    });
  }

  count() {
    return this.UserPagingService.count(this.stateAndData[this.userState]);
  }

  hasNext() {
    return this.UserPagingService.hasNext(this.stateAndData[this.userState]);
  }

  next() {
    this.UserPagingService.next(this.stateAndData[this.userState]).then(() => {
      this.refreshMembers(this.team);
    });
  }

  hasPrevious() {
    return this.UserPagingService.hasPrevious(this.stateAndData[this.userState]);
  }

  previous() {
    this.UserPagingService.previous(this.stateAndData[this.userState]).then(() => {
      this.refreshMembers(this.team);
    });
  }

  search() {
    this.UserPagingService.search(this.stateAndData[this.userState], this.memberSearch).then(() => {
      this.refreshMembers(this.team);
    });
  }

  searchNonMembers(searchString) {
    this.isSearching = true;
    return this.UserPagingService.search(this.stateAndData[this.nonAclUserState], searchString).then(users => {
      this.nonMemberSearchResults = users;
      this.isSearching = false;
      return this.nonMemberSearchResults;
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
      this.UserPagingService.refresh().then(() => {
        this.refreshMembers(event);
      });
    });
  }

  updateRole(member, role) {
    this.EventAccess.update({
      eventId: this.event.id,
      userId: member.id,
      role: role.name
    }, event => {
      this.UserPagingService.refresh().then(() => {
        this.refreshMembers(event);
      });
    });
  }

  gotoUser(member) {
    this.$state.go('admin.user', { userId: member.id });
  }

}

AdminEventAccessController.$inject = ['$state', '$stateParams', '$q', '$filter', 'Event', 'EventAccess', 'UserService', 'UserPagingService'];

export default {
  template: require('./event.access.html'),
  controller: AdminEventAccessController
};