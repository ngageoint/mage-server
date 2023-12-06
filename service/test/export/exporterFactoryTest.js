const { expect } = require('chai');
const { createExportTransform } = require('../../lib/export');

require('chai').should();

describe("export factory", function () {

    it("should create kml exporter", function () {
        const exporter = createExportTransform('kml', {});
        expect(exporter).to.not.be.undefined;
        expect(exporter).to.not.be.null;
    });

    it("should create geojson exporter", function () {
        const exporter = createExportTransform('geojson', {});
        expect(exporter).to.not.be.undefined;
        expect(exporter).to.not.be.null;
    });

    it("should create csv exporter", function () {
        const exporter = createExportTransform('csv', {});
        expect(exporter).to.not.be.undefined;
        expect(exporter).to.not.be.null;
    });

    it("should create geopackage exporter", function () {
        const exporter = createExportTransform('geopackage', {});
        expect(exporter).to.not.be.undefined;
        expect(exporter).to.not.be.null;
    });

    it("should handle unsupported exporter", function () {
        const exporter = createExportTransform('fake', {});
        expect(exporter).to.be.undefined;
    });
});