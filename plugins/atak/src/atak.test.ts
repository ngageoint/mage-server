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

describe('tak gov service type', function () {
  let transport: TransportMock;
  let takGov: ATAK.TakGovServiceType;

  beforeEach(function () {
    transport = {
      send: jest.fn()
    };
    takGov = new ATAK.TakGovServiceType(transport as any);
  });

  it('validates the service config has a baseUrl', async function () {
    let err = await takGov.validateServiceConfig({ url: 'invalid' } as any);
    expect(err).toBeInstanceOf(FeedsError);
    expect(err?.code).toEqual(ErrInvalidServiceConfig);

    err = await takGov.validateServiceConfig({ baseUrl: 'http://test.org' });
    expect(err).toBeNull();
  });

  it('rejects a config missing baseUrl', async function () {
    const err = await takGov.validateServiceConfig({} as any);
    expect(err).toBeInstanceOf(FeedsError);
    expect(err?.code).toEqual(ErrInvalidServiceConfig);
  });

  it('validates the service config is a url', async function () {
    const err = await takGov.validateServiceConfig({ baseUrl: 'not/a/url' });
    expect(err).toBeInstanceOf(FeedsError);
    expect(err?.code).toEqual(ErrInvalidServiceConfig);
  });

  it('creates a service connection with a config object and transport', async function () {
    const conn = (await takGov.createConnection(
      { baseUrl: 'http://test.tak' }
    )) as ATAK.AtakConnection;

    expect(conn).toBeInstanceOf(ATAK.AtakConnection);
    expect(conn.baseUrl).toEqual('http://test.tak');
    expect(conn.transport).toBe(takGov.transport);
    expect(conn.auth).toBeUndefined();
  });

  it('derives basic auth when username and password are both configured', async function () {
    const conn = (await takGov.createConnection(
      { baseUrl: 'http://test.tak', username: 'bob', password: 'secret' }
    )) as ATAK.AtakConnection;

    expect(conn.auth).toEqual({ type: 'basic', username: 'bob', password: 'secret' });
  });

  it('does not derive auth when only one of username/password is configured', async function () {
    const conn = (await takGov.createConnection(
      { baseUrl: 'http://test.tak', username: 'bob' }
    )) as ATAK.AtakConnection;

    expect(conn.auth).toBeUndefined();
  });

  it('redacts the password when present', function () {
    const redacted = takGov.redactServiceConfig({ baseUrl: 'http://test.tak', username: 'bob', password: 'secret' });
    expect(redacted.password).toEqual('●●●●●●●●');
    expect(redacted.baseUrl).toEqual('http://test.tak');
  });

  it('leaves config unchanged when there is no password', function () {
    const redacted = takGov.redactServiceConfig({ baseUrl: 'http://test.tak' });
    expect(redacted).toEqual({ baseUrl: 'http://test.tak' });
  });
});

describe('tak open (OpenTAKServer) service type', function () {
  let transport: TransportMock;
  let takOpen: ATAK.TakOpenServiceType;

  beforeEach(function () {
    transport = {
      send: jest.fn()
    };
    takOpen = new ATAK.TakOpenServiceType(transport as any);
  });

  it('validates the service config has a baseUrl', async function () {
    let err = await takOpen.validateServiceConfig({ url: 'invalid' } as any);
    expect(err).toBeInstanceOf(FeedsError);
    expect(err?.code).toEqual(ErrInvalidServiceConfig);

    err = await takOpen.validateServiceConfig({ baseUrl: 'http://test.org' });
    expect(err).toBeNull();
  });

  it('creates a service connection with a config object and transport', async function () {
    const conn = (await takOpen.createConnection(
      { baseUrl: 'http://test.opentak' }
    )) as ATAK.AtakConnection;

    expect(conn).toBeInstanceOf(ATAK.AtakConnection);
    expect(conn.baseUrl).toEqual('http://test.opentak');
    expect(conn.transport).toBe(takOpen.transport);
    expect(conn.auth).toBeUndefined();
  });

  it('derives token auth when a token is configured', async function () {
    const conn = (await takOpen.createConnection(
      { baseUrl: 'http://test.opentak', token: 'abc123' }
    )) as ATAK.AtakConnection;

    expect(conn.auth).toEqual({ type: 'token', token: 'abc123' });
  });

  it('redacts the token when present', function () {
    const redacted = takOpen.redactServiceConfig({ baseUrl: 'http://test.opentak', token: 'abc123' });
    expect(redacted.token).toEqual('●●●●●●●●');
    expect(redacted.baseUrl).toEqual('http://test.opentak');
  });

  it('leaves config unchanged when there is no token', function () {
    const redacted = takOpen.redactServiceConfig({ baseUrl: 'http://test.opentak' });
    expect(redacted).toEqual({ baseUrl: 'http://test.opentak' });
  });
});

describe('atak connection', function () {
  let topicModules: ATAK.AtakTopicModule[];
  let transport: TransportMock;
  const serviceInfo = { title: 'TAK Gov Server', summary: 'test summary' };

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
      url,
      undefined,
      transport as any,
      serviceInfo
    );
    const topics = await conn.fetchAvailableTopics();

    expect(topics).toHaveLength(1);
    expect(topics[0]).toEqual(topicModules[0].topicDescriptor);
  });

  it('returns the service info it was constructed with', async function () {
    const conn = new ATAK.AtakConnection(
      new Map(topicModules.map((x) => [x.topicDescriptor.id, x])),
      'https://test.tak',
      undefined,
      transport as any,
      serviceInfo
    );

    await expect(conn.fetchServiceInfo()).resolves.toEqual(serviceInfo);
  });

  it('fetches topic content with the topic request', async function () {
    const conn = new ATAK.AtakConnection(
      new Map(topicModules.map((x) => [x.topicDescriptor.id, x])),
      'http://test.fetch',
      undefined,
      transport as any,
      serviceInfo
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

  it('passes basic auth through to the transport when configured', async function () {
    const auth: ATAK.AtakAuth = { type: 'basic', username: 'bob', password: 'secret' };
    const conn = new ATAK.AtakConnection(
      new Map(topicModules.map((x) => [x.topicDescriptor.id, x])),
      'http://test.fetch',
      auth,
      transport as any,
      serviceInfo
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
      auth
    );
  });

  it('passes token auth through to the transport when configured', async function () {
    const auth: ATAK.AtakAuth = { type: 'token', token: 'abc123' };
    const conn = new ATAK.AtakConnection(
      new Map(topicModules.map((x) => [x.topicDescriptor.id, x])),
      'http://test.fetch',
      auth,
      transport as any,
      serviceInfo
    );

    topicModules[0].createContentRequest = jest.fn((): ATAK.AtakRequest => ({ method: 'get', path: '/api/cot' }));
    topicModules[0].transformResponse = jest.fn((): FeedTopicContent => ({
      topic: topicModules[0].topicDescriptor.id,
      items: { type: 'FeatureCollection', features: [] } as any
    }));
    transport.send.mockImplementationOnce(async (): Promise<ATAK.AtakResponse> => ({ status: 200, body: [] }));

    await conn.fetchTopicContent(topicModules[0].topicDescriptor.id);

    expect(transport.send).toHaveBeenCalledWith(
      expect.anything(),
      new URL(conn.baseUrl),
      auth
    );
  });

  it('throws for an unknown topic', async function () {
    const conn = new ATAK.AtakConnection(
      new Map(topicModules.map((x) => [x.topicDescriptor.id, x])),
      'http://test.fetch',
      undefined,
      transport as any,
      serviceInfo
    );

    await expect(conn.fetchTopicContent('not-a-real-topic')).rejects.toThrow('unknown topic');
  });
});
