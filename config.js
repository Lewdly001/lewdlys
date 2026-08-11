// config.js — здесь и только здесь меняются ссылки и название бренда.
// Всё остальное в script.js подставляет эти значения автоматически
// в любую кнопку/ссылку с атрибутом data-link="..." в index.html.

const LEWDLY_CONFIG = {
  // Кнопки "Заказать" / "Создать заказ" / data-link="bot"
  botUrl: "https://t.me/your_bot",

  // Кнопка "Написать в Telegram" / data-link="contact"
  contactUrl: "https://t.me/your_username",

  // Кнопка "Наш канал" / data-link="channel"
  channelUrl: "https://t.me/your_channel",

  brandName: "LEWDLY",
  year: new Date().getFullYear(),
};
