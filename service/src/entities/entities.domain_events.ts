
/*
This is a placeholder for defining MAGE's domain event service.  This will
require some future thought about how to organize and expose domain events
for plugin subscriptions.

For example, this module could define a DomainEventService inteface which
would then have an impelmentation in the adapter layer that the main module
creates and injects as appropriate.

The common example across many articles/publications is to utilize the ORM
(usually Hibernate) to trigger domain events after persisting entities.  I
personally dislike that solution and prefer to rely as little as possible on
the ORM layer.

Reading:
https://enterprisecraftsmanship.com/posts/domain-events-simple-reliable-solution/
https://enterprisecraftsmanship.com/posts/merging-domain-events-dispatching/
*/