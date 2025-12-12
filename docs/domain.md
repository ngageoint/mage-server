# MAGE Application Domain

## Goals

### Situational Awareness
The primary goal of MAGE is to facilitate situational awareness for teams during an event or coordinated operation.  MAGE enables event participants in the field to capture geotagged, timestamped data, called observations, about subjects of interest.  As field users capture and submit observations, MAGE immediately shares them with all other event participants.  To make data capture easy and accurate, MAGE provides customizable data entry forms with fields to describe subjects relevant to a particular customer's domain.  To enrich the custom form data, users can attach media, including photos, videos, and audio, using mobile devices and immediately share the data with other event participants.  MAGE includes an optional to track and report the locations of event participants using mobile devices in the field so all participants can know each other's current location.  MAGE displays the observations and locations of all participants on a map on the participants' mobile devices.  Non-field participants, such as administrators, event coordinators, or monitors, can also view the observations and locations of participants on a map using a desktop computer or laptop.  Users can use this desktop view as a dashboard that displays event observations and locations as they change.  Event participants can also use the dashboard to create or modify observations as they occur or later during analysis.

### Disconnected Data Collection
Another goal of MAGE is to enable field users without connectivity to continue collecting data on a mobile device, then automatically synchronize the collected data when connectivity is again available.  In some situations, field users may even deliberately disable their mobile device's connectivity as an operational security measure to avoid connecting to distrusted or potentially hostile networks.  While this may not directly support near real-time situational awareness, disconnected data collection is important for the ability to collect and analyze data to support near or long term customer-specific business decisions.

### Analysis and Decision Support
Of course, because MAGE collects and stores data structured for specific customer domains, a natural goal that follows is to make that data available for analysis to support customer business decisions.  While MAGE does not focus on providing analysis tools as core functionality, MAGE provides functionality to export data in standard formats that other analysis tools can consume, such as QGIS, ESRI, and Google Earth.  Additionally, MAGE's extensibility allows for the development of plugins and tools that support processing and analysis to derive further value for customers.

### Security

### Flexibility

## Customer Domain Applications
### Disaster Response
### Law Enforcement/Tactical Operations
### Security Detail
### Agriculture
### Forestry
### Animal Study
### Maintenance Reporting
### Insurance

## Supporting Features

### Symbology

### Layers

### Offline Maps
The MAGE mobile app allows users to load and view offline geospatial data.  The MAGE mobile app downloads and saves observations and locations from other participants of the same event when the device has connectivity.  When a field user's device loses connectivity, the app will still have the local cache of downloaded observations and locations to reference on the map.  Additionally, field users can download relevant data from other sources to their mobile devices and use MAGE to load the data to view on the MAGE map.  MAGE primarily leverages the standard [GeoPackage](http://www.geopackage.org/) format to manage offline map data.  These capabilities enhance and support MAGE users' ability to perform disconnected data collection.

### Feeds
Feeds are supplemental data sets that participants can add to their active event context. An event participant can select feeds to add from a list of feeds that an administrator has made available to the event.  Feed content could have any combination of spatial, temporal, or informational dimensions.  A participant can view the content of a feed in a list view and on the map as appropriate.  Feeds enhance situational awareness by adding timely information relevant to a customer's domain and/or particular event.

#### Background
Many MAGE customers have enterprise data sources available to them that are relevant to their particular mission domain and can aid  field users.  For example, a disaster response team responding to an earthquake may desire to receive continuous updates about seismic activity in their operating area, including alerts and locations of detected tremors.  That data would originate from a service external to MAGE, but would be highly useful to incorporate directly in the responders' MAGE user experience.  The responder could then view the data without switching to another app, as well as see that data in the same context as their team's MAGE observations and team member locations.

### Tracking

## Core Terms

### Feature
A feature represents a physical object or occurrence that has spatial and/or temporal attributes.  A spatial attribute is the geographic location and shape of a feature and includes single points, (e.g. latitude and longitude), and geographic geometry structures such as lines and polygon shapes.  A temporal attribute could be a single instantaneous timestamp (e.g., 1 January 2020 at 10:35:40.555 AM) or a temporal duration (e.g., 2020-01-01 through 2020-01-31).  See **feature** from https://www.ogc.org/ogc/glossary/f.

#### GeoJSON Note
[GeoJSON](https://geojson.org) overloads the term [`feature`](https://tools.ietf.org/html/rfc7946#section-3.2) to mean any JSON data record that complies with the GeoJSON specification's `Feature` definition.  While the MAGE `feature` term refers to a physical object or occurrence in the real world, a GeoJSON `Feature` object is a data record, and several GeoJSON `Feature` objects could be describing a single real-world `feature`.  For example, one GeoJSON `Feature` object could describe a building using a single point geometry, and another GeoJSON object could describe the same building using a polygon geometry to describe the shape of the building's footprint.

### Observation
An observation is a discrete data record a user creates to describe a subject, including structured form data and attached media such as photos, videos, and audio.  An observation is itself a `feature` because it has intrinsic attributes of the location and time the user created the observation.

### Subject
A subject of an observation is a physical object or occurrence of interest about which human users collect data to create an observation; the reason a human user submits an observation.  The subject of an observation is a `feature`.

### Form
A form is a collection of data entry fields that define the structure of the data values a user must capture for an observation.  See **Observation** above for examples.

#### Examples
An observation created as part of an animal study could include a data entry form with values for the species, the behavior, the habitat, and notes.  Such an observation would likely include photos, videos, and/or audio recording of the animal subject.

Observations created by a disaster response team could include forms for physical property damage, humanitarian issues, and emergency medical circumstances.

### Form Field
A form field is a named data entry element that accepts a single value from a user.  A form field defines the domain-specific, semantic name of the captured value, as well as the type of data value the user must provide.  A form field may also define input rules for the captured data, such as a numeric field that does not allow values less than zero.

#### Examples
A text form field named `Incident summary` would require a user to input free text describing an incident.

A date form field named `Estimated completion` would require a user to input a date string, or more commonly, require a user a select a date from a calendar, estimating when a project will be finished.

A numeric form field named `Subject height (inches)` would require a user to input a number indicating the height in inches of an observed person or animal.

A select list form field named `Hair color` would require a user to select a single text value from a list of given options, such as `Black`, `Brown`, `Blonde`, `Gray`, `White`.

### Form Field Type
A form field type refers to the type of data a form field captures along with the method and constraints of capturing the data value.  Many form fields could have the same type, all with the same input method and validation constraints, but having different meanings depending on the customer's domain and the subject the form data describes.

#### Examples
An `email` form field type would accept a text string representing an email address.  The input method would be a simple text input box in which the user manually types an email address.  The `email` type would define validation constraints on the input, namely requiring the `name@domain` standard email format.  Given this form field type, a single form could define several `email` type form fields that have different meanings in a customer's domain.  For example, a customer could define a form that has `email` type form fields called `Point of contact email` and `Witness email`.

### Form Entry
A form entry is the collection of data values a user entered into the form fields of one instance of a form.

### Field
The field refers to the place where mobile device users can observe and collect data on objects and occurrences of interest.

### Field User
A field user is a human user collecting data in the field with a mobile device.

### Event
An event is a scope to manage users, the data they collect, and the data they are allowed to see.  A customer can assign its MAGE users to an event.  The observations those users create while participating in the event will only be available to other users participating in the event.  All observations exist within the scope of an event.  Similarly, the reported locations of users participating in an event are only visible to other users participating in the same event.  A customer also assigns forms to an event, so the types of observations the participants can create are based on the forms assigned to the event.

An event defines the observation data participants can submit.  Events may define one or more forms into which participants enter observation data about a subject.  Each form defines one or more form fields of varying types into which a participant enters a data value of the field's type, such as a date, text, number, email, etc.  An event may impose validation rules on submitted observations, such as minimum and/or maximum number of entries for a given form.  Form fields may impose validation rules on individual data values, such as required vs. optional, minimum and/or maximum numeric values, text input patterns, or allowed attachment media types.

### Participant
A participant is a user that has access to the data associated with a specific event, as well as to submit observations for the event.

### Field Participant
A field participant is a participant of an event that is actively collecting observations for the event using a mobile device.

### Monitor
A monitor is a participant of an event that is not actively collecting data for the event in the field.

### Location
A location is the reported geospatial position of a field participant.  Locations, therefore, only exist within the scope of an event.

### Team

### Coordinator

### Event Manager

### Team Manager

### Map

### Map Layer

### Mobile Device

### Connectivity
Connectivity refers to the ability of a mobile device to send and receive data over the internet.

## Feeds Terms

### Feed
A feed is a stream of some type of content that users can fetch to supplement and enhance their situational awareness while using MAGE.  An administrator makes feeds available to participants.

#### Examples
A feed could produce a stream of weather alerts from the National Weather Service.

Some of the more well-known instances of feeds come from social networks like Twitter and Facebook, which publish content as continuously updating feeds of distinct messages, articles, and media.

An Open Geospatial Consortium (OGC) [API - Features](http://www.opengis.net/doc/IS/ogcapi-features-1/1.0) service (OAF) can provide feed content in the form of collections geospatial features with attributes and geometries that MAGE can present on a map and in a list.

### Topic
A topic establishes the general subject and type of content that appears in feeds derived from the topic.  An administrator defines a feed from a topic by configuring appropriate parameters to fetch content from the topic.

#### Examples
Drawing from the examples in `Feed` above, a weather feed service could provide topic such as _Alerts_.  An administrator could then define feeds such as _Tornado Warnings_, _Lightning Warnings_, _Flash Flood Warnings_ that further refine the topic.  Alternatively, if the weather service provides all those topics separately, the administrator could choose to make the topic content directly available as a feed per each topic.

Social network services, like Twitter, provide a topic for each individual user of the service.  Users publish content to their topic, and other users can fetch the published content from those users' topics.

In the case of an OAF provider, the feature collections the service provides are topics from which consumers can fetch geospatial feature content.

### Feed Service
A feed service provides one or more topics and publishes content to the topics.  A feed service provides the means to connect remotely and fetch new content from topics.  Most often in practice, a feed service is a web service accessible by HTTP over the internet.

### Feed Service Type
A feed service type defines the interface for fetching content from a feed service.  The feed service type is a plugin component that the MAGE application uses to fetch and transform content from feed services conforming to the interface the feed service type represents.

#### Examples
Twitter defines its own web-based service application programming interface (API) that consumers can use to fetch Twitter data.

An OAF service conforms to the OAF standard interface with well defined operations and parameters for fetching data.  An OAF service type plugin could then integrate any feed service that conforms to the OAF standard with no additional changes to the MAGE application code.

### Content
### Content Type

## Tracking Terms

### Objective
An objective is a physical object that a `field participant` is tracking.

### Geofence
