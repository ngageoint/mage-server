<?php
/**
 * @cl***REMOVED*** Users
 * A simple application controller extension
 */
cl***REMOVED*** Example extends ApplicationController {
    
    public function reset() {
        $res = new Response();
        $res->success = true;
        
        global $dbh;
        $dbh->reset();
        
        return $res->to_json();
    }
    
}

