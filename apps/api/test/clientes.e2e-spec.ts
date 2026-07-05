import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarAppTeste } from './support/app.factory';
import { fecharBanco, resetDatabase } from './support/db';
import { criarProfissional, criarUsuario } from './support/factories';

describe('Clientes (e2e)', () => {
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

  it('dono cria, atualiza e remove cliente; outra barbearia não vê', async () => {
    const server = app.getHttpServer();
    const a = await registrarDono('shop-cli-a', 'dono-cli-a@x.com');
    await registrarDono('shop-cli-b', 'dono-cli-b@x.com');

    const criado = await request(server)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ nome: 'Ana', whatsapp: '11988887777' });
    expect(criado.status).toBe(201);
    expect(criado.body.barbeariaId).toBe(a.barbeariaId);

    const listaA = await request(server)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${a.token}`);
    expect(listaA.body).toHaveLength(1);

    const atualizado = await request(server)
      .patch(`/api/clientes/${criado.body.id}`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ nome: 'Ana Souza' });
    expect(atualizado.status).toBe(200);
    expect(atualizado.body.nome).toBe('Ana Souza');

    const removido = await request(server)
      .delete(`/api/clientes/${criado.body.id}`)
      .set('Authorization', `Bearer ${a.token}`);
    expect(removido.status).toBe(200);

    const b = await request(server)
      .post('/api/auth/login')
      .send({ email: 'dono-cli-b@x.com', senha: 'Senha@123' });
    const listaB = await request(server)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${b.body.accessToken}`);
    expect(listaB.body).toHaveLength(0);
  });

  it('profissional não pode criar cliente (403), mas pode listar', async () => {
    const server = app.getHttpServer();
    const a = await registrarDono('shop-cli-c', 'dono-cli-c@x.com');

    const prof = await criarProfissional(a.barbeariaId);
    await criarUsuario(a.barbeariaId, {
      email: 'prof-cli-c@x.com',
      senha: 'Senha@123',
      papel: 'profissional',
      profissionalId: prof.id,
    });

    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: 'prof-cli-c@x.com', senha: 'Senha@123' });

    const criar = await request(server)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ nome: 'Davi', whatsapp: '11955554444' });
    expect(criar.status).toBe(403);
    expect(criar.body).toMatchObject({
      success: false,
      error: { code: 'ACESSO_NEGADO' },
    });

    const listar = await request(server)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(listar.status).toBe(200);
  });

  it('exige autenticação', async () => {
    const res = await request(app.getHttpServer()).get('/api/clientes');
    expect(res.status).toBe(401);
  });
});
