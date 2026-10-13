import { URL } from 'url';
import * as ATAK from './atak';
import {
  FeedsError,
  ErrInvalidServiceConfig,
  FeedTopicContent
} from '@ngageoint/mage.service/lib/entities/feeds/entities.feeds';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

type TransportMock = {
  send: ReturnType<typeof jest.fn>
};

describe('atak service type', function () {
  let transport: TransportMock;
  let atak: ATAK.AtakServiceType;

  beforeEach(function () {
    transport = {
      send: jest.fn()
    };
    // AtakServiceType expects an AtakTransport; our mock matches shape.
    atak = new ATAK.AtakServiceType(transport as any);
  });

  it('validates the service config has a baseUrl', async function () {
    let err = await atak.validateServiceConfig({ url: 'invalid' } as any);
    expect(err).toBeInstanceOf(FeedsError);
    expect(err?.code).toEqual(ErrInvalidServiceConfig);

    err = await atak.validateServiceConfig({ baseUrl: 'http://test.org' });
    expect(err).toBeNull();
  });

  it('rejects a config missing baseUrl', async function () {
    const err = await atak.validateServiceConfig({} as any);
    expect(err).toBeInstanceOf(FeedsError);
    expect(err?.code).toEqual(ErrInvalidServiceConfig);
  });

  it('validates the service config is a url', async function () {
    const err = await atak.validateServiceConfig({ baseUrl: 'not/a/url' });
    expect(err).toBeInstanceOf(FeedsError);
    expect(err?.code).toEqual(ErrInvalidServiceConfig);
  });

  it('creates a service connection with a config object and transport', async function () {
    const conn = (await atak.createConnection(
      { baseUrl: 'http://test.tak' }
    )) as ATAK.AtakConnection;

    expect(conn).toBeInstanceOf(ATAK.AtakConnection);
    expect(conn.baseUrl).toEqual('http://test.tak');
    expect(conn.transport).toBe(atak.transport);
  });

  it('redacts the password when present', function () {
    const redacted = atak.redactServiceConfig({ baseUrl: 'http://test.tak', username: 'bob', password: 'secret' });
    expect(redacted.password).toEqual('●●●●●●●●');
    expect(redacted.baseUrl).toEqual('http://test.tak');
  });

  it('leaves config unchanged when there is no password', function () {
    const redacted = atak.redactServiceConfig({ baseUrl: 'http://test.tak' });
    expect(redacted).toEqual({ baseUrl: 'http://test.tak' });
  });
});

describe('atak connection', function () {
  let topicModules: ATAK.AtakTopicModule[];
  let transport: TransportMock;

  beforeEach(function () {
    topicModules = [
      {
        topicDescriptor: {
          id: 'cot-events',
          title: 'ATAK CoT Events'
        },
        createContentRequest() {
          throw new Error();
        },
        transformResponse() {
          throw new Error();
        }
      }
    ];

    transport = {
      send: jest.fn()
    };
  });

  it('returns the configured topics', async function () {
    const url = 'https://test.tak';
    const conn = new ATAK.AtakConnection(
      new Map(topicModules.map((x) => [x.topicDescriptor.id, x])),
      { baseUrl: url },
      transport as any
    );
    const topics = await conn.fetchAvailableTopics();

    expect(topics).toHaveLength(1);
    expect(topics[0]).toEqual(topicModules[0].topicDescriptor);
  });

  it('fetches topic content with the topic request', async function () {
    const conn = new ATAK.AtakConnection(
      new Map(topicModules.map((x) => [x.topicDescriptor.id, x])),
      { baseUrl: 'http://test.fetch' },
      transport as any
    );

    const contentReq: ATAK.AtakRequest = {
      method: 'get',
      path: '/Marti/api/cot'
    };

    const contentRes: ATAK.AtakResponse = {
      status: 200,
      body: []
    };

    const topicContent: FeedTopicContent = {
      topic: topicModules[0].topicDescriptor.id,
      items: {
        type: 'FeatureCollection',
        features: []
      } as any
    };

    topicModules[0].createContentRequest = jest.fn(() => contentReq);
    topicModules[0].transformResponse = jest.fn(() => topicContent);

    transport.send.mockImplementationOnce(async () => contentRes);

    const content = await conn.fetchTopicContent(
      topicModules[0].topicDescriptor.id
    );

    expect(content).toEqual(topicContent);
    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(transport.send).toHaveBeenCalledWith(
      contentReq,
      new URL(conn.baseUrl),
      undefined
    );
    expect(topicModules[0].createContentRequest as any).toHaveBeenCalledWith(undefined);
    expect(topicModules[0].transformResponse as any).toHaveBeenCalledWith(contentRes, contentReq);
  });

  it('passes auth through to the transport when credentials are configured', async function () {
    const conn = new ATAK.AtakConnection(
      new Map(topicModules.map((x) => [x.topicDescriptor.id, x])),
      { baseUrl: 'http://test.fetch', username: 'bob', password: 'secret' },
      transport as any
    );

    topicModules[0].createContentRequest = jest.fn((): ATAK.AtakRequest => ({ method: 'get', path: '/Marti/api/cot' }));
    topicModules[0].transformResponse = jest.fn((): FeedTopicContent => ({
      topic: topicModules[0].topicDescriptor.id,
      items: { type: 'FeatureCollection', features: [] } as any
    }));
    transport.send.mockImplementationOnce(async (): Promise<ATAK.AtakResponse> => ({ status: 200, body: [] }));

    await conn.fetchTopicContent(topicModules[0].topicDescriptor.id);

    expect(transport.send).toHaveBeenCalledWith(
      expect.anything(),
      new URL(conn.baseUrl),
      { username: 'bob', password: 'secret' }
    );
  });

  it('does not set auth when username or password is missing', function () {
    const conn = new ATAK.AtakConnection(
      new Map(),
      { baseUrl: 'http://test.tak', username: 'bob' },
      transport as any
    );
    expect(conn.auth).toBeUndefined();
  });

  it('throws for an unknown topic', async function () {
    const conn = new ATAK.AtakConnection(
      new Map(topicModules.map((x) => [x.topicDescriptor.id, x])),
      { baseUrl: 'http://test.fetch' },
      transport as any
    );

    await expect(conn.fetchTopicContent('not-a-real-topic')).rejects.toThrow('unknown topic');
  });
});
