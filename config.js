module.exports = {
  database: {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'stick_ai',
    port: 3306,
    connectionLimit: 10,
    connectTimeout: 10000, // 10 segundos
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  },
  sticker: {
    author: 'StickAI',
    categories: ['🤖', '🎮']
  }
}; 