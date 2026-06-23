import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarAppTeste } from './support/app.factory';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await criarAppTeste();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health responde ok', async () => {
    const resposta = await request(app.getHttpServer()).get('/api/health');
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok', database: 'ok' });
  });

  it('rota inexistente segue o contrato de erro', async () => {
    const resposta = await request(app.getHttpServer()).get('/api/nao-existe');
    expect(resposta.status).toBe(404);
    expect(resposta.body).toMatchObject({
      success: false,
      error: { code: 'NAO_ENCONTRADO' },
    });
  });
});
