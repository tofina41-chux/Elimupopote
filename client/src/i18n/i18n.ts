import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import sw from "./sw.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    sw: { translation: sw },
  },
  lng: localStorage.getItem("elimupopote_lang") || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setAppLanguage(lang: "en" | "sw") {
  localStorage.setItem("elimupopote_lang", lang);
  i18n.changeLanguage(lang);
}

export default i18n;
