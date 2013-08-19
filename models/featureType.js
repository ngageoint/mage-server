var types = [
  { name: 'At Venue'               , icon: 'building'    , kmlIcon: ''},
  { name: 'Protest'                , icon: 'fist'        , kmlIcon: 'protest'},
  { name: 'Other Event'            , icon: 'calendar'    , kmlIcon: ''},
  { name: 'Parade Event'           , icon: 'ballon'      , kmlIcon: ''},
  { name: 'CBRN Hazard'            , icon: 'radio-active', kmlIcon: ''},
  { name: 'Crowd'                  , icon: 'people'      , kmlIcon: 'crowd'},
  { name: 'Explosion'              , icon: 'new'         , kmlIcon: ''},
  { name: 'Fire'                   , icon: 'fire'        , kmlIcon: ''},
  { name: 'Medical Incident'       , icon: 'ambulance'   , kmlIcon: ''},
  { name: 'Transportation Incident', icon: 'warning-sign', kmlIcon: ''},
  { name: 'Other Activity'         , icon: 'activity'    , kmlIcon: ''},
  { name: 'Shots Fired'            , icon: 'gun'         , kmlIcon: ''},
  { name: 'Significant Incident'   , icon: 'asterisk'    , kmlIcon: ''},
  { name: 'Suspicious Individual'  , icon: 'running'     , kmlIcon: ''},
  { name: 'Suspicious Vehicle'     , icon: 'car'         , kmlIcon: ''},
  { name: 'Suspicious Package'     , icon: 'gift'        , kmlIcon: ''},
  { name: 'Violent Activity'       , icon: 'hit'         , kmlIcon: ''},
  { name: 'Remain Over Night'      , icon: 'moon-fill'   , kmlIcon: ''},
  { name: 'Arrival'                , icon: 'login'       , kmlIcon: ''},
  { name: 'Departure'              , icon: 'logout'      , kmlIcon: ''},
  { name: 'Aeronautical Incident'  , icon: 'plane'       , kmlIcon: ''},
  { name: 'Maritime Incident'      , icon: 'anchor'      , kmlIcon: ''},
  { name: 'Evacuation'             , icon: 'ban-circle'  , kmlIcon: ''},
  { name: 'Hostage'                , icon: 'hostage'     , kmlIcon: ''},
  { name: 'Kidnapping'             , icon: 'kidnap'      , kmlIcon: ''},
  { name: 'VIP'                    , icon: 'star'        , kmlIcon: ''}
];

exports.getFeatureTypes = function() {
	return types;
}