import { Component, type ReactNode, type ErrorInfo } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { t } = useTranslation("common");
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="bg-surface-card border-surface-hover max-w-md w-full">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400" />
          <h2 className="text-lg font-semibold text-text-primary">
            {t("error_occurred")}
          </h2>
          {error?.message && (
            <p className="text-base text-text-secondary">{error.message}</p>
          )}
          <Button onClick={onReset} className="min-h-[44px]">
            {t("try_again")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
