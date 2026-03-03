const ru = {
  // Navigation
  nav: {
    jobs: "Вакансии",
    employers: "Работодателям",
    about: "О нас",
    login: "Войти",
    register: "Регистрация",
    dashboard: "Личный кабинет",
    adminPanel: "Админ-панель",
    logout: "Выйти",
  },
  // Roles
  roles: {
    admin: "Администратор",
    employer: "Работодатель",
    candidate: "Соискатель",
  },
  // Home page
  home: {
    badge: "ПЛАТФОРМА НАЙМА · УЗБЕКИСТАН",
    heroTitle1: "Найди работу",
    heroTitle2: "своей мечты",
    heroSubtitle: "Тысячи вакансий от реальных работодателей.\nПрофессионально. Быстро. Надёжно.",
    findJob: "Найти работу",
    postJob: "Разместить вакансию",
    features: [
      {
        title: "Только Узбекистан",
        desc: "Вакансии и кандидаты из Ташкента, Самарканда, Бухары и других городов страны",
      },
      {
        title: "Быстрый отклик",
        desc: "Отправьте резюме в один клик — работодатель получит его мгновенно",
      },
      {
        title: "Бесплатно для соискателей",
        desc: "Регистрация, создание резюме и отклики — полностью бесплатно",
      },
    ],
    freshJobs: "СВЕЖИЕ ВАКАНСИИ",
    latestOffers: "Последние предложения",
    allJobs: "Все вакансии →",
    noJobs: "Вакансий пока нет",
    postFirst: "Разместить первую →",
    forEmployers: "ДЛЯ РАБОТОДАТЕЛЕЙ",
    closeVacancy: "Закройте вакансию",
    closeVacancy2: "за 24 часа",
    employerDesc:
      "Создайте компанию и публикуйте вакансии. Получайте отклики от тысяч соискателей по всему Узбекистану.",
    salaryOnAgreement: "Зарплата по договорённости",
    sum: "сум",
    today: "Сегодня",
    yesterday: "Вчера",
    daysAgo: (d: number) => `${d} дня назад`,
  },
  // Jobs page
  jobs: {
    title: "ВАКАНСИИ",
    allOffers: "Все предложения",
    loading: "Загружаем...",
    jobsCount: (n: number) => `${n} вакансий`,
    search: "ПОИСК",
    searchPlaceholder: "Должность, навык...",
    city: "ГОРОД",
    allCities: "Все города",
    format: "ФОРМАТ",
    experience: "ОПЫТ",
    resetFilters: "СБРОСИТЬ ФИЛЬТРЫ",
    notFound: "Ничего не найдено",
    noTitle: "Без названия",
    formats: {
      any: "Любой формат",
      office: "Офис",
      remote: "Удалённо",
      hybrid: "Гибрид",
    },
    experienceLevels: {
      any: "Любой опыт",
      no_experience: "Без опыта",
      junior: "До 1 года",
      middle: "1–3 года",
      senior: "3–5 лет",
      lead: "5+ лет",
    },
    employmentTypes: {
      "full-time": "Полная",
      "part-time": "Частичная",
      contract: "Контракт",
      internship: "Стажировка",
    },
    sum: "сум",
    salaryOnAgreement: "Зарплата по договорённости",
    today: "Сегодня",
    yesterday: "Вчера",
    daysAgo: (d: number) => `${d} дн. назад`,
  },
  // About page
  about: {
    title: "О нас",
    description:
      "FreedomHIRE — платформа для поиска работы и найма в Узбекистане. Здесь соискатели находят вакансии, а компании быстро закрывают позиции.",
  },
  // Employers page
  employers: {
    title: "Работодателям",
    subtitle:
      "Создайте компанию, разместите вакансии и получайте отклики. Мы помогаем нанимать быстрее и проще.",
    features: [
      { icon: "⚡", title: "Быстрое размещение", desc: "Создайте вакансию за пару минут и начните собирать отклики." },
      { icon: "🎯", title: "Кандидаты по Узбекистану", desc: "Фокус на локальный рынок: Ташкент и другие города." },
      { icon: "📊", title: "Кабинет работодателя", desc: "Управляйте вакансиями и откликами в одном месте." },
    ],
    registerBtn: "Зарегистрироваться как работодатель",
    loginBtn: "Войти в кабинет",
  },
  // Auth
  auth: {
    blocked: "🚫 Ваш аккаунт заблокирован. Обратитесь в поддержку: support@freedomhire.uz",
    codeSentTo: (email: string) => `Код отправлен на ${email}`,
    enterEmail: "Введите email.",
    sendCodeError: "Ошибка отправки кода",
  },
  // Onboarding
  onboarding: {
    detectingProfile: "Определяем ваш профиль...",
  },
  // Common
  common: {
    sum: "сум",
    new: "NEW",
    salary: {
      from: (v: string) => `от ${v}`,
      to: (v: string) => `до ${v}`,
    },
    cities: [
      "Все города", "Ташкент", "Самарканд", "Бухара", "Наманган",
      "Андижан", "Фергана", "Нукус", "Карши", "Термез",
      "Коканд", "Ургенч", "Навои", "Джизак",
    ],
  },
  // Metadata
  meta: {
    title: "Freedom HIRE — Платформа найма в Узбекистане",
    description:
      "Найдите работу мечты или лучших сотрудников. Тысячи вакансий от реальных компаний Узбекистана.",
    ogTitle: "Freedom HIRE",
    ogDescription: "Платформа найма в Узбекистане",
  },
} as const;

export default ru;
export type Translations = typeof ru;
