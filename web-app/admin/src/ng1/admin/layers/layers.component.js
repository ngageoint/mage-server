import _ from 'underscore';

class AdminLayersController {
  constructor($filter, $uibModal, $state, Layer, UserService) {
    this.$uibModal = $uibModal;
    this.$filter = $filter;
    this.$state = $state;
    this.Layer = Layer;

    this.filter = 'all';
    this.layers = [];
    this.page = 0;
    this.itemsPerPage = 10;

    this.hasLayerCreatePermission = _.contains(UserService.myself.role.permissions, 'CREATE_LAYER');
    this.hasLayerEditPermission = _.contains(UserService.myself.role.permissions, 'UPDATE_LAYER');
    this.hasLayerDeletePermission = _.contains(UserService.myself.role.permissions, 'DELETE_LAYER');

    // For some reason angular is not calling into filter function with correct context
    this.filterLayers = this._filterLayers.bind(this);
    this.filterType = this._filterType.bind(this);
  }

  $onInit() {
    this.Layer.query({ includeUnavailable: true }, layers => {
      this.layers = layers;
    });
  }

  _filterLayers(layer) {
    const filteredLayers = this.$filter('filter')([layer], this.layerSearch);
    return filteredLayers && filteredLayers.length;
  }

  _filterType(layer) {
    switch (this.filter) {
      case 'all':
        return true;
      case 'online':
        return layer.type === 'Imagery';
      case 'offline':
        return layer.type !== 'Imagery';
    }
  }

  reset() {
    this.page = 0;
    this.filter = 'all';
    this.layerSearch = '';
  }

  newLayer() {
    this.$state.go('admin.layerCreate');
  }

  gotoLayer(layer) {
    this.$state.go('admin.layer', { layerId: layer.id });
  }

  editLayer($event, layer) {
    $event.stopPropagation();

    this.$state.go('admin.layerEdit', { layerId: layer.id });
  }

  deleteLayer($event, layer) {
    $event.stopPropagation();

    const modalInstance = this.$uibModal.open({
      resolve: {
        layer: () => {
          return layer;
        },
      },
      component: 'adminLayerDelete',
    });

    modalInstance.result.then(layer => {
      this.layers = _.without(this.layers, layer);
    });
  }
}

AdminLayersController.$inject = ['$filter', '$uibModal', '$state', 'Layer', 'UserService'];

export default {
  template: require('./layers.html'),
  controller: AdminLayersController,
};
