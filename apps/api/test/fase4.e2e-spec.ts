import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarAppTeste } from './support/app.factory';
import { fecharBanco, resetDatabase } from './support/db';
import { criarProfissional, criarUsuario } from './support/factories';

describe('Fase 4 — pagamentos/comissões/relatórios/repasses/config (e2e)', () => {
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

  async function donoToken() {
    const reg = await request(app.getHttpServer())
      .post('/api/auth/registrar')
      .send({
        nomeBarbearia: 'shop4',
        slug: 'shop4',
        email: 'dono4@x.com',
        senha: 'Senha@123',
      });
    return {
      auth: { Authorization: `Bearer ${reg.body.accessToken}` },
      barbeariaId: reg.body.usuario.barbeariaId as string,
    };
  }

  it('fluxo financeiro completo do dono', async () => {
    const server = app.getHttpServer();
    const { auth } = await donoToken();

    const prof = await request(server)
      .post('/api/profissionais')
      .set(auth)
      .send({ nome: 'Carlos', apelido: 'carlos', comissaoPercent: 0.5 });
    const profId = prof.body.id as string;

    const pagamento = await request(server)
      .post('/api/pagamentos')
      .set(auth)
      .send({ profissionalId: profId, valorCentavos: 4000, metodo: 'dinheiro' });
    expect(pagamento.status).toBe(201);
    expect(pagamento.body.status).toBe('pago');

    const comissoes = await request(server)
      .get('/api/comissoes')
      .set(auth);
    expect(comissoes.body).toHaveLength(1);
    expect(comissoes.body[0]).toMatchObject({
      atendimentos: 1,
      faturadoCentavos: 4000,
      comissaoCentavos: 2000,
    });

    const relatorio = await request(server)
      .get('/api/relatorios/financeiro')
      .set(auth);
    expect(relatorio.body).toMatchObject({
      faturamentoCentavos: 4000,
      comissoesCentavos: 2000,
      liquidoCentavos: 2000,
      atendimentos: 1,
      ticketMedioCentavos: 4000,
    });

    const repasse = await request(server)
      .post('/api/repasses')
      .set(auth)
      .send({
        profissionalId: profId,
        periodoInicio: '2026-06-16T00:00:00.000Z',
        periodoFim: '2026-06-22T23:59:59.000Z',
        valorCentavos: 2000,
        origem: 'manual',
      });
    expect(repasse.status).toBe(201);

    const pago = await request(server)
      .patch(`/api/repasses/${repasse.body.id}/pagar`)
      .set(auth);
    expect(pago.body.status).toBe('pago');

    const config = await request(server).get('/api/config').set(auth);
    expect(config.body.clienteEscolheProfissional).toBe(true);

    const patch = await request(server)
      .patch('/api/config')
      .set(auth)
      .send({ repasseDia: 10 });
    expect(patch.body.repasseDia).toBe(10);

    const horarios = await request(server)
      .put('/api/config/horarios')
      .set(auth)
      .send({ horarios: [{ diaSemana: 1, abre: '09:00', fecha: '19:00' }] });
    expect(horarios.body).toHaveLength(1);
  });

  it('profissional não cria pagamento (403)', async () => {
    const server = app.getHttpServer();
    const { barbeariaId } = await donoToken();

    const prof = await criarProfissional(barbeariaId);
    await criarUsuario(barbeariaId, {
      email: 'prof4@x.com',
      senha: 'Senha@123',
      papel: 'profissional',
      profissionalId: prof.id,
    });
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: 'prof4@x.com', senha: 'Senha@123' });

    const res = await request(server)
      .post('/api/pagamentos')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ profissionalId: prof.id, valorCentavos: 1000, metodo: 'dinheiro' });
    expect(res.status).toBe(403);
  });
});
