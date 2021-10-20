# Tracking

Tracking refers to the ability to track a specific, identifiable geospatial feature as its location changes.  Tracking is related to feeds, because the main motivation for this capability is to allow users to track features from data feeds that external systems provide.  A common example is a system that receives data from from sensors that detect movement or objects and publishes location data about the detections.  This could be something like a tagged animal in an animal study, or fleet vehicles that continuously share their location to a server.

## Scenarios

### Track feature from feed

#### Actors
1. Field Participant (FP)

#### Assumptions
1. FP has access to one or more feeds available in the active event.

#### Main Flow
1. FP observes a feed feature on the map.
1. FP requests details about the feed feature.
1. The app presents details about the feed feature.
1. FP requests to track the feed feature.
1. The app indicates tracking is active for the feature.
1. FP returns to the map.
1. The app indicates tracking is active and presents the changing location of the objective feature relative to FP's location on the map.

### Explicit tracking assignment

#### Actors
1. Event Manager (EM)
1. Field Participant (FP)

#### Main Flow

### Configure geofence tracking assignment

#### Actors
1. Event Manager (FP)

#### Main Flow

### Geofence tracking assignment

#### Actors
1. Field Participant (FP)

#### Assumptions
1. FP has access to one or more feeds available in the active event.
1. An Event Manager has previously configured geofence tracking assignment for FP's active event.

#### Main Flow
1. FP moves to a location within the configured geofence of a feed feature.
1. The app presents an alert that FP has entered the geofence of the feed feature and tracking for the feature will now activate.
1. FP acknowledges the alert.
1. The app indicates tracking is active and presents the changing location of the objective feature relative to FP's location on the map.