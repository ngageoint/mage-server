/**
 * Private utility cl***REMOVED*** for Ext.layout.container.Border.
 * @private
 */
Ext.define('Ext.resizer.BorderSplitter', {
    extend: 'Ext.resizer.Splitter',

    uses: ['Ext.resizer.BorderSplitterTracker'],

    alias: 'widget.bordersplitter',

    // must be configured in by the border layout:
    collapseTarget: null,

    getTrackerConfig: function () {
        var trackerConfig = this.callParent();

        trackerConfig.xcl***REMOVED*** = 'Ext.resizer.BorderSplitterTracker';

        return trackerConfig;
    }
});
