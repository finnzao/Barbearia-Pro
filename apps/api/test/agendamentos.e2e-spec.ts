import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarAppTeste } from './support/app.factory';
import { fecharBanco, resetDatabase } from './support/db';

describe('Agendamentos (e2e)', () => {
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

  async function contexto() {
    const reg = await request(app.getHttpServer())
      .post('/api/auth/registrar')
      .send({
        nomeBarbearia: 'shop-ag',
        slug: 'shop-ag',
        email: 'dono-ag@x.com',
        senha: 'Senha@123',
      });
    const token = reg.body.accessToken as string;
    const auth = { Authorization: `Bearer ${token}` };

    const prof = await request(app.getHttpServer())
      .post('/api/profissionais')
      .set(auth)
      .send({ nome: 'Profissional', apelido: 'prof' });

    return { auth, profId: prof.body.id as string };
  }

  it('cria, bloqueia sobreposição (409) e lista por dia', async () => {
    const server = app.getHttpServer();
    const { auth, profId } = await contexto();

    const ag1 = await request(server)
      .post('/api/agendamentos')
      .set(auth)
      .send({
        profissionalId: profId,
        clienteNome: 'João',
        precoCentavos: 4000,
        inicio: '2026-06-23T13:00:00.000Z',
        fim: '2026-06-23T13:30:00.000Z',
      });
    expect(ag1.status).toBe(201);

    const ag2 = await request(server)
      .post('/api/agendamentos')
      .set(auth)
      .send({
        profissionalId: profId,
        inicio: '2026-06-23T13:15:00.000Z',
        fim: '2026-06-23T13:45:00.000Z',
      });
    expect(ag2.status).toBe(409);
    expect(ag2.body).toMatchObject({
      success: false,
      error: { code: 'CONFLITO' },
    });

    const lista = await request(server)
      .get('/api/agendamentos?data=2026-06-23')
      .set(auth);
    expect(lista.status).toBe(200);
    expect(lista.body).toHaveLength(1);
  });

  it('rejeita período inválido (400)', async () => {
    const server = app.getHttpServer();
    const { auth, profId } = await contexto();

    const res = await request(server)
      .post('/api/agendamentos')
      .set(auth)
      .send({
        profissionalId: profId,
        inicio: '2026-06-23T14:00:00.000Z',
        fim: '2026-06-23T13:00:00.000Z',
      });
    expect(res.status).toBe(400);
  });
});
