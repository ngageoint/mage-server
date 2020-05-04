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

    this.event = null;
    this.aclMembers = [];

    this.nonMember = null;

    //This is the list of users returned from a search
    this.nonMemberSearchResults = [];
    this.isSearching = false;

    this.userState = 'all';
    this.nonAclUserState = this.userState + '.nonacl';
    this.memberSearch = '';
    this.userPaging = UserPagingService;
    this.stateAndData = this.userPaging.constructDefault();

    this.owners = [];
  
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
    this.$q.all({event: this.Event.get({id: this.$stateParams.eventId, populate: false}).$promise}).then(result => {  
      this.event = result.event;
      this.role = {
        selected: this.roles[0]
      };
  
      let clone = JSON.parse(JSON.stringify(this.stateAndData[this.userState]));
      this.stateAndData[this.nonAclUserState] = clone;

      let aclIds = Object.keys(this.event.acl);
      let allIds = aclIds.concat(this.event.userIds);

      this.stateAndData[this.userState].userFilter.in = { userIds: Object.keys(this.event.acl) };
      this.stateAndData[this.userState].countFilter.in = { userIds: Object.keys(this.event.acl) };
      this.stateAndData[this.nonAclUserState].userFilter.nin = { userIds: allIds };
      this.stateAndData[this.nonAclUserState].countFilter.nin = { userIds: allIds };
      this.userPaging.refresh(this.stateAndData).then(() => {
        this.refreshMembers(this.event);
      });
    });
  }

  _filterMembers(member) {
    var filteredMembers = this.$filter('filter')([member], this.memberSearch);
    return filteredMembers && filteredMembers.length;
  }

  refreshMembers(event) {
    this.event = event;

    this.aclMembers = _.map(this.event.acl, (access, userId) => {
      var member = _.pick(this.userPaging.users(this.stateAndData[this.userState]).find(user => user.id == userId), 'displayName', 'avatarUrl', 'lastUpdated');
      member.id = userId;
      member.role = access.role;
      return member;
    });

    this.owners = _.filter(this.aclMembers, member => {
      return member.role === 'OWNER';
    });
  }

  count() {
    return this.userPaging.count(this.stateAndData[this.userState]);
  }

  hasNext() {
    return this.userPaging.hasNext(this.stateAndData[this.userState]);
  }

  next() {
    this.userPaging.next(this.stateAndData[this.userState]).then(() => {
      this.refreshMembers(this.team);
    });
  }

  hasPrevious() {
    return this.userPaging.hasPrevious(this.stateAndData[this.userState]);
  }

  previous() {
    this.userPaging.previous(this.stateAndData[this.userState]).then(() => {
      this.refreshMembers(this.team);
    });
  }

  search() {
    this.userPaging.search(this.stateAndData[this.userState], this.memberSearch).then(() => {
      this.refreshMembers(this.team);
    });
  }

  searchNonMembers(searchString) {
    this.isSearching = true;
    return this.userPaging.search(this.stateAndData[this.nonAclUserState], searchString).then(users => {
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
      this.userPaging.refresh().then(() => {
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
      this.userPaging.refresh().then(() => {
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