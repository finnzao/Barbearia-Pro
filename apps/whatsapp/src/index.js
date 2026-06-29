import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import express from 'express';
import pino from 'pino';
import qrcode from 'qrcode';

const PORT = process.env.PORT ?? 4000;
const AUTH_DIR = process.env.AUTH_DIR ?? './data/auth';
const API_TOKEN = process.env.WHATSAPP_API_TOKEN ?? '';
const WEBHOOK_URL = process.env.WEBHOOK_URL ?? '';

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });

let sock = null;
let estado = 'desconectado';
let qrAtual = null;

async function avisarApi(evento) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ evento, estado, timestamp: new Date().toISOString() }),
    });
  } catch (erro) {
    log.warn({ erro: String(erro) }, 'falha ao avisar a API');
  }
}

async function conectar() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({ version, auth: state, logger: log });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrAtual = qr;
      estado = 'aguardando_qr';
      log.info('novo QR disponível em /qr — escaneie para vincular a sessão');
    }

    if (connection === 'open') {
      qrAtual = null;
      estado = 'conectado';
      log.info('sessão WhatsApp conectada');
      void avisarApi('conectado');
    }

    if (connection === 'close') {
      estado = 'desconectado';
      const motivo = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const deslogado = motivo === DisconnectReason.loggedOut;
      log.warn({ motivo, deslogado }, 'sessão WhatsApp caiu');
      void avisarApi('desconectado');
      // Sessão deslogada (QR revogado) exige novo pareamento; o resto reconecta.
      if (!deslogado) {
        setTimeout(() => void conectar(), 3000);
      } else {
        qrAtual = null;
      }
    }
  });
}

// Normalização ingênua: assume número já com DDI/DDD (ex.: 5511999998888).
// ponytail: upgrade para libphonenumber se aparecer número sem DDI.
function paraJid(numero) {
  const digitos = String(numero).replace(/\D/g, '');
  return `${digitos}@s.whatsapp.net`;
}

const app = express();
app.use(express.json());

function exigirToken(req, res, next) {
  const auth = req.headers.authorization ?? '';
  if (!API_TOKEN || auth !== `Bearer ${API_TOKEN}`) {
    return res.status(401).json({ erro: 'não autorizado' });
  }
  next();
}

app.get('/status', (_req, res) => {
  res.json({ estado, temQr: qrAtual !== null });
});

app.get('/qr', async (_req, res) => {
  if (!qrAtual) {
    return res.status(404).json({ erro: 'sem QR no momento', estado });
  }
  if (_req.query.format === 'text') {
    return res.type('text/plain').send(qrAtual);
  }
  res.type('image/png').send(await qrcode.toBuffer(qrAtual));
});

app.post('/mensagens', exigirToken, async (req, res) => {
  const { para, texto } = req.body ?? {};
  if (!para || !texto) {
    return res.status(400).json({ erro: 'informe "para" e "texto"' });
  }
  if (estado !== 'conectado' || !sock) {
    return res.status(503).json({ erro: 'sessão indisponível', estado });
  }
  try {
    await sock.sendMessage(paraJid(para), { text: texto });
    res.json({ enviado: true });
  } catch (erro) {
    log.error({ erro: String(erro) }, 'falha ao enviar mensagem');
    res.status(502).json({ erro: 'falha ao enviar' });
  }
});

app.listen(PORT, () => log.info(`serviço WhatsApp em http://localhost:${PORT}`));
void conectar();
