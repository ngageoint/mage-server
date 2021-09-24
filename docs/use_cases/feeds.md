# Feeds Use Cases

See the [Feeds section](../domain.md#feeds) in the domain document for a summary of the feeds concept.

## Notes
Some feeds may contain sensitive content and require some kind of authentication and authorization.  Sometimes this could even require clients to authenticate and fetch data directly from a feed endpoint, excluding the MAGE server, to support customer security requirements.

Feeds could be made available globally to all users of a particular MAGE instance, or restricted based on event membership, or perhaps even restricted to specific users.

Only administrators and event managers should have permission to create a feed and assign a feed to an event.  Event managers may only be able to create certain types of feeds and only assign feeds to events they manage, while administrators can create any type of feed and assign feeds to any event.

A single feed could be assigned to multiple events.

A feed implementation should be a plugin that can be deployed alongside core MAGE.  The feed plugin would implement an adapter interface that can fetch data from the feed service and transform the data to a format MAGE can present to the user.  A feed plugin could provide multiple feeds from a single source.  For example, an external service could provide several different data sets from a single API, such as NGA's Maritime Safety Information [ReST API](https://msi.nga.mil/api/swagger-ui.html).  A single plugin may also be able to communicate to many different sources, for example an RSS/GeoRSS/Atom feed plugin, or an OGC WFS plugin would be able to fetch data from any service implementing those specifications.  A feed plugin should register its feed implementations with core MAGE to make those implementations available for administrators to configure.

## Scenarios

### 1. Add feed to active event

#### Actors
1. Participant (P1)

#### Assumptions
1. P1 is authenticated and has access to the active event.
1. A feed, F1, is assigned to the participant's active event.

#### Main Flow
1. P1 requests to add a feed to the active event.
1. The app presents a list of feeds available for the active event with brief summaries of their content.
1. P1 selects the desired feed.
1. The app begins the `Fetch content from feed` flow.

#### Result
P1 is able to view the feed content in the context of the active event, including observations and other participant locations.

### Fetch content from feed

#### Actors
1. Participant (P1)

#### Assumptions
1. P1 is authenticated and has access to the active event.
1. A feed, F1, is assigned to the participant's active event.

#### Main Flow
1. P1 requests to fetch content for F1.
1. The app begins fetching the feed content and presents an indication the feed content is loading.
1. The app indicates the fetch is complete and presents the fetched content items.

#### Variations
1. The app initiates the main flow without an explicit request from P1, usually based on a regular interval trigger or some notification from another application.

#### Result
The app presents the feed content with a geospatial dimension on the map, as well as in a list of elements with various attributes and text, depending on the nature of the feed content.

### Modify feed parameters

#### Summary
A participant user can modify fetch parameters of a feed to customize the content as desired.

#### Actors
1. Participant (P1)

### Configure new feed service

#### Actors
1. Administrator (A1)

#### Assumptions
1. A1 is an authenticated user with administrative privileges

#### Main Flow
1. A1 requests to configure a new feed service.
1. The app presents a list of registered feed service types.
1. A1 selects the desired service type.
1. The app presents the configuration options for the new feed service.
   * Options for a feed service would generally include a URL the app will use to fetch feeds data from the feed service.
1. A1 changes the options as desired.
1. A1 requests to test the provided options by fetching data from the feed service.
1. The app presents the list of topics the feed service provides.
1. A1 confirms the new feed service.
1. The app presents a prompt asking A1 to configure new feeds from the service.
1. A1 requests to configure new feeds from the service.
1. The app begins the [`Configure new feed`](#configure-new-feed) flow assuming the selection of the newly configured feed service.

#### Result
The new feed service is saved and available to configure new feeds.

### Configure new feed

#### Actors
1. Administrator (A1)

#### Assumptions
1. A1 is an authenticated user with administrative privileges.

#### Main Flow
1. A1 requests to configure a new feed.
2. The app presents a list of registered feed services.
3. A1 selects the desired feed service.
4. The app presents the list of topics the feed service provides.
5. A1 selects the desired topic.
6. The app presents the content fetch parameters for the topic.
7. A1 groups the fetch parameters according to parameters that the user can change when fetching feed content and parameters that remain constant across all fetches by all users.
   * Potential parameters could be geographic bounding box, maximum age of content, maximum number of items to fetch, caching options, etc.
8. A1 enters the desired values for the constant fetch parameters.
9. A1 enters sample values for the variable fetch parameters and requests a preview of the feed content with the configured parameters.
10. The app begins fetching preview content from the feed service with the configured options.
11. The fetch completes and the app presents the preview content.
12. A1 examines the preview and confirms the configuration for the new feed.
13. The app stores the configuration for the new feed and prompts whether to add the feed to an event.
14. A1 requests to add the new feed to an event.
15. The app begins the `Assign feed to event` flow assuming the selection of the newly configured feed.

#### Result
The new feed configuration is saved and the feed is available to add to events.

#### Variations

##### Assign an icon to the feed
The app uses a feed's icon to visually represent and distinguish the feed from other feeds in a list.  The app can also use the feed's icon as a map marker for feeds whose items have a geospatial dimension.
1. In step 6. of the main flow, the app will also present the icon the topic specifies along an option to use the topic's icon, or to assign a new icon to the feed.
   * This may include fetching and importing an icon from a remote service if the topic's icon reference is a remote URL.
2. A1 indicates they want to modify the icon for the feed.
3. The app presents the available choices of registered icons and an option to supply a new icon.
4. A1 selects a registered icon, or supplies a new icon via upload, or by URL.
5. The app replaces the previously presented icon with the selected icon for the new feed.
A1 continues to complete the Main Flow.

### Assign feed to event

#### Actors
1. Administrator (A1)

#### Assumptions
1. A1 is an authenticated user with administrative privileges.
1. A feed (F1) A1 wishes to assign to an event exists.
1. An event (E1) to which A1 wishes to assign F1 exists.

#### Main Flow
1. A1 requests the list of available events.
1. The app presents the list of events.
1. A1 chooses the desired event E1.
1. The app presents the E1 configuration including the list of feeds assigned
   to E1.
1. A1 requests to assign a feed to E1.
1. The app presents the list of available feeds.
1. A1 chooses the desired feed F1.
1. The app adds F1 to the list of feeds assigned to E1.

#### Result
Participants of the event E1 have permission to fetch data of feed F1 within E1.

### Remove feed from event

### Configure existing feed

### Delete feed