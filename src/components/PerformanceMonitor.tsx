import { useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Card } from '@/components/ui/card';
import { Activity, Zap } from 'lucide-react';

interface PerformanceStats {
  fps: number;
  frameTime: number;
  memoryUsage: number;
}

export const PerformanceMonitor = () => {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0
  });
  const [showMonitor, setShowMonitor] = useState(false);

  let lastTime = performance.now();
  let frameCount = 0;
  let lastFpsUpdate = performance.now();

  useFrame(() => {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    frameCount++;

    // Update FPS every second
    if (currentTime - lastFpsUpdate >= 1000) {
      const fps = Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate));
      
      setStats(prev => ({
        ...prev,
        fps,
        frameTime: deltaTime
      }));
      
      frameCount = 0;
      lastFpsUpdate = currentTime;
    }
  });

  useEffect(() => {
    // Monitor memory usage
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setStats(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024)
        }));
      }
    };

    const interval = setInterval(updateMemoryUsage, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto-show monitor if performance is poor
  useEffect(() => {
    if (stats.fps > 0 && stats.fps < 30) {
      setShowMonitor(true);
    }
  }, [stats.fps]);

  if (!showMonitor) {
    return (
      <button
        onClick={() => setShowMonitor(true)}
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/30 transition-all z-50"
      >
        <Activity className="w-5 h-5" />
      </button>
    );
  }

  const getFpsColor = (fps: number) => {
    if (fps >= 50) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="fixed bottom-4 right-4 p-3 bg-black/80 border-border/50 backdrop-blur-sm z-50 min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          مراقب الأداء
        </h4>
        <button
          onClick={() => setShowMonitor(false)}
          className="text-gray-400 hover:text-white text-xs"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-300">FPS:</span>
          <span className={getFpsColor(stats.fps)}>{stats.fps}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Frame Time:</span>
          <span className="text-white">{stats.frameTime.toFixed(1)}ms</span>
        </div>
        
        {stats.memoryUsage > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-300">Memory:</span>
            <span className="text-white">{stats.memoryUsage}MB</span>
          </div>
        )}
        
        {stats.fps < 30 && stats.fps > 0 && (
          <div className="mt-2 p-2 rounded bg-yellow-500/20 border border-yellow-500/30">
            <p className="text-yellow-200 text-xs">
              الأداء منخفض! جرب تقليل جودة الإضاءة أو حجم النموذج
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};