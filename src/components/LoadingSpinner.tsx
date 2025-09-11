import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export const LoadingSpinner = ({ message = 'جاري التحميل...', className = '' }: LoadingSpinnerProps) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="w-16 h-16 rounded-full gradient-hero flex items-center justify-center mb-4 animate-pulse-glow">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
      <p className="text-foreground font-medium mb-1">{message}</p>
      <p className="text-xs text-muted-foreground">يرجى الانتظار...</p>
    </div>
  );
};