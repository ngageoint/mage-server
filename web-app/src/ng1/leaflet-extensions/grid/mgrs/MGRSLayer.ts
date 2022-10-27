import { Grids, GridZones, ZoomGrids } from "@ngageoint/mgrs-js";
import { GridTile } from "@ngageoint/grid-js";
import { Coords, DoneCallback, DomUtil, GridLayerOptions, GridLayer } from "leaflet";
import { TileDraw } from "./TileDraw";

export class MGRSLayer extends GridLayer {

    private readonly grids: Grids;

    constructor(options?: GridLayerOptions) {
        super(options);
        this.grids = Grids.create()
    }

    /** @inheritdoc */
    protected createTile(coords: Coords, done: DoneCallback): HTMLElement {
        const zoom = coords.z;

        // create a <canvas> element for drawing
        const tile = DomUtil.create('canvas', 'leaflet-tile') as HTMLCanvasElement;

        // setup tile width and height according to the options
        const size = this.getTileSize();
        tile.width = size.x;
        tile.height = size.y;

        const context = tile.getContext('2d', { alpha: true });
        context.clearRect(0, 0, tile.width, tile.height);

        if (tile.getContext) {
            this.drawTile(context, tile, coords.x, coords.y, zoom).then(() => {
                done(null, tile);
            }).catch(err => {
                done(err);
            });
        }

        // return the tile so it can be rendered on screen
        return tile;
    }

    /**
     * Draw the tile
     *
     * @param tile  tile
     * @param x    x coordinate
     * @param y    y coordinate
     * @param zoom zoom level
     * @return bitmap
    */
    private drawTile(context: CanvasRenderingContext2D, tile: HTMLCanvasElement, x: number, y: number, zoom: number): Promise<void> {
        const zoomGrids = this.grids.getGrids(zoom);
        if (zoomGrids.hasGrids()) {
            this.drawTileFromTile(context, GridTile.tile(tile.width, tile.height, x, y, zoom), zoomGrids);
        }
        return Promise.resolve();
    }

    /**
     * Draw the tile
     *
     * @param gridTile  tile
     * @param zoomGrids zoom grids
     * @return bitmap tile
    */
    private drawTileFromTile(context: CanvasRenderingContext2D, gridTile: GridTile, zoomGrids: ZoomGrids): void {

        const gridRange = GridZones.getGridRange(gridTile.getBounds());

        for (const grid of zoomGrids.getGrids()) {
            gridRange.reset();
            for (const zone of gridRange) {
                const lines = grid.getLinesFromGridTile(gridTile, zone);
                if (lines) {
                    TileDraw.drawLines(lines, gridTile, grid, zone, context);
                }
    
                const labels = grid.getLabelsFromGridTile(gridTile, zone);
                if (labels) {
                    TileDraw.drawLabels(labels, gridTile, grid, context);
                }
            }
        }
    }
}