import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

const FAQ_SECTIONS = [
  { key: "general", count: 7 },
  { key: "getting_started", count: 8 },
  { key: "events", count: 6 },
  { key: "lfg", count: 4 },
  { key: "organizer", count: 9 },
  { key: "mtg", count: 12 },
  { key: "clubs", count: 4 },
  { key: "notifications", count: 4 },
  { key: "privacy", count: 5 },
  { key: "tech_support", count: 10 },
  { key: "responsibility", count: 4 },
];

export default function FAQPage() {
  const { t } = useTranslation("faq");

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>

      {FAQ_SECTIONS.map(({ key, count }) => (
        <section
          key={key}
          className="rounded-lg border border-surface-hover bg-surface-card"
        >
          <h2 className="px-4 py-3 text-lg font-semibold text-text-primary">
            {t(`section_${key}`)}
          </h2>
          <div className="border-t border-surface-hover">
            {Array.from({ length: count }, (_, i) => {
              const idx = i + 1;
              return (
                <details
                  key={idx}
                  className="group border-b border-surface-hover last:border-b-0"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-text-primary hover:bg-surface-hover">
                    <span className="text-sm font-medium">
                      {t(`${key}_q${idx}`)}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-4 pb-3 text-sm leading-relaxed text-text-secondary">
                    {t(`${key}_a${idx}`)}
                  </p>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
