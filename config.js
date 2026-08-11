// config.js — здесь и только здесь меняются ссылки и название бренда.
// Всё остальное в script.js подставляет эти значения автоматически
// в любую кнопку/ссылку с атрибутом data-link="..." в index.html.

const LEWDLY_CONFIG = {
  // Все кнопки "Заказать" / "Создать заказ" / "Выбрать" / "Написать в Telegram"
  // ведут напрямую в личные сообщения — никакого бота.
  orderUrl: "https://t.me/lewdlys",

  // Кнопка "Наш канал" / data-link="channel"
  channelUrl: "https://t.me/DS_LEWDLY",

  brandName: "LEWDLY",
  year: new Date().getFullYear(),
};
