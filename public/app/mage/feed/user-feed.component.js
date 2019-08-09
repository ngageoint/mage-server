var _ = require('underscore')
  , moment = require('moment')
  , MDCSelect = require('material-components-web').select.MDCSelect
  , MDCChipSet = require('material-components-web').chips.MDCChipSet;

module.exports = {
  template: require('./user-feed.component.html'),
  controller: UserFeedController
};

UserFeedController.$inject = ['$element', '$timeout', 'EventService', '$filter', 'FilterService'];

function UserFeedController($element, $timeout, EventService, $filter, FilterService) {
  this.currentUserPage = 0;
  this.usersChanged = 0;
  this.userPages = null;
  this.followUserId = null;
  var usersPerPage = 50;

  var usersById = {};
  var followingUserId = null;
  var firstUserChange = true;
  this.feedUsers = [];
  this.feedChangedUsers = {};

  this.$postLink = function() {
    var usersChangedListener = {
      onUsersChanged: this.onUsersChanged.bind(this)
    };
    EventService.addUsersChangedListener(usersChangedListener);
  }

  this.calculateUserPages = function(users) {
    if (!users) return;

    // sort the locations
    users = $filter('orderBy')(users, function(user) {
      return moment(user.location.properties.timestamp).valueOf() * -1;
    });

    // slice into pages
    var pages = [];
    for (var i = 0, j = users.length; i < j; i += usersPerPage) {
      pages.push(users.slice(i, i + usersPerPage));
    }

    this.userPages = pages;
    this.currentUserPage = this.currentUserPage || 0;

    $timeout(() => {
    userSelectMdc = new MDCSelect($element.find('.user-select')[0])
      userSelectMdc.listen('MDCSelect:change', () => {
        $timeout(() => {
          this.currentUserPage = userSelectMdc.selectedIndex
        })
      })
    })
  }

  this.onUsersChanged = function(changed) {
    console.log('users changed', changed)
    _.each(changed.added, function(added) {
      usersById[added.id] = added;

      if (!firstUserChange) this.feedChangedUsers[added.id] = true;
    });

    _.each(changed.updated, function(updated) {
      var user = usersById[updated.id];
      if (user) {
        usersById[updated.id] = updated;

        // // pan/zoom map to user if this is the user we are following
        // if (user.id === followingUserId) MapService.zoomToFeatureInLayer(user, 'People');
      }

      if (!firstUserChange) this.feedChangedUsers[updated.id] = true;
    });

    _.each(changed.removed, function(removed) {
      delete usersById[removed.id];
    });

    // update the news feed observations
    this.feedUsers = _.values(usersById);

    firstUserChange = false;

    this.calculateUserPages(this.feedUsers);
  }
}