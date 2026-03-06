import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const RTL_LANGUAGES = ["he", "ar"];

export function useRTLDirection() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const dir = RTL_LANGUAGES.includes(i18n.language) ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
}
