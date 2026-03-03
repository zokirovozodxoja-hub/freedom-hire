import type { Translations } from "./ru";

const uz: Translations = {
  // Navigation
  nav: {
    jobs: "Vakansiyalar",
    employers: "Ish beruvchilar",
    about: "Biz haqimizda",
    login: "Kirish",
    register: "Ro'yxatdan o'tish",
    dashboard: "Shaxsiy kabinet",
    adminPanel: "Admin panel",
    logout: "Chiqish",
  },
  // Roles
  roles: {
    admin: "Administrator",
    employer: "Ish beruvchi",
    candidate: "Ish izlovchi",
  },
  // Home page
  home: {
    badge: "ISHGA YOLLASH PLATFORMASI · O'ZBEKISTON",
    heroTitle1: "Orzuingizdagi",
    heroTitle2: "ishni toping",
    heroSubtitle: "Haqiqiy ish beruvchilardan minglab vakansiyalar.\nProfessional. Tez. Ishonchli.",
    findJob: "Ish topish",
    postJob: "Vakansiya joylashtirish",
    features: [
      {
        title: "Faqat O'zbekiston",
        desc: "Toshkent, Samarqand, Buxoro va boshqa shaharlardan vakansiyalar va nomzodlar",
      },
      {
        title: "Tezkor ariza",
        desc: "Rezyumeni bir bosish bilan yuboring — ish beruvchi uni darhol oladi",
      },
      {
        title: "Ish izlovchilar uchun bepul",
        desc: "Ro'yxatdan o'tish, rezyume yaratish va ariza berish — butunlay bepul",
      },
    ],
    freshJobs: "YANGI VAKANSIYALAR",
    latestOffers: "So'nggi takliflar",
    allJobs: "Barcha vakansiyalar →",
    noJobs: "Hozircha vakansiyalar yo'q",
    postFirst: "Birinchisini joylashtirish →",
    forEmployers: "ISH BERUVCHILAR UCHUN",
    closeVacancy: "Vakansiyani yoping",
    closeVacancy2: "24 soat ichida",
    employerDesc:
      "Kompaniya yarating va vakansiyalar joylashtiring. Butun O'zbekistondagi minglab ish izlovchilardan arizalar qabul qiling.",
    salaryOnAgreement: "Maosh kelishuv asosida",
    sum: "so'm",
    today: "Bugun",
    yesterday: "Kecha",
    daysAgo: (d: number) => `${d} kun oldin`,
  },
  // Jobs page
  jobs: {
    title: "VAKANSIYALAR",
    allOffers: "Barcha takliflar",
    loading: "Yuklanmoqda...",
    jobsCount: (n: number) => `${n} ta vakansiya`,
    search: "QIDIRUV",
    searchPlaceholder: "Lavozim, ko'nikma...",
    city: "SHAHAR",
    allCities: "Barcha shaharlar",
    format: "FORMAT",
    experience: "TAJRIBA",
    resetFilters: "FILTRLARNI TOZALASH",
    notFound: "Hech narsa topilmadi",
    noTitle: "Nomsiz",
    formats: {
      any: "Istalgan format",
      office: "Ofis",
      remote: "Masofaviy",
      hybrid: "Gibrid",
    },
    experienceLevels: {
      any: "Istalgan tajriba",
      no_experience: "Tajribasiz",
      junior: "1 yilgacha",
      middle: "1–3 yil",
      senior: "3–5 yil",
      lead: "5+ yil",
    },
    employmentTypes: {
      "full-time": "To'liq",
      "part-time": "Yarim stavka",
      contract: "Shartnoma",
      internship: "Amaliyot",
    },
    sum: "so'm",
    salaryOnAgreement: "Maosh kelishuv asosida",
    today: "Bugun",
    yesterday: "Kecha",
    daysAgo: (d: number) => `${d} kun oldin`,
  },
  // About page
  about: {
    title: "Biz haqimizda",
    description:
      "FreedomHIRE — O'zbekistonda ish qidirish va yollash platformasi. Bu yerda ish izlovchilar vakansiyalar topadi, kompaniyalar esa tezda pozitsiyalarni to'ldiradi.",
  },
  // Employers page
  employers: {
    title: "Ish beruvchilar uchun",
    subtitle:
      "Kompaniya yarating, vakansiyalar joylashtiring va arizalar qabul qiling. Biz tezroq va osonroq yollashga yordam beramiz.",
    features: [
      { icon: "⚡", title: "Tezkor joylashtirish", desc: "Bir necha daqiqada vakansiya yarating va arizalar yig'ishni boshlang." },
      { icon: "🎯", title: "O'zbekistondagi nomzodlar", desc: "Mahalliy bozorga e'tibor: Toshkent va boshqa shaharlar." },
      { icon: "📊", title: "Ish beruvchi kabineti", desc: "Vakansiyalar va arizalarni bir joyda boshqaring." },
    ],
    registerBtn: "Ish beruvchi sifatida ro'yxatdan o'tish",
    loginBtn: "Kabinetga kirish",
  },
  // Auth
  auth: {
    blocked: "🚫 Hisobingiz bloklangan. Qo'llab-quvvatlash xizmatiga murojaat qiling: support@freedomhire.uz",
    codeSentTo: (email: string) => `Kod ${email} manziliga yuborildi`,
    enterEmail: "Email kiriting.",
    sendCodeError: "Kod yuborishda xatolik",
  },
  // Onboarding
  onboarding: {
    detectingProfile: "Profilingiz aniqlanmoqda...",
  },
  // Common
  common: {
    sum: "so'm",
    new: "YANGI",
    salary: {
      from: (v: string) => `${v} dan`,
      to: (v: string) => `${v} gacha`,
    },
    cities: [
      "Barcha shaharlar", "Toshkent", "Samarqand", "Buxoro", "Namangan",
      "Andijon", "Farg'ona", "Nukus", "Qarshi", "Termiz",
      "Qo'qon", "Urganch", "Navoiy", "Jizzax",
    ],
  },
  // Metadata
  meta: {
    title: "Freedom HIRE — O'zbekistonda ishga yollash platformasi",
    description:
      "Orzuingizdagi ishni yoki eng yaxshi xodimlarni toping. O'zbekiston kompaniyalaridan minglab vakansiyalar.",
    ogTitle: "Freedom HIRE",
    ogDescription: "O'zbekistonda ishga yollash platformasi",
  },
};

export default uz;
