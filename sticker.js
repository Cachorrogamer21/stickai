const fs = require('fs');
const path = require('path');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const config = require('./config');

// Criar diretório temporário se não existir
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Converte imagem ou vídeo em sticker
 * @param {Buffer} mediaBuffer - Buffer da mídia (imagem ou vídeo)
 * @param {Object} options - Opções adicionais
 * @param {boolean} isVideo - Se a mídia é um vídeo
 * @returns {Promise<Buffer>} - Buffer do sticker
 */
async function createSticker(mediaBuffer, options = {}, isVideo = false) {
  try {
    const stickerOptions = {
      pack: options.pack || 'StickAI',
      author: options.author || config.sticker.author,
      type: options.type || StickerTypes.FULL,
      categories: options.categories || config.sticker.categories,
      quality: options.quality || (isVideo ? 30 : 70),
      fps: options.fps || 20
    };

    console.log(`Criando sticker ${isVideo ? 'animado' : 'estático'} com opções:`, JSON.stringify(stickerOptions));

    // Para vídeos, podemos salvar temporariamente para debug
    if (isVideo) {
      const tempPath = saveMediaTemp(mediaBuffer, isVideo ? 'mp4' : 'jpg');
      console.log(`Mídia salva temporariamente em: ${tempPath}`);
    }

    const sticker = new Sticker(mediaBuffer, stickerOptions);
    const buffer = await sticker.toBuffer();
    
    console.log(`Sticker criado com sucesso! Tamanho: ${buffer.length} bytes`);
    return buffer;
  } catch (error) {
    console.error('Erro ao criar sticker:', error);
    throw new Error('Não foi possível criar o sticker: ' + error.message);
  }
}

/**
 * Salva buffer de mídia em arquivo temporário
 * @param {Buffer} buffer - Buffer da mídia
 * @param {string} ext - Extensão do arquivo (jpg, mp4, etc)
 * @returns {string} - Caminho do arquivo salvo
 */
function saveMediaTemp(buffer, ext = 'jpg') {
  const filename = `media_${Date.now()}.${ext}`;
  const filepath = path.join(tempDir, filename);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

/**
 * Remove arquivo temporário
 * @param {string} filepath - Caminho do arquivo a ser removido
 */
function removeTemp(filepath) {
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}

module.exports = {
  createSticker,
  saveMediaTemp,
  removeTemp
}; 