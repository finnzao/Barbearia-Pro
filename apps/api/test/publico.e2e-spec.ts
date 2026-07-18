import { INestApplication } from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import request from 'supertest';
import { authDe, criarAppTeste, limparThrottle } from './support/app.factory';
import { fecharBanco, prismaTeste, resetDatabase } from './support/db';
import {
  criarBarbearia,
  criarProfissional,
  criarServico,
  criarUsuario,
} from './support/factories';

describe('Público — booking + cliente (e2e)', () => {
  let app: INestApplication;

  // Data fixa apodrece: a API recusa horário no passado, então a suíte passaria
  // a falhar sozinha ao chegar o dia. Sempre uma semana à frente.
  function emDias(dias: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
  }
  const DATA = emDias(7);

  beforeAll(async () => {
    app = await criarAppTeste();
  });

  beforeEach(async () => {
    await resetDatabase();
    limparThrottle(app);
  });

  afterAll(async () => {
    await app.close();
    await fecharBanco();
  });

  async function montarBarbearia() {
    const barbearia = await criarBarbearia({
      nome: 'Shop Pub',
      slug: 'shop-pub',
    });
    const profissional = await criarProfissional(barbearia.id, {
      nome: 'Carlos',
      apelido: 'carlos',
    });
    const servico = await criarServico(barbearia.id, {
      nome: 'Corte',
      duracaoMin: 30,
      precoCentavos: 4000,
    });
    const { usuario } = await criarUsuario(barbearia.id, {
      papel: PapelUsuario.dono,
    });
    const auth = await authDe(app, usuario);

    const horarios = Array.from({ length: 7 }, (_, d) => ({
      diaSemana: d,
      abre: '09:00',
      fecha: '19:00',
    }));
    await request(app.getHttpServer())
      .put('/api/config/horarios')
      .set(auth)
      .send({ horarios });

    return {
      auth,
      servicoId: servico.id,
      profissionalId: profissional.id,
    };
  }

  // Horário local da barbearia (America/Sao_Paulo, UTC-3) -> instante UTC.
  function emSaoPaulo(data: string, hora: string): string {
    return `${data}T${hora}:00.000-03:00`;
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

  it('recusa horário no passado e não oferece slot vencido', async () => {
    const server = app.getHttpServer();
    const { servicoId } = await montarBarbearia();
    const ontem = emDias(-1);

    const agendar = await request(server)
      .post('/api/publico/shop-pub/agendar')
      .send({
        servicoId,
        data: ontem,
        hora: '10:00',
        nome: 'Atrasado',
        whatsapp: '11966665555',
      });
    expect(agendar.status).toBe(400);

    const horarios = await request(server).get(
      `/api/publico/shop-pub/horarios?data=${ontem}&servicoId=${servicoId}`,
    );
    expect(horarios.body).toEqual([]);
  });

  it('bloqueio remove o horário da grade e recusa o agendamento', async () => {
    const server = app.getHttpServer();
    const { auth, servicoId, profissionalId } = await montarBarbearia();

    // Carlos é o único profissional: bloquear ele fecha as 10:00 do dia.
    const bloqueio = await request(server)
      .post('/api/bloqueios')
      .set(auth)
      .send({
        profissionalId,
        inicio: emSaoPaulo(DATA, '09:30'),
        fim: emSaoPaulo(DATA, '11:00'),
        motivo: 'Almoço/folga',
      });
    expect(bloqueio.status).toBe(201);

    const horarios = await request(server).get(
      `/api/publico/shop-pub/horarios?data=${DATA}&servicoId=${servicoId}`,
    );
    const horas = horarios.body.map((h: { hora: string }) => h.hora);
    expect(horas).not.toContain('10:00');
    expect(horas).toContain('11:00'); // fora do bloqueio, segue livre

    const agendar = await request(server)
      .post('/api/publico/shop-pub/agendar')
      .send({
        servicoId,
        data: DATA,
        hora: '10:00',
        nome: 'Bloqueado',
        whatsapp: '11933332222',
      });
    expect(agendar.status).toBe(409);
  });

  it('bloqueio da barbearia inteira (sem profissional) zera o dia', async () => {
    const server = app.getHttpServer();
    const { auth, servicoId } = await montarBarbearia();

    await request(server)
      .post('/api/bloqueios')
      .set(auth)
      .send({
        inicio: emSaoPaulo(DATA, '00:00'),
        fim: emSaoPaulo(DATA, '23:59'),
        motivo: 'Feriado',
      })
      .expect(201);

    const horarios = await request(server).get(
      `/api/publico/shop-pub/horarios?data=${DATA}&servicoId=${servicoId}`,
    );
    expect(horarios.body).toEqual([]);
  });

  it('só oferece profissional que faz o serviço', async () => {
    const server = app.getHttpServer();
    const { auth, servicoId, profissionalId } = await montarBarbearia();

    // Segundo profissional, mapeado como o único que faz o serviço.
    const ana = await request(server)
      .post('/api/profissionais')
      .set(auth)
      .send({ nome: 'Ana', apelido: 'ana', comissaoPercent: 0.5 });
    await prismaTeste().profissionalServico.create({
      data: { profissionalId: ana.body.id, servicoId },
    });

    const lista = await request(server).get(
      `/api/publico/shop-pub/profissionais?servicoId=${servicoId}`,
    );
    expect(lista.body).toHaveLength(1);
    expect(lista.body[0].apelido).toBe('ana');

    // Carlos não faz o serviço: pedir por ele é 404.
    const recusado = await request(server)
      .post('/api/publico/shop-pub/agendar')
      .send({
        servicoId,
        profissionalId,
        data: DATA,
        hora: '10:00',
        nome: 'João',
        whatsapp: '11944443333',
      });
    expect(recusado.status).toBe(404);

    // Sem escolher, cai na Ana — a única elegível.
    const auto = await request(server)
      .post('/api/publico/shop-pub/agendar')
      .send({
        servicoId,
        data: DATA,
        hora: '10:00',
        nome: 'João',
        whatsapp: '11944443333',
      });
    expect(auto.status).toBe(201);
    expect(auto.body.profissionalId).toBe(ana.body.id);
  });

  it('sem clienteEscolheServico, agenda só o horário', async () => {
    const server = app.getHttpServer();
    const { auth, servicoId } = await montarBarbearia();

    // Com a escolha ligada (padrão), omitir o serviço é erro.
    await request(server)
      .post('/api/publico/shop-pub/agendar')
      .send({ data: DATA, hora: '10:00', nome: 'X', whatsapp: '11911112222' })
      .expect(400);

    await request(server)
      .patch('/api/config')
      .set(auth)
      .send({ clienteEscolheServico: false })
      .expect(200);

    // Agora a grade sai sem servicoId e o agendamento nasce sem serviço/preço.
    const horarios = await request(server).get(
      `/api/publico/shop-pub/horarios?data=${DATA}`,
    );
    expect(horarios.body.length).toBeGreaterThan(0);

    const agendar = await request(server)
      .post('/api/publico/shop-pub/agendar')
      .send({ data: DATA, hora: '10:00', nome: 'Sem Servico', whatsapp: '11911112222' });
    expect(agendar.status).toBe(201);

    const criado = await prismaTeste().agendamento.findUnique({
      where: { id: agendar.body.id },
    });
    expect(criado?.servicoId).toBeNull();
    expect(criado?.precoCentavos).toBeNull();
    expect(servicoId).toBeTruthy(); // o catálogo segue existindo para o balcão
  });

  it('avisa "pedido recebido" no pendente e "confirmado" só na aprovação', async () => {
    const server = app.getHttpServer();
    const { auth, servicoId } = await montarBarbearia();

    const agendar = await request(server)
      .post('/api/publico/shop-pub/agendar')
      .send({
        servicoId,
        data: DATA,
        hora: '10:00',
        nome: 'Maria',
        whatsapp: '11922221111',
      });
    expect(agendar.body.status).toBe('pendente');

    const pedido = await prismaTeste().notificacaoWhatsapp.findFirst({
      where: { agendamentoId: agendar.body.id },
    });
    expect(pedido?.texto).toContain('recebemos seu pedido');
    expect(pedido?.texto).not.toContain('confirmado para');

    await request(server)
      .patch(`/api/agendamentos/${agendar.body.id}`)
      .set(auth)
      .send({ status: 'confirmado' })
      .expect(200);

    const avisos = await prismaTeste().notificacaoWhatsapp.findMany({
      where: { agendamentoId: agendar.body.id },
      orderBy: { criadoEm: 'asc' },
    });
    expect(avisos).toHaveLength(2);
    expect(avisos[1].texto).toContain('confirmado para');
  });

  it('painel define quem faz o serviço e isso filtra o link', async () => {
    const server = app.getHttpServer();
    const { auth, servicoId, profissionalId } = await montarBarbearia();
    const ana = await criarProfissional(
      (await prismaTeste().barbearia.findUniqueOrThrow({
        where: { slug: 'shop-pub' },
      })).id,
      { nome: 'Ana', apelido: 'ana' },
    );

    // Sem mapeamento, os dois aparecem.
    const todos = await request(server).get(
      `/api/publico/shop-pub/profissionais?servicoId=${servicoId}`,
    );
    expect(todos.body).toHaveLength(2);

    // Só a Ana faz o Corte.
    await request(server)
      .put(`/api/servicos/${servicoId}/profissionais`)
      .set(auth)
      .send({ profissionalIds: [ana.id] })
      .expect(200);

    const soAna = await request(server).get(
      `/api/publico/shop-pub/profissionais?servicoId=${servicoId}`,
    );
    expect(soAna.body).toHaveLength(1);
    expect(soAna.body[0].apelido).toBe('ana');

    // Carlos deixa de ser agendável nesse serviço.
    const recusado = await request(server)
      .post('/api/publico/shop-pub/agendar')
      .send({
        servicoId,
        profissionalId,
        data: DATA,
        hora: '10:00',
        nome: 'João',
        whatsapp: '11955551111',
      });
    expect(recusado.status).toBe(404);

    // Lista vazia volta a significar "todos atendem".
    await request(server)
      .put(`/api/servicos/${servicoId}/profissionais`)
      .set(auth)
      .send({ profissionalIds: [] })
      .expect(200);
    const semMapa = await request(server).get(
      `/api/publico/shop-pub/profissionais?servicoId=${servicoId}`,
    );
    expect(semMapa.body).toHaveLength(2);
  });

  it('pausa de almoço tira os horários do meio do dia', async () => {
    const server = app.getHttpServer();
    const { auth, servicoId } = await montarBarbearia();

    await request(server)
      .put('/api/config/horarios')
      .set(auth)
      .send({
        horarios: Array.from({ length: 7 }, (_, d) => ({
          diaSemana: d,
          abre: '09:00',
          fecha: '19:00',
          pausaInicio: '12:00',
          pausaFim: '13:00',
        })),
      })
      .expect(200);

    const horarios = await request(server).get(
      `/api/publico/shop-pub/horarios?data=${DATA}&servicoId=${servicoId}`,
    );
    const horas = horarios.body.map((h: { hora: string }) => h.hora);
    expect(horas).not.toContain('12:00');
    expect(horas).not.toContain('12:30');
    expect(horas).toContain('13:00');
    // Fronteira: 30 min às 11:30 termina às 12:00, exatamente quando o almoço
    // começa. Encostar não é sobrepor — a vaga vale, senão se perde um horário.
    expect(horas).toContain('11:30');

    // Já um serviço de 1 h às 11:30 entraria no almoço: some da grade.
    const longo = await request(server)
      .post('/api/servicos')
      .set(auth)
      .send({ nome: 'Combo', duracaoMin: 60, precoCentavos: 9000 });
    const grandeGrade = await request(server).get(
      `/api/publico/shop-pub/horarios?data=${DATA}&servicoId=${longo.body.id}`,
    );
    const horasLongo = grandeGrade.body.map((h: { hora: string }) => h.hora);
    expect(horasLongo).not.toContain('11:30');
    expect(horasLongo).toContain('11:00'); // 11:00–12:00 ainda cabe

    const noAlmoco = await request(server)
      .post('/api/publico/shop-pub/agendar')
      .send({
        servicoId,
        data: DATA,
        hora: '12:00',
        nome: 'Almoço',
        whatsapp: '11900001111',
      });
    expect(noAlmoco.status).toBe(400);
  });

  it('recusa horário fora do expediente mesmo via POST direto', async () => {
    const server = app.getHttpServer();
    const { servicoId } = await montarBarbearia();

    // A tela nunca ofereceu 03:00 — a API também não pode aceitar.
    const madrugada = await request(server)
      .post('/api/publico/shop-pub/agendar')
      .send({
        servicoId,
        data: DATA,
        hora: '03:00',
        nome: 'Fora',
        whatsapp: '11900002222',
      });
    expect(madrugada.status).toBe(400);

    // 18:45 não é da grade (que anda de 30 em 30 a partir das 09:00).
    const foraDaGrade = await request(server)
      .post('/api/publico/shop-pub/agendar')
      .send({
        servicoId,
        data: DATA,
        hora: '18:45',
        nome: 'Torto',
        whatsapp: '11900003333',
      });
    expect(foraDaGrade.status).toBe(400);
  });

  it('recusa serviço com duração fora do passo de 30 min', async () => {
    const server = app.getHttpServer();
    const { auth } = await montarBarbearia();

    await request(server)
      .post('/api/servicos')
      .set(auth)
      .send({ nome: 'Torto', duracaoMin: 20, precoCentavos: 3000 })
      .expect(400);

    await request(server)
      .post('/api/servicos')
      .set(auth)
      .send({ nome: 'Certo', duracaoMin: 90, precoCentavos: 9000 })
      .expect(201);
  });

  it('aceita telefone com máscara e grava só os dígitos', async () => {
    const server = app.getHttpServer();
    const { servicoId } = await montarBarbearia();

    const agendar = await request(server)
      .post('/api/publico/shop-pub/agendar')
      .send({
        servicoId,
        data: DATA,
        hora: '10:00',
        nome: 'Formatado',
        whatsapp: '(11) 98765-0000', // com máscara — era o que travava o fluxo
      });
    expect(agendar.status).toBe(201);

    const cliente = await prismaTeste().cliente.findFirst({
      where: { nome: 'Formatado' },
    });
    expect(cliente?.whatsapp).toBe('11987650000');
  });

  it('recusa profissional de outra barbearia', async () => {
    const server = app.getHttpServer();
    const { servicoId } = await montarBarbearia();

    // O profissional de outra barbearia não pode ser agendado nesta.
    const outra = await criarBarbearia({ nome: 'Outra', slug: 'outra-shop' });
    const intruso = await criarProfissional(outra.id, { apelido: 'intruso' });

    const agendar = await request(server)
      .post('/api/publico/shop-pub/agendar')
      .send({
        servicoId,
        profissionalId: intruso.id,
        data: DATA,
        hora: '10:00',
        nome: 'João',
        whatsapp: '11955554444',
      });
    expect(agendar.status).toBe(404);
  });
});
