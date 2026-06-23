import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarAppTeste } from './support/app.factory';
import { fecharBanco, resetDatabase } from './support/db';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  const cadastro = {
    nomeBarbearia: 'Demo',
    slug: 'demo',
    email: 'dono@demo.com',
    senha: 'Senha@123',
  };

  beforeAll(async () => {
    app = await criarAppTeste();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await app.close();
    await fecharBanco();
  });

  it('fluxo signup → login → rota protegida → logout → sessão bloqueada', async () => {
    const server = app.getHttpServer();

    const signup = await request(server)
      .post('/api/auth/registrar')
      .send(cadastro);
    expect(signup.status).toBe(201);
    const { accessToken, refreshToken } = signup.body;

    const me = await request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      barbeariaId: expect.any(String),
      papel: 'dono',
    });

    const semToken = await request(server).get('/api/auth/me');
    expect(semToken.status).toBe(401);

    const logout = await request(server)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect(logout.status).toBe(200);

    const renovar = await request(server)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    expect(renovar.status).toBe(401);
  });

  it('login inválido segue o contrato de erro', async () => {
    const server = app.getHttpServer();
    await request(server).post('/api/auth/registrar').send(cadastro);

    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: 'dono@demo.com', senha: 'errada' });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'NAO_AUTENTICADO' },
    });
  });

  it('rate limit bloqueia login após exceder o limite', async () => {
    const server = app.getHttpServer();
    await request(server).post('/api/auth/registrar').send(cadastro);

    let ultimoStatus = 0;
    for (let i = 0; i < 6; i += 1) {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: 'dono@demo.com', senha: 'errada' });
      ultimoStatus = res.status;
    }

    expect(ultimoStatus).toBe(429);
  });
});
