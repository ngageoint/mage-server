module.exports = Layer;

Layer.$inject = ['$resource'];

function Layer($resource) {
  const Layer = $resource(
    '/api/layers/:id',
    {
      id: '@id',
    },
    {
      get: {
        headers: {
          Accept: 'application/json',
        },
      },
      create: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      update: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      makeAvailable: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        url: '/api/layers/:id/available',
        params: {
          available: true,
        },
      },
      queryByEvent: {
        method: 'GET',
        isArray: true,
        url: '/api/events/:eventId/layers',
      },
      closestFeatureByLayer: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        isArray: true,
        url: '/api/events/:eventId/features',
      },
      count: {
        method: 'GET',
        url: '/api/layers/count',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    },
  );

  Layer.prototype.$save = function(params, success, error) {
    if (this.type === 'Feature') {
      delete this.base;
      delete this.format;
      delete this.wms;
    } else if (this.type === 'Imagery') {
      if (this.format !== 'WMS') {
        delete this.wms;
      }
    }

    if (this.id) {
      this.$update(params, success, error);
    } else {
      this.$create(params, success, error);
    }
  };

  return Layer;
}
