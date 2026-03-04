import { Component, type ReactNode, type ErrorInfo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

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
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-accent" />
              <p className="text-lg font-semibold text-text-primary">Something went wrong</p>
              <Button onClick={() => this.setState({ hasError: false })}>
                Try again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
