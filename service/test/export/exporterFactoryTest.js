const { expect } = require('chai');
const { exportFactory } = require('../../lib/export');
const EventModel = require('../../lib/models/event')

require('chai').should();

const eventAttrs = {
    id: 303,
    name: 'Export Tests',
    forms: [],
    feedIds: [],
    layerIds: [],
    style: {},
    acl: {},
}

describe("export factory", function () {

    it("should create kml exporter", function () {
        const exporter = exportFactory.createExportTransform('kml', { event: new EventModel.Model(eventAttrs) });
        expect(exporter).to.not.be.undefined;
        expect(exporter).to.not.be.null;
    });

    it("should create geojson exporter", function () {
        const exporter = exportFactory.createExportTransform('geojson', { event: new EventModel.Model(eventAttrs) });
        expect(exporter).to.not.be.undefined;
        expect(exporter).to.not.be.null;
    });

    it("should create csv exporter", function () {
        const exporter = exportFactory.createExportTransform('csv', { event: new EventModel.Model(eventAttrs) });
        expect(exporter).to.not.be.undefined;
        expect(exporter).to.not.be.null;
    });

    it("should create geopackage exporter", function () {
        const exporter = exportFactory.createExportTransform('geopackage', { event: new EventModel.Model(eventAttrs) });
        expect(exporter).to.not.be.undefined;
        expect(exporter).to.not.be.null;
    });

    it("should handle unsupported exporter", function () {
        const exporter = exportFactory.createExportTransform('fake', { event: new EventModel.Model(eventAttrs) });
        expect(exporter).to.be.undefined;
    });
});