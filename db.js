const mysql = require('mysql2/promise');
const config = require('./config');

// Configuração sem o banco de dados específico para poder criar o banco
const rootConfig = {
  ...config.database,
  database: undefined
};

// Criar pool de conexões
let pool;

try {
  pool = mysql.createPool(config.database);
} catch (error) {
  console.error('Erro ao criar pool de conexões:', error);
}

// Verificar se o banco de dados está acessível e criar se não existir
async function checkDatabase() {
  try {
    if (!pool) return false;
    
    try {
      // Tenta conectar ao banco específico
      const conn = await pool.getConnection();
      conn.release();
      return true;
    } catch (error) {
      if (error.code === 'ER_BAD_DB_ERROR') {
        // Banco não existe, tenta criar
        console.log('Banco de dados não existe, tentando criar...');
        
        try {
          // Conecta ao MySQL sem especificar o banco
          const rootPool = mysql.createPool(rootConfig);
          
          // Cria o banco de dados
          await rootPool.query(`CREATE DATABASE IF NOT EXISTS ${config.database.database}`);
          console.log(`Banco de dados ${config.database.database} criado com sucesso!`);
          
          // Reconecta ao banco de dados criado
          pool = mysql.createPool(config.database);
          
          return true;
        } catch (createError) {
          console.error('Erro ao criar banco de dados:', createError);
          return false;
        }
      } else {
        console.error('Erro ao verificar conexão com banco de dados:', error);
        return false;
      }
    }
  } catch (error) {
    console.error('Erro ao verificar conexão com banco de dados:', error);
    return false;
  }
}

// Função para verificar se o modo sticker está ativo
async function isStickerModeActive() {
  try {
    if (!await checkDatabase()) {
      console.log('Banco de dados indisponível, retornando modo sticker ativo como padrão');
      return true; // Retorna true como padrão quando não há banco de dados
    }
    
    const [rows] = await pool.query('SELECT value FROM settings WHERE name = "sticker_mode"');
    return rows.length > 0 && rows[0].value === '1';
  } catch (error) {
    console.error('Erro ao verificar modo sticker:', error);
    return true; // Retorna true como padrão em caso de erro
  }
}

// Função para ativar o modo sticker
async function setStickerMode(active) {
  const value = active ? '1' : '0';
  try {
    if (!await checkDatabase()) {
      console.log('Banco de dados indisponível, não foi possível atualizar modo');
      return false;
    }
    
    await pool.query(
      'INSERT INTO settings (name, value) VALUES ("sticker_mode", ?) ON DUPLICATE KEY UPDATE value = ?',
      [value, value]
    );
    return true;
  } catch (error) {
    console.error('Erro ao atualizar modo sticker:', error);
    return false;
  }
}

// Script para inicialização da tabela (executar apenas se necessário)
async function initDatabase() {
  try {
    if (!await checkDatabase()) {
      console.log('Banco de dados indisponível, não foi possível inicializar');
      return false;
    }
    
    // Verificar se existe o banco de dados
    await pool.query(`CREATE DATABASE IF NOT EXISTS ${config.database.database}`);
    
    // Usar o banco de dados
    await pool.query(`USE ${config.database.database}`);
    
    // Criar tabela se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        name VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Inserir valor padrão se não existir
    await pool.query(`
      INSERT IGNORE INTO settings (name, value) VALUES ('sticker_mode', '1')
    `);
    
    console.log('Banco de dados inicializado com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    return false;
  }
}

module.exports = {
  isStickerModeActive,
  setStickerMode,
  initDatabase,
  checkDatabase
}; 