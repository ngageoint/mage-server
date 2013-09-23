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

exports.getFeatureTypes = function() {
	return types;
}