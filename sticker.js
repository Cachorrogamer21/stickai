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
 * Converte imagem em sticker
 * @param {Buffer} imageBuffer - Buffer da imagem
 * @param {Object} options - Opções adicionais
 * @returns {Promise<Buffer>} - Buffer do sticker
 */
async function createSticker(imageBuffer, options = {}) {
  try {
    console.log('Criando sticker com buffer de tamanho:', imageBuffer.length);
    
    // Verificar se o imageBuffer é válido
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Buffer de imagem inválido ou vazio');
    }
    
    // Salvar imagem temporariamente para debug (opcional)
    const tempImagePath = saveImageTemp(imageBuffer);
    console.log('Imagem salva temporariamente em:', tempImagePath);
    
    // Definir opções com fallbacks para evitar erros
    const stickerOptions = {
      pack: options.pack || 'StickAI',
      author: options.author || 'StickAI',
      type: StickerTypes.FULL,
      categories: options.categories || ['🤖'],
      quality: options.quality || 70
    };
    
    console.log('Configurando sticker com opções:', JSON.stringify(stickerOptions));
    
    // Criar o sticker
    const sticker = new Sticker(imageBuffer, stickerOptions);
    console.log('Sticker criado, convertendo para buffer...');
    
    // Converter para buffer
    const buffer = await sticker.toBuffer();
    console.log('Buffer do sticker gerado com sucesso, tamanho:', buffer.length);
    
    // Limpar arquivo temporário
    removeTemp(tempImagePath);
    
    return buffer;
  } catch (error) {
    console.error('Erro detalhado ao criar sticker:', error);
    console.error('Stack trace:', error.stack);
    throw new Error(`Não foi possível criar o sticker: ${error.message}`);
  }
}

/**
 * Salva buffer de imagem em arquivo temporário
 * @param {Buffer} buffer - Buffer da imagem
 * @returns {string} - Caminho do arquivo salvo
 */
function saveImageTemp(buffer) {
  try {
    const filename = `img_${Date.now()}.jpg`;
    const filepath = path.join(tempDir, filename);
    fs.writeFileSync(filepath, buffer);
    return filepath;
  } catch (error) {
    console.error('Erro ao salvar arquivo temporário:', error);
    return null;
  }
}

/**
 * Remove arquivo temporário
 * @param {string} filepath - Caminho do arquivo a ser removido
 */
function removeTemp(filepath) {
  if (filepath && fs.existsSync(filepath)) {
    try {
      fs.unlinkSync(filepath);
    } catch (error) {
      console.error('Erro ao remover arquivo temporário:', error);
    }
  }
}

module.exports = {
  createSticker,
  saveImageTemp,
  removeTemp
}; 