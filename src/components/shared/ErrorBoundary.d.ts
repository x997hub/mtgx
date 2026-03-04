import { Component, type ReactNode, type ErrorInfo } from "react";
interface Props {
    children: ReactNode;
}
interface State {
    hasError: boolean;
}
export declare class ErrorBoundary extends Component<Props, State> {
    state: State;
    static getDerivedStateFromError(): State;
    componentDidCatch(error: Error, info: ErrorInfo): void;
    render(): string | number | bigint | boolean | import("react/jsx-runtime").JSX.Element | Iterable<ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined;
}
export {};
//# sourceMappingURL=ErrorBoundary.d.ts.map