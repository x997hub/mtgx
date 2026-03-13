import { useTranslation } from "react-i18next";

import contentRu from "../../docs/mtgx-club-owner-presentation.md?raw";
import contentEn from "../../docs/mtgx-club-owner-presentation-en.md?raw";
import contentHe from "../../docs/mtgx-club-owner-presentation-he.md?raw";

const CONTENT: Record<string, string> = {
  ru: contentRu,
  en: contentEn,
  he: contentHe,
};

function renderInline(text: string): React.ReactNode[] {
  const boldParts = text.split(/\*\*(.+?)\*\*/g);
  const result: React.ReactNode[] = [];

  boldParts.forEach((part, i) => {
    if (i % 2 === 1) {
      result.push(
        <strong key={`b${i}`} className="font-semibold text-text-primary">
          {part}
        </strong>,
      );
    } else {
      const italicParts = part.split(/\*([^*]+)\*/g);
      italicParts.forEach((ip, j) => {
        if (j % 2 === 1) {
          result.push(<em key={`i${i}-${j}`}>{ip}</em>);
        } else if (ip) {
          result.push(ip);
        }
      });
    }
  });

  return result;
}

function MarkdownContent({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed === "---") {
          return <hr key={i} className="my-6 border-surface-hover" />;
        }

        if (trimmed.startsWith("# ")) {
          return (
            <h1
              key={i}
              className="text-2xl font-bold text-text-primary"
            >
              {renderInline(trimmed.slice(2))}
            </h1>
          );
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h3
              key={i}
              className="mt-4 text-base font-semibold text-text-primary"
            >
              {renderInline(trimmed.slice(4))}
            </h3>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="mt-6 text-xl font-bold text-text-primary"
            >
              {renderInline(trimmed.slice(3))}
            </h2>
          );
        }

        return (
          <p
            key={i}
            className="text-sm leading-relaxed text-text-secondary"
          >
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export default function InfoPage() {
  const { i18n } = useTranslation();

  const lang = i18n.language.startsWith("he")
    ? "he"
    : i18n.language.startsWith("ru")
      ? "ru"
      : "en";

  const content = CONTENT[lang] || CONTENT.en;

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24 md:pb-6">
      <MarkdownContent content={content} />
    </div>
  );
}
