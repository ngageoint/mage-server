module.exports = function (app, security) {
  const { userRoleHasPermission } = require('../permissions/permissions.role-based.base');
  const { OsmSearch } = require('../utilities/osm-search');
  const { exportGeoPackage } = require('../utilities/osm-geopackage');
  const { exportCsv, exportKml } = require('../utilities/osm-download');
  const search = new OsmSearch();
  const authenticate = security.authentication.bearerAuthentication;
  const authorize = (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (userRoleHasPermission(req.user, 'READ_LAYER_ALL') || userRoleHasPermission(req.user, 'READ_LAYER_EVENT')) return next();
    res.sendStatus(403);
  };
  const errorResponse = (res, error) => res.status(error.status || 500)
    .json({ message: error.status ? error.message : 'Could not complete the OSM request. Please try again.' });

  app.post('/api/osm/search', authenticate, authorize, async (req, res) => {
    try { res.json(await search.search(String(req.user.id), req.body)); }
    catch (error) { errorResponse(res, error); }
  });

  app.post('/api/osm/export', authenticate, authorize, async (req, res) => {
    try {
      const format = req.body.format === undefined ? 'gpkg' : req.body.format;
      if (!['gpkg', 'csv', 'kml'].includes(format)) return res.status(400).json({ message: 'Choose CSV, KML or GPKG format.' });
      const features = search.selected(String(req.user.id), req.body);
      if (search.exports >= 1) return res.status(429).json({ message: 'Another export is running. Try again shortly.' });
      search.exports++;
      try {
        const buffer = format === 'gpkg' ? await exportGeoPackage(features) :
          format === 'csv' ? exportCsv(features) : exportKml(features);
        const types = { gpkg: 'application/geopackage+sqlite3', csv: 'text/csv; charset=utf-8', kml: 'application/vnd.google-earth.kml+xml' };
        res.set('Content-Disposition', `attachment; filename="osm-search.${format}"`)
          .set('X-Content-Type-Options', 'nosniff').type(types[format]).send(buffer);
      } finally { search.exports--; }
    } catch (error) { errorResponse(res, error); }
  });
};
