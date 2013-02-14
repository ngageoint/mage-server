/**
 * @cl***REMOVED*** Ext.direct.RemotingEvent
 * An event that is fired when data is received from a 
 * {@link Ext.direct.RemotingProvider}. Contains a method to the
 * related tra***REMOVED***ction for the direct request, see {@link #getTra***REMOVED***ction}
 */
Ext.define('Ext.direct.RemotingEvent', {
    
    /* Begin Definitions */
   
    extend: 'Ext.direct.Event',
    
    alias: 'direct.rpc',
    
    /* End Definitions */
    
    /**
     * Get the tra***REMOVED***ction ***REMOVED***ociated with this event.
     * @return {Ext.direct.Tra***REMOVED***ction} The tra***REMOVED***ction
     */
    getTra***REMOVED***ction: function(){
        return this.tra***REMOVED***ction || Ext.direct.Manager.getTra***REMOVED***ction(this.tid);
    }
});
