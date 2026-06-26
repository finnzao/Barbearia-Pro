import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarAppTeste } from './support/app.factory';
import { fecharBanco, resetDatabase } from './support/db';
import { criarProfissional, criarUsuario } from './support/factories';

describe('Serviços (e2e)', () => {
  let app: INestApplication;

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

  async function registrarDono(slug: string, email: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/registrar')
      .send({
        nomeBarbearia: slug,
        slug,
        email,
        senha: 'Senha@123',
      });
    return {
      token: res.body.accessToken as string,
      barbeariaId: res.body.usuario.barbeariaId as string,
    };
  }

  it('dono cria e lista serviços; outra barbearia não vê', async () => {
    const server = app.getHttpServer();
    const a = await registrarDono('shop-a', 'dono-a@x.com');
    await registrarDono('shop-b', 'dono-b@x.com');

    const criado = await request(server)
      .post('/api/servicos')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ nome: 'Corte', duracaoMin: 30, precoCentavos: 4000 });
    expect(criado.status).toBe(201);
    expect(criado.body.barbeariaId).toBe(a.barbeariaId);

    const listaA = await request(server)
      .get('/api/servicos')
      .set('Authorization', `Bearer ${a.token}`);
    expect(listaA.body).toHaveLength(1);

    const b = await request(server)
      .post('/api/auth/login')
      .send({ email: 'dono-b@x.com', senha: 'Senha@123' });
    const listaB = await request(server)
      .get('/api/servicos')
      .set('Authorization', `Bearer ${b.body.accessToken}`);
    expect(listaB.body).toHaveLength(0);
  });

  it('profissional não pode criar serviço (403)', async () => {
    const server = app.getHttpServer();
    const a = await registrarDono('shop-c', 'dono-c@x.com');

    const prof = await criarProfissional(a.barbeariaId);
    await criarUsuario(a.barbeariaId, {
      email: 'prof-c@x.com',
      senha: 'Senha@123',
      papel: 'profissional',
      profissionalId: prof.id,
    });

    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: 'prof-c@x.com', senha: 'Senha@123' });

    const res = await request(server)
      .post('/api/servicos')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ nome: 'Barba', duracaoMin: 20, precoCentavos: 3000 });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'ACESSO_NEGADO' },
    });
  });

  it('exige autenticação', async () => {
    const res = await request(app.getHttpServer()).get('/api/servicos');
    expect(res.status).toBe(401);
  });
});
