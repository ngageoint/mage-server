import supertest from 'supertest';

export function contentTypeOf(res: supertest.Response): string {
  return res.header['content-type'];
};