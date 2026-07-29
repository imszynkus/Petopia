const { Telegraf } = require('telegraf');
const path = require('path');

// Pobieranie tokenu z ustawień serwera (zmiennych środowiskowych)
const bot = new Telegraf(process.env.BOT_TOKEN);

// Reakcja na komendę /start
bot.start((ctx) => {
  // Tekst powitalny
  const captionText = `🐾 *WELCOME TO PETOPIA!* 🐾\n\n` +
    `Hatch eggs, collect rare 3D pets, and earn coins for the upcoming Airdrop!\n\n` +
    `Tap below to start your adventure:`;

  // Wysyłanie zdjęcia z lokalnego folderu wraz z przyciskami
  ctx.replyWithPhoto(
    { source: path.join(__dirname, 'img/logo.png') }, // Nazwa Twojego pliku ze zdjęciem
    {
      caption: captionText,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            // Przycisk uruchamiający grę wewnątrz Telegrama
            { 
              text: '🎮 Play Petopia', 
              web_app: { url: 'https://twoja-gra.vercel.app' } // Tutaj wkleimy link do gry, gdy przetestujemy HTML
            }
          ],
          [
            // Przycisk kierujący do kanału ze społecznością
            { 
              text: '📢 Join Official Channel', 
              url: 'https://t.me/TwojKanalPetopia' // Podmień na link do swojego kanału
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

// Bezpieczne wyłączanie aplikacji przy zatrzymaniu serwera
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));