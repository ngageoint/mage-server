// SS / PDC
var types = [
  { name: 'At Venue'               , icon: 'building'    , kmlIcon: 'at-venue'},
  { name: 'Protest'                , icon: 'fist'        , kmlIcon: 'protest'},
  { name: 'Other Event'            , icon: 'calendar'    , kmlIcon: 'other-event'},
  { name: 'Parade Event'           , icon: 'ballon'      , kmlIcon: 'parade'},
  { name: 'CBRN Hazard'            , icon: 'radio-active', kmlIcon: 'cbrn-hazard'},
  { name: 'Crowd'                  , icon: 'people'      , kmlIcon: 'crowd'},
  { name: 'Explosion'              , icon: 'new'         , kmlIcon: 'explosion'},
  { name: 'Fire'                   , icon: 'fire'        , kmlIcon: 'fire'},
  { name: 'Medical Incident'       , icon: 'ambulance'   , kmlIcon: 'medical-incident'},
  { name: 'Transportation Incident', icon: 'warning-sign', kmlIcon: 'transportation-incident'},
  { name: 'Other Activity'         , icon: 'activity'    , kmlIcon: 'other-activity'},
  { name: 'Shots Fired'            , icon: 'gun'         , kmlIcon: 'shots-fired'},
  { name: 'Significant Incident'   , icon: 'asterisk'    , kmlIcon: 'significant-incident'},
  { name: 'Suspicious Individual'  , icon: 'running'     , kmlIcon: 'suspicious-individual'},
  { name: 'Suspicious Vehicle'     , icon: 'car'         , kmlIcon: 'suspicious-vehicle'},
  { name: 'Unattended/Suspicious Package', icon: 'gift'        , kmlIcon: 'suspicious-package'},
  { name: 'Violent Activity'       , icon: 'hit'         , kmlIcon: 'violent-activity'},
  { name: 'Remain Over Night'      , icon: 'moon-fill'   , kmlIcon: 'ron'},
  { name: 'Arrival'                , icon: 'login'       , kmlIcon: 'arrival'},
  { name: 'Departure'              , icon: 'logout'      , kmlIcon: 'departure'},
  { name: 'Aeronautical Incident'  , icon: 'plane'       , kmlIcon: 'aeronautical-incident'},
  { name: 'Maritime Incident'      , icon: 'anchor'      , kmlIcon: 'maritime-incident'},
  { name: 'Evacuation'             , icon: 'ban-circle'  , kmlIcon: 'evacuation'},
  { name: 'Hostage'                , icon: 'hostage'     , kmlIcon: 'hostage'},
  { name: 'Kidnapping'             , icon: 'kidnap'      , kmlIcon: 'kidnapping'},
  { name: 'VIP'                    , icon: 'star'        , kmlIcon: 'vip'}
];

// var types = [{ 
//   name: 'UNDEFINED', 
//   icon: 'img/***REMOVED***-icons/undefined.png', 
//   kmlIcon: 'at-venue'
// },{ 
//   name: 'Structure No Damage', 
//   icon: 'img/***REMOVED***-icons/structure_no_damage.png', 
//   kmlIcon: 'protest'
// },{ 
//   name: 'Structure Damaged', 
//   icon: 'img/***REMOVED***-icons/structure_damaged.png',
//   kmlIcon: 'other-event'
// },{ 
//   name: 'Structure Failed', 
//   icon: 'img/***REMOVED***-icons/structure_failed.png', 
//   kmlIcon: 'parade'
// },{ 
//   name: 'Structure Destroyed', 
//   icon: 'img/***REMOVED***-icons/structure_destroyed.png', 
//   kmlIcon: 'cbrn-hazard'
// },{ 
//   name: 'Assisted', 
//   icon: 'img/***REMOVED***-icons/***REMOVED***isted.png', 
//   kmlIcon: 'crowd'
// },{ 
//   name: 'Evacuated', 
//   icon: 'img/***REMOVED***-icons/evacuated.png',
//   kmlIcon: 'explosion'
// },{ 
//   name: 'Rescued', 
//   icon: 'img/***REMOVED***-icons/rescued.png', 
//   kmlIcon: 'fire'
// },{ 
//   name: 'USAR Follow-Up Form', 
//   icon: 'img/***REMOVED***-icons/***REMOVED***_follow_up_form.png',
//   kmlIcon: 'medical-incident'
// },{ 
//   name: 'Victim Detected',
//   icon: 'img/***REMOVED***-icons/victim_detected.png',
//   kmlIcon: 'transportation-incident'
// },{ 
//   name: 'Confirmed Victim', 
//   icon: 'img/***REMOVED***-icons/confirmed_victim.png', 
//   kmlIcon: 'other-activity'
// },{ 
//   name: 'Human Remains', 
//   icon: 'img/***REMOVED***-icons/human_remains.png', 
//   kmlIcon: 'shots-fired'
// },{ 
//   name: 'Confirmed Victim Removed',
//   icon: 'img/***REMOVED***-icons/confirmed_victim_removed.png', 
//   kmlIcon: 'significant-incident'
// },{ 
//   name: 'Shelter in Place',
//   icon: 'img/***REMOVED***-icons/shelter_in_place.png',
//   kmlIcon: 'suspicious-individual'
// },{ 
//   name: 'Animal Issue', 
//   icon: 'img/***REMOVED***-icons/animal_issue.png', 
//   kmlIcon: 'suspicious-vehicle'
// },{ 
//   name: 'Emergency Shelter', 
//   icon: 'img/***REMOVED***-icons/emergency_shelter.png', 
//   kmlIcon: 'suspicious-package'
// },{ 
//   name: 'Emergency Food Distribution Center', 
//   icon: 'img/***REMOVED***-icons/emergency_food_distribution_center.png', 
//   kmlIcon: 'violent-activity'
// },{ 
//   name: 'Fire Incident', 
//   icon: 'img/***REMOVED***-icons/fire_incident.png', 
//   kmlIcon: 'ron'
// },{ 
//   name: 'Hazardous Material Incident', 
//   icon: 'img/***REMOVED***-icons/hazardous_material_incident.png', 
//   kmlIcon: 'arrival'
// },{ 
//   name: 'Targeted Search', 
//   icon: 'img/***REMOVED***-icons/targeted_search.png', 
//   kmlIcon: 'departure'
// },{ 
//   name: 'Flood/Water Level', 
//   icon: 'img/***REMOVED***-icons/flood_water_level.png', 
//   kmlIcon: 'aeronautical-incident'
// },{ 
//   name: 'Helicopter Landing Site', 
//   icon: 'img/***REMOVED***-icons/helicopter_landing_site.png', 
//   kmlIcon: 'maritime-incident'
// },{ 
//   name: 'Route Blocked', 
//   icon: 'img/***REMOVED***-icons/route_blocked.png', 
//   kmlIcon: 'evacuation'
// },{ 
//   name: 'Extra 23', 
//   icon: 'img/***REMOVED***-icons/extra_23.png', 
//   kmlIcon: 'hostage'
// },{ 
//   name: 'Extra 24', 
//   icon: 'img/***REMOVED***-icons/extra_24.png', 
//   kmlIcon: 'kidnapping'
// }];

exports.getFeatureTypes = function() {
	return types;
}