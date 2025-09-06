import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('[ErrorBoundary] Error caught by boundary:', error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Error details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'Main Application Boundary'
    });
    
    // Log to external service if needed
    // logErrorToService(error, errorInfo);
  }

  private handleReset = () => {
    console.log('[ErrorBoundary] Resetting error boundary');
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-secondary flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center gradient-card border-border">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <h2 className="text-xl font-semibold text-foreground mb-2">
              حدث خطأ غير متوقع
            </h2>
            
            <p className="text-muted-foreground mb-4">
              عذراً، حدث خطأ في التطبيق. يرجى المحاولة مرة أخرى.
            </p>
            
            {this.state.error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive font-mono">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <Button 
              onClick={this.handleReset}
              className="gradient-primary text-white shadow-glow"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              إعادة المحاولة
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}