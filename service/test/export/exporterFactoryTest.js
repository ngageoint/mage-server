const { expect } = require('chai');
const ExporterFactory = require('../../lib/export/exporterFactory');

require('chai').should();

describe("exporter factory", function () {

    it("should create shapefile exporter", function () {
        const exporter = ExporterFactory.createExporter('shapefile', {});
        expect(exporter).to.not.be.undefined;
        expect(exporter).to.not.be.null;
    });

    it("should create kml exporter", function () {
        const exporter = ExporterFactory.createExporter('kml', {});
        expect(exporter).to.not.be.undefined;
        expect(exporter).to.not.be.null;
    });

    it("should create geojson exporter", function () {
        const exporter = ExporterFactory.createExporter('geojson', {});
        expect(exporter).to.not.be.undefined;
        expect(exporter).to.not.be.null;
    });

    it("should create csv exporter", function () {
        const exporter = ExporterFactory.createExporter('csv', {});
        expect(exporter).to.not.be.undefined;
        expect(exporter).to.not.be.null;
    });

    it("should create geopackage exporter", function () {
        const exporter = ExporterFactory.createExporter('geopackage', {});
        expect(exporter).to.not.be.undefined;
        expect(exporter).to.not.be.null;
    });

    it("should handle unsupported exporter", function () {
        const exporter = ExporterFactory.createExporter('fake', {});
        expect(exporter).to.be.undefined;
    });
});