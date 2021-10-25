const expect = require('chai').expect
    , ExporterFactory = require('../../export/exporterFactory');

require('chai').should();

describe("exporter factory tests", function () {

    it("should create kml exporter", function (done) {
        const exporter = ExporterFactory.createExporter('kml', {});
        expect(exporter).to.not.be.undefined;
        expect(exporter).not.not.be.null;
        done();
    });

    it("should create geojson exporter", function (done) {
        const exporter = ExporterFactory.createExporter('geojson', {});
        expect(exporter).to.not.be.undefined;
        expect(exporter).not.not.be.null;
        done();
    });

    it("should create csv exporter", function (done) {
        const exporter = ExporterFactory.createExporter('csv', {});
        expect(exporter).to.not.be.undefined;
        expect(exporter).not.not.be.null;
        done();
    });

    it("should create geopackage exporter", function (done) {
        const exporter = ExporterFactory.createExporter('geopackage', {});
        expect(exporter).to.not.be.undefined;
        expect(exporter).not.not.be.null;
        done();
    });

    it("should handle unsupported exporter", function (done) {
        const exporter = ExporterFactory.createExporter('fake', {});
        expect(exporter).to.be.undefined;
        done();
    });
});