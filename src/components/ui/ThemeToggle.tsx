import { Sun, Moon } from "lucide-react";
import { useUIStore, type ThemeId } from "@/store/uiStore";

const THEME_CYCLE: ThemeId[] = ["dark", "light"];
const THEME_ICON: Record<ThemeId, typeof Sun> = {
  light: Sun,
  dark: Moon,
};
const THEME_LABEL: Record<ThemeId, string> = {
  dark: "Switch to light theme",
  light: "Switch to dark theme",
};

export function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const nextTheme = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
  const Icon = THEME_ICON[theme];

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:text-accent transition-colors"
      aria-label={THEME_LABEL[theme]}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
