import _ from 'underscore';

class AdminEventController {
  constructor($state, $stateParams, $filter, $q, $uibModal, LocalStorageService, UserService, Event, Team, Layer) {
    this.$state = $state;
    this.$stateParams = $stateParams;
    this.$filter = $filter;
    this.$q = $q;
    this.$uibModal = $uibModal;
    this.UserService = UserService;
    this.Event = Event;
    this.Team = Team;
    this.Layer = Layer;

    this.token = LocalStorageService.getToken();

    this.showArchivedForms = false;
  
    this.editTeams = false;
    this.eventMembers = [];
    this.teamsPage = 0;
    this.teamsPerPage = 10;
  
    this.editLayers = false;
    this.eventLayers = [];
    this.layersPage = 0;
    this.layersPerPage = 10;
  
    this.teams = [];
    this.layers = [];
  
    this.member = {};
  
    this.eventTeam;

    // For some reason angular is not calling into filter function with correct context
    this.filterMembers = this._filterMembers.bind(this);    
    this.filterLayers = this._filterLayers.bind(this);
  }

  $onInit() {
    this.$q.all({users: this.UserService.getAllUsers(), teams: this.Team.query().$promise, layers: this.Layer.query().$promise, event: this.Event.get({id: this.$stateParams.eventId, populate: false}).$promise}).then(result => {
      this.teams = result.teams;
      let teamsById = _.indexBy(result.teams, 'id');
  
      this.layers = result.layers;
      let layersById = _.indexBy(result.layers, 'id');
  
      this.event = result.event;
  
      var eventTeamId = _.find(this.event.teamIds, teamId => {
        if (teamsById[teamId]) {
          return teamsById[teamId].teamEventId === this.event.id;
        }
      });
      this.eventTeam = teamsById[eventTeamId];
  
      var teamIdsInEvent = _.filter(this.event.teamIds, teamId => {
        if (teamsById[teamId]) {
          return teamsById[teamId].teamEventId !== this.event.id;
        }
      });
      var teamsInEvent = _.map(teamIdsInEvent, teamId => { return teamsById[teamId]; });
  
      var usersInEvent = _.filter(result.users, user => {
        return _.findWhere(this.eventTeam.users, {id: user.id});
      });
  
      this.eventMembers = _.map(usersInEvent.concat(teamsInEvent), item => { return this.normalize(item); });
  
      var teamsNotInEvent = _.filter(this.teams, team => {
        return this.event.teamIds.indexOf(team.id) === -1 && !team.teamEventId;
      });
      var usersNotInEvent = _.reject(result.users, user => {
        return _.findWhere(this.eventTeam.users, {id: user.id});
      });
      this.eventNonMembers = _.map(usersNotInEvent.concat(teamsNotInEvent), item => { return this.normalize(item); });
  
      this.layer = {};
      this.eventLayers = _.chain(this.event.layerIds)
        .filter(layerId => {
          return layersById[layerId]; })
        .map(layerId => {
          return layersById[layerId];
        }).value();
  
      this.nonLayers = _.filter(this.layers, layer => {
        return this.event.layerIds.indexOf(layer.id) === -1;
      });
  
      var myAccess = this.event.acl[this.UserService.myself.id];
      var aclPermissions = myAccess ? myAccess.permissions : [];
  
      this.hasReadPermission = _.contains(this.UserService.myself.role.permissions, 'READ_EVENT_ALL') || _.contains(aclPermissions, 'read');
      this.hasUpdatePermission = _.contains(this.UserService.myself.role.permissions, 'UPDATE_EVENT') || _.contains(aclPermissions, 'update');
      this.hasDeletePermission = _.contains(this.UserService.myself.role.permissions, 'DELETE_EVENT') || _.contains(aclPermissions, 'delete');
    });
  }

  _filterMembers(item) {
    var filteredMembers = this.$filter('filter')([item], this.memberSearch);
    return filteredMembers && filteredMembers.length;
  }

  _filterLayers(layer) {
    var filteredLayers = this.$filter('filter')([layer], this.layerSearch);
    return filteredLayers && filteredLayers.length;
  }

  normalize(item) {
    return {
      id: item.id,
      name: item.name || item.displayName,
      type: item.name ? 'team' : 'user'
    };
  }

  addMember(member) {
    member.type === 'user' ? this.addUser(member) : this.addTeam(member);
  }

  removeMember(member) {
    member.type === 'user' ? this.removeUser(member) : this.removeTeam(member);
  }

  addTeam(team) {
    this.member = {};
    this.event.teamIds.push(team.id);
    this.eventMembers.push(team);
    this.eventNonMembers = _.reject(this.eventNonMembers, item => { return item.id === team.id; });

    this.Event.addTeam({id: this.event.id}, team);
  }

  removeTeam(team) {
    this.event.teamIds = _.reject(this.event.teamIds, teamId => {return teamId === team.id; });
    this.eventMembers = _.reject(this.eventMembers, item => { return item.id === team.id; });
    this.eventNonMembers.push(team);

    this.Event.removeTeam({id: this.event.id, teamId: team.id});
  }

  addUser(user) {
    this.member = {};
    this.eventMembers.push(user);
    this.eventNonMembers = _.reject(this.eventNonMembers, item => { return item.id === user.id; });

    this.eventTeam.users.push({id: user.id});
    this.eventTeam.$save(() => {
      this.event.$get({populate: false});
    });
  }

  removeUser(user) {
    this.eventMembers = _.reject(this.eventMembers, item => { return item.id === user.id; });
    this.eventNonMembers.push(user);

    this.eventTeam.users = _.reject(this.eventTeam.users, u => { return user.id === u.id; });
    this.eventTeam.$save(() => {
      this.event.$get({populate: false});
    });
  }

  addLayer(layer) {
    this.layer = {};
    this.event.layerIds.push(layer.id);
    this.eventLayers.push(layer);
    this.nonLayers = _.reject(this.nonLayers, l => { return l.id === layer.id; });

    this.Event.addLayer({id: this.event.id}, layer);
  }

  removeLayer(layer) {
    this.event.layerIds = _.reject(this.event.layerIds, layerId => {return layerId === layer.id;});
    this.eventLayers = _.reject(this.eventLayers, l => { return l.id === layer.id;});
    this.nonLayers.push(layer);

    this.Event.removeLayer({id: this.event.id, layerId: layer.id});
  }

  editEvent(event) {
    this.$state.go('admin.eventEdit', { eventId: event.id });
  }

  editAccess(event) {
    this.$state.go('admin.eventAccess', { eventId: event.id });
  }

  editForm(event, form) {
    this.$state.go('admin.formEdit', { eventId: event.id, formId: form.id });
  }

  gotoMember(member) {
    if (member.type === 'user') {
      this.$state.go('admin.user', { userId: member.id });
    } else {
      this.$state.go('admin.team', { teamId: member.id });
    }
  }

  gotoLayer(layer) {
    this.$state.go('admin.layer', { layerId: layer.id });
  }

  completeEvent(event) {
    event.complete = true;
    event.$save(updatedEvent => {
      this.event = updatedEvent;
    });
  }

  activateEvent(event) {
    event.complete = false;
    event.$save(() => {
      event.complete = false;
    });
  }

  createForm() {
    this.formCreateOpen = {opened: true};
  }

  onFormCreateClose(form) {
    this.formCreateOpen = {opened: false};
    if (form.id) {
      this.$state.go('admin.formEdit', { eventId: this.event.id, formId: form.id });
    } else {
      this.$state.go('admin.fieldsCreate', { eventId: this.event.id, form: form });
    }
  }

  moveFormUp($event, form) {
    $event.stopPropagation();

    var forms = this.event.forms;

    var from = forms.indexOf(form);
    var to = from - 1;
    forms.splice(to, 0, forms.splice(from, 1)[0]);

    this.event.$save();
  }

  moveFormDown($event, form) {
    $event.stopPropagation();

    var forms = this.event.forms;

    var from = forms.indexOf(form);
    var to = from + 1;
    forms.splice(to, 0, forms.splice(from, 1)[0]);

    this.event.$save();
  }

  preview($event, form) {
    $event.stopPropagation();

    this.$uibModal.open({
      resolve: {
        form: () => {
          return form;
        }
      },
      component: "adminEventFormPreview"
    });
  }

  deleteEvent() {
    var modalInstance = this.$uibModal.open({
      resolve: {
        event: () => {
          return this.event;
        }
      },
      component: "adminEventDelete"
    });

    modalInstance.result.then(() => {
      this.$state.go('admin.events');
    });
  }
}

AdminEventController.$inject = ['$state', '$stateParams', '$filter', '$q', '$uibModal', 'LocalStorageService', 'UserService', 'Event', 'Team', 'Layer'];

export default {
  template: require('./event.html'),
  controller: AdminEventController
};