document.addEventListener('DOMContentLoaded', () => {
  // Elementos da interface
  const statusIcon = document.getElementById('status-icon');
  const connectionStatus = document.getElementById('connection-status');
  const qrcodeContainer = document.getElementById('qrcode-container');
  const qrcodeElement = document.getElementById('qrcode');
  const stickerModeToggle = document.getElementById('sticker-mode-toggle');

  // Flag para modo offline
  let isOfflineMode = false;

  // Tradução de status
  const statusMessages = {
    'disconnected': 'Desconectado',
    'connected': 'Conectado',
    'qr-ready': 'QR Code disponível'
  };

  // Verificar status da conexão a cada 5 segundos
  checkConnectionStatus();
  setInterval(checkConnectionStatus, 5000);

  // Verificar status do modo sticker
  checkStickerMode();

  // Listener para o toggle de modo sticker
  stickerModeToggle.addEventListener('change', async () => {
    const active = stickerModeToggle.checked;
    await updateStickerMode(active);
  });

  // Função para verificar status da conexão
  async function checkConnectionStatus() {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      
      // Verificar se estamos em modo offline
      isOfflineMode = data.offlineMode || false;
      
      if (isOfflineMode) {
        // Adicionar indicação visual de modo offline
        document.body.classList.add('offline-mode');
        
        // Adicionar mensagem de aviso se ainda não existir
        if (!document.querySelector('.offline-alert')) {
          const alert = document.createElement('div');
          alert.className = 'offline-alert';
          alert.innerHTML = 'Modo offline ativo: Banco de dados indisponível';
          document.querySelector('.container').prepend(alert);
        }
      }
      
      // Atualizar ícone e texto de status
      statusIcon.className = 'status-icon ' + data.status;
      connectionStatus.textContent = statusMessages[data.status] || 'Desconhecido';
      
      // Exibir ou ocultar QR Code
      if (data.status === 'qr-ready' && data.qrCode) {
        qrcodeContainer.classList.remove('hidden');
        
        // Limpar QR Code anterior
        qrcodeElement.innerHTML = '';
        
        // Gerar novo QR Code
        QRCode.toCanvas(qrcodeElement, data.qrCode, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } else {
        qrcodeContainer.classList.add('hidden');
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      statusIcon.className = 'status-icon disconnected';
      connectionStatus.textContent = 'Erro de conexão';
    }
  }

  // Função para verificar status do modo sticker
  async function checkStickerMode() {
    try {
      const response = await fetch('/api/sticker-mode');
      const data = await response.json();
      
      // Atualizar estado do toggle
      stickerModeToggle.checked = data.active;
    } catch (error) {
      console.error('Erro ao verificar modo sticker:', error);
      // Em caso de erro, assumir que está ativo
      stickerModeToggle.checked = true;
    }
  }

  // Função para atualizar modo sticker
  async function updateStickerMode(active) {
    try {
      const response = await fetch('/api/sticker-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Feedback visual de sucesso
        const toggleElement = stickerModeToggle.parentElement;
        
        toggleElement.style.boxShadow = '0 0 8px var(--accent)';
        
        setTimeout(() => {
          toggleElement.style.boxShadow = 'none';
        }, 1000);
        
        // Se estiver em modo offline, mostrar aviso
        if (data.offlineMode && !document.querySelector('.toggle-offline-notice')) {
          const notice = document.createElement('div');
          notice.className = 'toggle-offline-notice';
          notice.textContent = 'Configuração salva apenas na memória (modo offline)';
          toggleElement.parentElement.appendChild(notice);
        }
      } else {
        console.error('Erro ao atualizar modo sticker:', data.message);
        // Reverter estado do toggle em caso de erro
        stickerModeToggle.checked = !active;
      }
    } catch (error) {
      console.error('Erro ao atualizar modo sticker:', error);
      // Reverter estado do toggle em caso de erro
      stickerModeToggle.checked = !active;
    }
  }
}); 