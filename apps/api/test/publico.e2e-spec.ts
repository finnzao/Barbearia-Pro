import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarAppTeste } from './support/app.factory';
import { fecharBanco, resetDatabase } from './support/db';

describe('Público — booking + cliente (e2e)', () => {
  let app: INestApplication;

  const DATA = '2026-07-01';

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

  async function montarBarbearia() {
    const server = app.getHttpServer();
    const reg = await request(server).post('/api/auth/registrar').send({
      nomeBarbearia: 'Shop Pub',
      slug: 'shop-pub',
      email: 'dono-pub@x.com',
      senha: 'Senha@123',
    });
    const auth = { Authorization: `Bearer ${reg.body.accessToken}` };

    const servico = await request(server)
      .post('/api/servicos')
      .set(auth)
      .send({ nome: 'Corte', duracaoMin: 30, precoCentavos: 4000 });

    await request(server)
      .post('/api/profissionais')
      .set(auth)
      .send({ nome: 'Carlos', apelido: 'carlos', comissaoPercent: 0.5 });

    const horarios = Array.from({ length: 7 }, (_, d) => ({
      diaSemana: d,
      abre: '09:00',
      fecha: '19:00',
    }));
    await request(server)
      .put('/api/config/horarios')
      .set(auth)
      .send({ horarios });

    return { servicoId: servico.body.id as string };
  }

  it('lista serviços e horários, agenda e bloqueia o slot', async () => {
    const server = app.getHttpServer();
    const { servicoId } = await montarBarbearia();

    const servicos = await request(server).get('/api/publico/shop-pub/servicos');
    expect(servicos.status).toBe(200);
    expect(servicos.body).toHaveLength(1);

    const horarios = await request(server).get(
      `/api/publico/shop-pub/horarios?data=${DATA}&servicoId=${servicoId}`,
    );
    expect(horarios.status).toBe(200);
    expect(horarios.body.some((h: { hora: string }) => h.hora === '10:00')).toBe(
      true,
    );

    const agendar = await request(server)
      .post('/api/publico/shop-pub/agendar')
      .send({
        servicoId,
        data: DATA,
        hora: '10:00',
        nome: 'João Cliente',
        whatsapp: '11999990000',
      });
    expect(agendar.status).toBe(201);
    expect(agendar.body.status).toBe('pendente');

    const depois = await request(server).get(
      `/api/publico/shop-pub/horarios?data=${DATA}&servicoId=${servicoId}`,
    );
    expect(depois.body.some((h: { hora: string }) => h.hora === '10:00')).toBe(
      false,
    );
  });

  it('fluxo OTP → área do cliente → cancelar', async () => {
    const server = app.getHttpServer();
    const { servicoId } = await montarBarbearia();

    await request(server).post('/api/publico/shop-pub/agendar').send({
      servicoId,
      data: DATA,
      hora: '11:00',
      nome: 'Maria',
      whatsapp: '11988887777',
    });

    const otp = await request(server)
      .post('/api/publico/shop-pub/otp')
      .send({ whatsapp: '11988887777' });
    expect(otp.status).toBe(200);
    expect(otp.body.codigo).toMatch(/^\d{6}$/);

    const login = await request(server)
      .post('/api/publico/shop-pub/login/otp')
      .send({ whatsapp: '11988887777', codigo: otp.body.codigo });
    expect(login.status).toBe(200);
    const clienteAuth = { Authorization: `Bearer ${login.body.accessToken}` };

    const lista = await request(server)
      .get('/api/cliente/meus-agendamentos')
      .set(clienteAuth);
    expect(lista.status).toBe(200);
    expect(lista.body).toHaveLength(1);
    const agendamentoId = lista.body[0].id as string;

    const cancelar = await request(server)
      .post(`/api/cliente/agendamentos/${agendamentoId}/cancelar`)
      .set(clienteAuth);
    expect(cancelar.status).toBe(200);
    expect(cancelar.body.status).toBe('cancelado');
  });

  it('define senha e loga por senha; sem token a área é bloqueada', async () => {
    const server = app.getHttpServer();
    await montarBarbearia();

    const otp = await request(server)
      .post('/api/publico/shop-pub/otp')
      .send({ whatsapp: '11977776666' });
    const login = await request(server)
      .post('/api/publico/shop-pub/login/otp')
      .send({ whatsapp: '11977776666', codigo: otp.body.codigo });
    const clienteAuth = { Authorization: `Bearer ${login.body.accessToken}` };

    await request(server)
      .post('/api/cliente/definir-senha')
      .set(clienteAuth)
      .send({ senha: 'segredo123' })
      .expect(200);

    const porSenha = await request(server)
      .post('/api/publico/shop-pub/login/senha')
      .send({ whatsapp: '11977776666', senha: 'segredo123' });
    expect(porSenha.status).toBe(200);

    const semToken = await request(server).get('/api/cliente/meus-agendamentos');
    expect(semToken.status).toBe(401);
  });

  it('slug inexistente retorna 404', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/publico/nao-existe/servicos',
    );
    expect(res.status).toBe(404);
  });
});
