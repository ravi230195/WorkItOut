// components/system/ErrorBoundary.tsx
import * as React from "react";
import { logger } from "../../utils/logging";

type Props = { fallback?: React.ReactNode; children: React.ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: unknown, info: unknown) {
    logger.error("[ErrorBoundary]", err, info);
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? <div className="p-4 text-red-600">Something went wrong.</div>;
    return this.props.children;
  }
}
