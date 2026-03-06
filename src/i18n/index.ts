import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "@/locales/en/common.json";
import enEvents from "@/locales/en/events.json";
import enProfile from "@/locales/en/profile.json";
import enVenue from "@/locales/en/venue.json";
import ruCommon from "@/locales/ru/common.json";
import ruEvents from "@/locales/ru/events.json";
import ruProfile from "@/locales/ru/profile.json";
import ruVenue from "@/locales/ru/venue.json";
import heCommon from "@/locales/he/common.json";
import heEvents from "@/locales/he/events.json";
import heProfile from "@/locales/he/profile.json";
import heVenue from "@/locales/he/venue.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        events: enEvents,
        profile: enProfile,
        venue: enVenue,
      },
      ru: {
        common: ruCommon,
        events: ruEvents,
        profile: ruProfile,
        venue: ruVenue,
      },
      he: {
        common: heCommon,
        events: heEvents,
        profile: heProfile,
        venue: heVenue,
      },
    },
    lng: "en",
    fallbackLng: "en",
    defaultNS: "common",
    fallbackNS: "common",
    ns: ["common", "events", "profile", "venue"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage"],
      caches: ["localStorage"],
    },
  });

export default i18n;
