import { INestApplication } from '@nestjs/common';
import { MetodoPagamento, StatusPagamento } from '@prisma/client';
import request from 'supertest';
import { criarAppTeste } from './support/app.factory';
import { fecharBanco, prismaTeste, resetDatabase } from './support/db';
import {
  criarBarbearia,
  criarProfissional,
  criarUsuario,
} from './support/factories';

describe('Funcionário (e2e)', () => {
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

  async function login(email: string, senha: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, senha });
    return res.body.accessToken as string;
  }

  it('profissional vê apenas as próprias comissões', async () => {
    const barbearia = await criarBarbearia({ slug: 'shop-a' });
    const profA = await criarProfissional(barbearia.id);
    const profB = await criarProfissional(barbearia.id);
    await criarUsuario(barbearia.id, {
      email: 'a@shop.com',
      senha: 'Senha@123',
      papel: 'profissional',
      profissionalId: profA.id,
    });

    await prismaTeste().pagamento.create({
      data: {
        barbeariaId: barbearia.id,
        profissionalId: profB.id,
        valorCentavos: 4000,
        comissaoPercent: 0.5,
        metodo: MetodoPagamento.dinheiro,
        status: StatusPagamento.pago,
      },
    });

    const token = await login('a@shop.com', 'Senha@123');
    const res = await request(app.getHttpServer())
      .get('/api/funcionario/comissoes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      faturadoCentavos: 0,
      comissaoCentavos: 0,
      aReceberCentavos: 0,
    });
  });

  it('dono não acessa a área do funcionário', async () => {
    const barbearia = await criarBarbearia({ slug: 'shop-b' });
    await criarUsuario(barbearia.id, {
      email: 'dono@shop.com',
      senha: 'Senha@123',
      papel: 'dono',
    });

    const token = await login('dono@shop.com', 'Senha@123');
    const res = await request(app.getHttpServer())
      .get('/api/funcionario/comissoes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'ACESSO_NEGADO' },
    });
  });
});
