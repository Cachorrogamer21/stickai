document.addEventListener('DOMContentLoaded', () => {
  // Elementos da interface
  const statusIcon = document.getElementById('status-icon');
  const connectionStatus = document.getElementById('connection-status');
  const qrcodeContainer = document.getElementById('qrcode-container');
  const qrcodeElement = document.getElementById('qrcode');
  const stickerModeToggle = document.getElementById('sticker-mode-toggle');

  // Flag para modo offline
  let isOfflineMode = false;
  let lastQrCode = null;
  let retryCount = 0;
  const MAX_RETRIES = 5;

  // Tradução de status
  const statusMessages = {
    'disconnected': 'Desconectado',
    'connected': 'Conectado',
    'qr-ready': 'QR Code disponível - Escaneie para conectar',
    'initializing': 'Inicializando conexão...'
  };

  // Verificar status da conexão a cada 3 segundos
  checkConnectionStatus();
  const statusInterval = setInterval(checkConnectionStatus, 3000);

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
      // Usar caminho absoluto para API
      const apiUrl = window.location.origin + '/api/status';
      console.log('Verificando status em:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Resposta inválida: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Status recebido:', data);
      
      // Resetar contador de tentativas
      retryCount = 0;
      
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
        // Verificar se é um novo QR code
        if (data.qrCode !== lastQrCode) {
          lastQrCode = data.qrCode;
          console.log('Novo QR code recebido, tamanho:', data.qrCode.length);
          
          // Mostrar container
          qrcodeContainer.classList.remove('hidden');
          
          // Limpar QR Code anterior
          qrcodeElement.innerHTML = '';
          
          try {
            // Método direto
            new QRCode(qrcodeElement, {
              text: data.qrCode,
              width: 256,
              height: 256,
              colorDark: '#000000',
              colorLight: '#FFFFFF',
              correctLevel: QRCode.CorrectLevel.H
            });
            console.log('QR code renderizado com sucesso');
          } catch (error) {
            console.error('Erro ao gerar QR code:', error);
            
            // Mensagem de erro para o usuário
            qrcodeElement.innerHTML = '<p style="color:red">Erro ao gerar QR Code. Recarregue a página.</p>';
          }
        }
      } else {
        qrcodeContainer.classList.add('hidden');
        // Limpar o último QR code quando não for mais necessário
        lastQrCode = null;
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      statusIcon.className = 'status-icon disconnected';
      connectionStatus.textContent = 'Erro de conexão';
      
      // Contar tentativas e parar de tentar após o limite
      retryCount++;
      if (retryCount > MAX_RETRIES) {
        console.error('Máximo de tentativas alcançado, parando verificação automática');
        clearInterval(statusInterval);
        
        // Adicionar mensagem de erro
        if (!document.querySelector('.connection-error')) {
          const errorMsg = document.createElement('div');
          errorMsg.className = 'connection-error';
          errorMsg.innerHTML = 'Não foi possível conectar ao servidor. <button id="retry-btn">Tentar novamente</button>';
          document.querySelector('.container').prepend(errorMsg);
          
          // Adicionar botão para tentar novamente
          document.getElementById('retry-btn').addEventListener('click', () => {
            retryCount = 0;
            errorMsg.remove();
            checkConnectionStatus();
            setInterval(checkConnectionStatus, 3000);
          });
        }
      }
    }
  }

  // Função para verificar status do modo sticker
  async function checkStickerMode() {
    try {
      // Usar caminho absoluto para API
      const apiUrl = window.location.origin + '/api/sticker-mode';
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Resposta inválida: ${response.status} ${response.statusText}`);
      }
      
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
      // Usar caminho absoluto para API
      const apiUrl = window.location.origin + '/api/sticker-mode';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active })
      });
      
      if (!response.ok) {
        throw new Error(`Resposta inválida: ${response.status} ${response.statusText}`);
      }
      
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