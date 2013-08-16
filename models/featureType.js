var types = [
  { name: 'At Venue', icon: 'building' },
  { name: 'Protest', icon: 'fist' },
  { name: 'Other Event', icon: 'calendar' },
  { name: 'Parade Event', icon: 'ballon' },
  { name: 'CBRN Hazard', icon: 'radio-active' },
  { name: 'Crowd', icon: 'people' },
  { name: 'Explosion', icon: 'new' },
  { name: 'Fire', icon: 'fire' },
  { name: 'Medical Incident', icon: 'ambulance' },
  { name: 'Transportation Incident', icon: 'warning-sign'},
  { name: 'Other Activity', icon: 'activity' },
  { name: 'Shots Fired', icon: 'gun' },
  { name: 'Significant Incident', icon: 'asterisk'},
  { name: 'Suspicious Individual', icon: 'running' },
  { name: 'Suspicious Vehicle', icon: 'car' },
  { name: 'Suspicious Package', icon: 'gift' },
  { name: 'Violent Activity', icon: 'hit' },
  { name: 'Remain Over Night', icon: 'moon-fill' },
  { name: 'Arrival', icon: 'login' },
  { name: 'Departure', icon: 'logout' },
  { name: 'Aeronautical Incident', icon: 'airplane' },
  { name: 'Maritime Incident', icon: 'anchor' },
  { name: 'Evacuation', icon: 'ban-circle' },
  { name: 'Hostage', icon: 'hostage' },
  { name: 'Kidnapping', icon: 'kidnap' },
  { name: 'VIP', icon: 'star' }
];

exports.getFeatureTypes = function() {
	return types;
}