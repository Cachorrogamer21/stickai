# StickAI - Gerador Automático de Stickers para WhatsApp

O StickAI é uma aplicação que permite converter automaticamente imagens em stickers para WhatsApp. Basta enviar uma imagem com o texto "!Figurinha" e o sistema retornará a imagem convertida em sticker.

## Funcionalidades

- Conexão ao WhatsApp via QR Code utilizando a biblioteca Baileys
- Escuta de mensagens para detecção de comandos
- Conversão automática de imagens em stickers 
- Interface web para gerenciamento da conexão e ativação/desativação do serviço
- Armazenamento de configurações em banco de dados MySQL

## Pré-requisitos

- Node.js 16+
- MySQL ou MariaDB
- Navegador moderno

## Instalação

1. Clone o repositório:
```
git clone https://github.com/seu-usuario/stick-ai.git
cd stick-ai
```

2. Instale as dependências:
```
npm install
```

3. Configure o banco de dados:
Edite o arquivo `config.js` com as informações de conexão do seu banco de dados MySQL.

4. Inicie o servidor:
```
npm start
```

5. Acesse a interface web:
Abra o navegador e acesse `http://localhost:3000`

## Como usar

1. Abra a interface web e escaneie o QR Code com seu WhatsApp
2. Ative o modo sticker utilizando o toggle na interface
3. Envie uma imagem para seu WhatsApp conectado com o texto "!Figurinha"
4. O sistema converterá a imagem em sticker e enviará de volta automaticamente

## Tecnologias utilizadas

- Node.js
- Express.js
- Baileys (conexão WhatsApp Web)
- wa-sticker-formatter
- MySQL
- HTML/CSS/JavaScript

## Licença

Este projeto está licenciado sob a licença MIT.

## Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests. 