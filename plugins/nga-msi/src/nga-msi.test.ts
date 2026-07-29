import { URL } from 'url';
import * as MSI from './nga-msi';
import {
  FeedsError,
  ErrInvalidServiceConfig,
  FeedTopicContent
} from '@ngageoint/mage.service/lib/entities/feeds/entities.feeds';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

type TransportMock = {
  send: ReturnType<typeof jest.fn>
};

describe('msi service type', function () {
  let transport: TransportMock;
  let msi: MSI.MsiServiceType;

  beforeEach(function () {
    transport = {
      send: jest.fn()
    };
    // MsiServiceType expects an MsiTransport; our mock matches shape.
    msi = new MSI.MsiServiceType(transport as any);
  });

  it('validates the service config is a string', async function () {
    let err = await msi.validateServiceConfig({ url: 'invalid' } as any);
    expect(err).toBeInstanceOf(FeedsError);
    expect(err?.code).toEqual(ErrInvalidServiceConfig);

    err = await msi.validateServiceConfig('http://test.org');
    expect(err).toBeNull();
  });

  it('validates the service config is a url', async function () {
    const err = await msi.validateServiceConfig('not/a/url');
    expect(err).toBeInstanceOf(FeedsError);
    expect(err?.code).toEqual(ErrInvalidServiceConfig);
  });

  it('creates a service connection with a url string and transport', async function () {
    const conn = (await msi.createConnection(
      'http://test.msi'
    )) as MSI.MsiConnection;

    expect(conn).toBeInstanceOf(MSI.MsiConnection);
    expect(conn.baseUrl).toEqual('http://test.msi');
    expect(conn.transport).toBe(msi.transport);
  });
});

describe('msi connection', function () {
  let topicModules: MSI.MsiTopicModule[];
  let transport: TransportMock;

  beforeEach(function () {
    topicModules = [
      {
        topicDescriptor: {
          id: 'msi1',
          title: 'MSI Test 1'
        },
        createContentRequest() {
          throw new Error();
        },
        transformResponse() {
          throw new Error();
        }
      },
      {
        topicDescriptor: {
          id: 'msi2',
          title: 'MSI Test 2'
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
    const url = 'https://test.msi';
    const conn = new MSI.MsiConnection(
      new Map(topicModules.map((x) => [x.topicDescriptor.id, x])),
      url,
      transport as any
    );
    const topics = await conn.fetchAvailableTopics();

    expect(topics).toHaveLength(2);
    expect(topics[0]).toEqual(topicModules[0].topicDescriptor);
    expect(topics[1]).toEqual(topicModules[1].topicDescriptor);
  });

  it('fetches topic content with the topic request', async function () {
    const conn = new MSI.MsiConnection(
      new Map(topicModules.map((x) => [x.topicDescriptor.id, x])),
      'http://test.fetch',
      transport as any
    );

    const contentReq: MSI.MsiRequest = {
      method: 'get',
      path: 'stuff',
      queryParams: {
        good: 'true'
      }
    };

    const contentRes: MSI.MsiResponse = {
      status: 200,
      body: {
        goodStuff: true
      }
    };

    const topicContent: FeedTopicContent = {
      topic: topicModules[0].topicDescriptor.id,
      items: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [1, 2],
                  [3, 4],
                  [5, 6],
                  [1, 2]
                ]
              ]
            },
            properties: { good: 'yep' }
          }
        ]
      } as any
    };

    const topicParams = {
      goodness: 75
    };

    topicModules[0].createContentRequest = jest.fn(() => contentReq);
    topicModules[0].transformResponse = jest.fn(() => topicContent);

    transport.send.mockImplementationOnce(async () => contentRes);

    const content = await conn.fetchTopicContent(
      topicModules[0].topicDescriptor.id,
      topicParams as any
    );

    expect(content).toEqual(topicContent);
    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(transport.send).toHaveBeenCalledWith(
      contentReq,
      new URL(conn.baseUrl)
    );
    expect(topicModules[0].createContentRequest as any).toHaveBeenCalledWith(topicParams);
    expect(topicModules[0].transformResponse as any).toHaveBeenCalledWith(contentRes, contentReq)
  });
});
