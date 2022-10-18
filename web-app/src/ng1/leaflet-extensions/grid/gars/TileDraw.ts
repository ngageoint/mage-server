import { Grid, GridLabel, GridLine } from "@ngageoint/gars-js";
import { GridTile } from "@ngageoint/grid-js";

/**
 * Tile draw utilities for lines and labels
 *
 */
export class TileDraw {

    /**
     * Draw the lines on the tile
     *
     * @param lines  lines to draw
     * @param tile   tile
     * @param grid   grid
     * @param canvas draw canvas
     */
    public static drawLines(lines: GridLine[], tile: GridTile, grid: Grid, canvas: CanvasRenderingContext2D): void {

        for (const line of lines) {
            canvas.lineWidth = grid.getWidth(line.getGridType());
            canvas.beginPath();
            this.addPolyline(tile, canvas, line);
            canvas.closePath();
            const lineColor = grid.getColor(line.getGridType());
            canvas.strokeStyle = lineColor ? lineColor.getColorHex() : 'black';
            canvas.stroke();
        }
    }

    /**
     * Add the polyline to the path
     *
     * @param tile tile
     * @param canvas line path
     * @param line line to draw
     */
    private static addPolyline(tile: GridTile,  canvas: CanvasRenderingContext2D, line: GridLine): void {

        const metersLine = line.toMeters();
        const point1 = metersLine.getPoint1();
        const point2 = metersLine.getPoint2();

        const pixel = point1.getPixelFromTile(tile);
        canvas.moveTo(pixel.getX(), pixel.getY());

        const pixel2 = point2.getPixelFromTile(tile);
        canvas.lineTo(pixel2.getX(), pixel2.getY());
    }

    /**
     * Draw the labels on the tile
     *
     * @param labels labels to draw
     * @param tile   tile
     * @param grid grid 
     * @param canvas draw canvas
     */
    public static drawLabels(labels: GridLabel[], tile: GridTile, grid: Grid, canvas: CanvasRenderingContext2D): void {
        for (const label of labels) {
            this.drawLabel(label, tile, grid, canvas);
        }
    }

    /**
     * Draw the label
     *
     * @param label  label to draw
     * @param tile   tile
     * @param grid grid
     * @param canvas draw canvas
     */
    public static drawLabel(label: GridLabel, tile: GridTile,  grid: Grid, canvas: CanvasRenderingContext2D): void {

        const name = label.getName();

        const textMetrics = canvas.measureText(name);

        // Determine the text bounds
        const textWidth = textMetrics.width;
        //TODO figure this height out
        const textHeight = grid.getLabeler().getTextSize();// textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

        // Determine the pixel width and height of the label grid zone to the tile
        const pixelRange = label.getBounds().getPixelRangeFromTile(tile);

        // Determine the maximum width and height a label in the grid should be
        const gridPercentage = 1.0 - (2 * grid.getLabelBuffer());
        const maxWidth = gridPercentage * pixelRange.getWidth();
        const maxHeight = gridPercentage * pixelRange.getHeight();

        // If it fits, draw the label in the center of the grid zone
        if (textWidth <= maxWidth && textHeight <= maxHeight) {
            const centerPixel = label.getCenter().getPixelFromTile(tile);
            // TODO figure this out
            // canvas.fillText(name, centerPixel.getX() - textBounds.exactCenterX(), centerPixel.getY() - textBounds.exactCenterY());
            canvas.font = textHeight.toString() + 'px monospace';
            canvas.fillStyle = grid.getLabeler().getColor().getColorHex();
            canvas.textBaseline = 'middle';
            canvas.textAlign = 'center';
            canvas.fillText(name, centerPixel.getX(), centerPixel.getY());
        }
    }
}
