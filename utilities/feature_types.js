module.exports = function(options) {
   var types = [
     {name: "At Venue"                      , icon:""},
     {name: "Protest"                       , icon:"protest"},
     {name: "Other Event"                   , icon:""}, 
     {name: "Parade Event"                  , icon:""}, 
     {name: "CBRN Hazard"                   , icon:""}, 
     {name: "Crowd"                         , icon:"crowd"}, 
     {name: "Explosion"                     , icon:""}, 
     {name: "Fire"                          , icon:""}, 
     {name: "Medical Incident"              , icon:""}, 
     {name: "Transportation Incident"       , icon:""}, 
     {name: "Other Activity"                , icon:""}, 
     {name: "Shots Fired"                   , icon:""}, 
     {name: "Significant Incident"          , icon:""}, 
     {name: "Suspicious Individual"         , icon:""}, 
     {name: "Suspicious Vehicle"            , icon:""}, 
     {name: "Unattended/Suspicious Package" , icon:""}, 
     {name: "Violent Activity"              , icon:""}, 
     {name: "Remain Over Night (RON)"       , icon:""}, 
     {name: "Arrival"                       , icon:""}, 
     {name: "Departure"                     , icon:""}, 
     {name: "Aeronautical Incident"         , icon:""}, 
     {name: "Maritime Incident"             , icon:""}, 
     {name: "Evacuation"                    , icon:""}, 
     {name: "Hostage"                       , icon:""}, 
     {name: "Kidnapping"                    , icon:""}, 
     {name: "VIP"                           , icon:""}
   ];

  var getTypes = function() {
    return types;
  }

  return {
    getTypes: getTypes,
   }

}()