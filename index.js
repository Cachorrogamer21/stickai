const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const express = require('express');
const qrcode = require('qrcode-terminal');
const db = require('./db');
const sticker = require('./sticker');

// Configurar servidor Express para a interface web
const app = express();
const PORT = process.env.PORT || 3000;

// Modo offline (sem banco de dados)
let offlineMode = false;
let offlineStickerMode = true; // Padrão quando offline

// Diretório para armazenar dados da sessão
const SESSION_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Variável para armazenar conexão ativa
let sock = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';

// Verificar banco de dados e inicializar
async function initializeApp() {
  // Verificar conexão com banco de dados
  const dbConnected = await db.checkDatabase();
  
  if (!dbConnected) {
    console.log('AVISO: Não foi possível conectar ao banco de dados. O aplicativo funcionará em modo offline.');
    offlineMode = true;
  } else {
    console.log('Conexão com banco de dados estabelecida.');
    // Inicializar banco de dados
    await db.initDatabase();
  }
  
  // Iniciar servidor
  app.listen(PORT, () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
    console.log(`Acesse http://localhost:${PORT} para a interface web`);
    
    // Iniciar conexão com WhatsApp
    connectToWhatsApp();
  });
}

// Iniciar conexão com WhatsApp
async function connectToWhatsApp() {
  try {
    // Estado de autenticação usando arquivos
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    // Criar instância do cliente WhatsApp
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' })
    });

    // Evento de conexão atualizada
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Salvar QR Code para exibição na interface web
        qrCodeData = qr;
        qrcode.generate(qr, { small: true });
        connectionStatus = 'qr-ready';
        console.log('Escaneie o QR Code para conectar ao WhatsApp');
      }

      if (connection === 'close') {
        connectionStatus = 'disconnected';
        const shouldReconnect = (lastDisconnect?.error instanceof Boom && 
          lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut);
        
        console.log('Conexão fechada devido a:', lastDisconnect?.error);
        
        if (shouldReconnect) {
          console.log('Reconectando...');
          setTimeout(connectToWhatsApp, 5000);
        } else {
          console.log('Desconectado permanentemente, remova o diretório de sessão para reconectar');
        }
      } else if (connection === 'open') {
        connectionStatus = 'connected';
        console.log('Conexão estabelecida com sucesso!');
        
        // Inicializar banco de dados
        await db.initDatabase();
      }
    });

    // Salvar credenciais quando atualizadas
    sock.ev.on('creds.update', saveCreds);

    // Processar mensagens recebidas
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const message of messages) {
        // Processar qualquer mensagem, incluindo as enviadas pelo próprio usuário
        if (message.key) {
          // Para debug - mostrar se é mensagem própria ou não
          const isFromMe = message.key.fromMe;
          if (isFromMe) {
            console.log('Processando mensagem enviada por mim (modo teste)');
          }
          
          // Verificar se o modo sticker está ativo
          let stickerModeActive = true; // Ativar por padrão
          
          if (offlineMode) {
            stickerModeActive = offlineStickerMode;
          } else {
            try {
              stickerModeActive = await db.isStickerModeActive();
            } catch (error) {
              console.log('Erro ao verificar modo sticker, usando padrão (ativado):', error);
              stickerModeActive = true;
            }
          }
          
          console.log('Modo sticker está: ' + (stickerModeActive ? 'ATIVADO' : 'DESATIVADO'));
          
          if (!stickerModeActive) {
            console.log('Modo sticker desativado, ignorando mensagem');
            continue;
          }

          // Extrair dados da mensagem
          const messageType = Object.keys(message.message || {})[0];
          const chat = message.key.remoteJid;

          // Melhorar extração do texto da mensagem
          let body = '';
          if (message.message?.conversation) {
            body = message.message.conversation;
          } else if (message.message?.extendedTextMessage?.text) {
            body = message.message.extendedTextMessage.text;
          } else if (message.message?.imageMessage?.caption) {
            body = message.message.imageMessage.caption;
          } else if (message.message?.videoMessage?.caption) {
            body = message.message.videoMessage.caption;
          }

          console.log(`Nova mensagem ${isFromMe ? 'minha' : 'recebida'} de ${chat}: ${body}`);
          console.log('Tipo de mensagem:', messageType);

          // Verificar se é uma solicitação de sticker
          const hasImage = messageType === 'imageMessage' || messageType === 'viewOnceMessage' || 
                          (message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage);
          const hasVideo = messageType === 'videoMessage' ||
                          (message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage);
          const hasCommand = body.trim().toLowerCase() === '!figurinha';

          // Log para Debug
          if (hasImage) {
            console.log('Imagem detectada!');
          }
          if (hasVideo) {
            console.log('Vídeo detectado!');
          }
          if (hasCommand) {
            console.log('Comando detectado!');
          }

          // Verificar se é uma solicitação de sticker (imagem/vídeo + !Figurinha)
          if ((hasImage || hasVideo) && hasCommand) {
            try {
              console.log('Solicitação de sticker recebida');
              
              // Referência à mensagem da mídia
              let messageWithMedia = message;
              
              // Se for uma resposta a uma imagem
              if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                // Criar uma nova estrutura de mensagem para a imagem citada
                messageWithMedia = {
                  message: {
                    imageMessage: message.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage
                  }
                };
              }
              // Se for uma resposta a um vídeo
              else if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage) {
                // Criar uma nova estrutura de mensagem para o vídeo citado
                messageWithMedia = {
                  message: {
                    videoMessage: message.message.extendedTextMessage.contextInfo.quotedMessage.videoMessage
                  }
                };
              }
              
              // Verificar se é vídeo ou imagem
              const isVideo = hasVideo || messageWithMedia.message?.videoMessage;
              
              console.log(isVideo ? 'Processando vídeo para sticker animado' : 'Processando imagem para sticker');
              
              // Baixar a mídia
              const mediaBuffer = await downloadMediaMessage(
                messageWithMedia,
                'buffer',
                {},
                { 
                  logger: pino({ level: 'silent' }),
                  reuploadRequest: sock.updateMediaMessage
                }
              );
              
              // Log para debug
              console.log('Mídia baixada com sucesso, tamanho:', mediaBuffer.length, 'bytes');
              
              // Opções do sticker
              const stickerOptions = {
                pack: 'StickAI',
                author: config.sticker.author,
                type: isVideo ? 'full' : 'full', // 'full' para stickers animados
                categories: config.sticker.categories,
                quality: isVideo ? 30 : 70, // Menor qualidade para vídeos para reduzir tamanho
                fps: 20 // Frames por segundo para stickers animados
              };
              
              // Converter para sticker
              const stickerBuffer = await sticker.createSticker(mediaBuffer, stickerOptions, isVideo);
              
              // Enviar sticker de volta
              await sock.sendMessage(chat, { sticker: stickerBuffer });
              
              console.log(`Sticker ${isVideo ? 'animado' : 'estático'} enviado com sucesso!`);
            } catch (error) {
              console.error('Erro ao processar sticker:', error);
              console.error('Detalhes do erro:', error.stack);
              await sock.sendMessage(chat, { text: 'Erro ao criar sticker. Tente novamente.' });
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Erro ao conectar:', error);
    setTimeout(connectToWhatsApp, 10000);
  }
}

// Rotas da API para interface web
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota para obter status da conexão
app.get('/api/status', (req, res) => {
  res.json({
    status: connectionStatus,
    qrCode: connectionStatus === 'qr-ready' ? qrCodeData : null,
    offlineMode
  });
});

// Rota para verificar status do modo sticker
app.get('/api/sticker-mode', async (req, res) => {
  if (offlineMode) {
    res.json({ active: offlineStickerMode });
  } else {
    const active = await db.isStickerModeActive();
    res.json({ active });
  }
});

// Rota para ativar/desativar modo sticker
app.post('/api/sticker-mode', async (req, res) => {
  const { active } = req.body;
  
  if (offlineMode) {
    // Em modo offline, apenas armazenar na memória
    offlineStickerMode = active;
    res.json({ success: true, active, offlineMode: true });
    return;
  }
  
  const success = await db.setStickerMode(active);
  
  if (success) {
    res.json({ success: true, active });
  } else {
    res.status(500).json({ success: false, message: 'Erro ao atualizar configuração' });
  }
});

// Criar diretório público para interface web
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Iniciar aplicação
initializeApp(); 