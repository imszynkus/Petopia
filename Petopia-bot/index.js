const { Telegraf } = require('telegraf');
const path = require('path');
const http = require('http');

// Pobieranie tokenu z ustawień serwera
const bot = new Telegraf(process.env.BOT_TOKEN);

// Reakcja na komendę /start
bot.start((ctx) => {
  const captionText = `🐾 *WELCOME TO PETOPIA!* 🐾\n\n` +
    `Hatch eggs, collect rare 3D pets, and earn coins for the upcoming Airdrop!\n\n` +
    `Tap below to start your adventure:`;

  ctx.replyWithPhoto(
    { source: path.join(__dirname, 'logo.png') },
    {
      caption: captionText,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { 
              text: '🎮 Play Petopia', 
              web_app: { url: 'https://twoja-gra.vercel.app' }
            }
          ],
          [
            { 
              text: '📢 Join Official Channel', 
              url: 'https://t.me/TwojKanalPetopia'
            }
          ]
        ]
      }
    }
  ).catch((err) => {
    console.error('Błąd podczas wysyłania /start:', err);
  });
});

// Uruchomienie bota
bot.launch()
  .then(() => console.log('🚀 Bot Petopia został pomyślnie uruchomiony!'))
  .catch((err) => console.error('Błąd uruchamiania bota:', err));

// Drobny serwer HTTP dla Rendera (wymagany dla planu Free Web Service)
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Petopia Bot is running!');
}).listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Bezpieczne wyłączanie
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
