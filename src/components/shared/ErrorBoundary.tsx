import { Component, type ReactNode, type ErrorInfo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback onReset={() => this.setState({ hasError: false })} />
      );
    }
    return this.props.children;
  }
}

function ErrorFallback({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation("common");
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <p className="text-lg font-semibold text-text-primary">{t("error_occurred")}</p>
      <Button onClick={onReset}>{t("try_again")}</Button>
    </div>
  );
}
