import React, { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipBack, 
  SkipForward,
  Settings,
  Edit3,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

interface ImportedAnimation {
  id: string;
  name: string;
  url: string;
  clip: THREE.AnimationClip;
}

interface AnimationControlsProps {
  animations: string[];
  activeAnimation: string | null;
  isPlaying: boolean;
  importedAnimations: ImportedAnimation[];
  animationProgress: number;
  animationDuration: number;
  showSkeleton: boolean;
  onTogglePlay: () => void;
  onResetAnimation: () => void;
  onSelectAnimation: (animName: string) => void;
  onSeekAnimation: (time: number) => void;
  onRenameAnimation: (oldName: string, newName: string) => void;
  onToggleSkeleton: () => void;
}

export const AnimationControls = ({
  animations,
  activeAnimation,
  isPlaying,
  importedAnimations,
  animationProgress,
  animationDuration,
  showSkeleton,
  onTogglePlay,
  onResetAnimation,
  onSelectAnimation,
  onSeekAnimation,
  onRenameAnimation,
  onToggleSkeleton
}: AnimationControlsProps) => {
  const [renameDialog, setRenameDialog] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRename = useCallback(() => {
    if (renameDialog && newName.trim()) {
      onRenameAnimation(renameDialog, newName.trim());
      setRenameDialog(null);
      setNewName('');
      toast.success('تم تغيير اسم الأنميشن');
    }
  }, [renameDialog, newName, onRenameAnimation]);

  const openRenameDialog = (animName: string) => {
    setRenameDialog(animName);
    setNewName(animName);
  };

  if (animations.length === 0) {
    return null;
  }

  return (
    <Card className="gradient-card border-border shadow-card-custom">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              التحكم بالأنميشن ({animations.length})
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeAnimation ? `الحالي: ${activeAnimation}` : 'لم يتم اختيار أنميشن'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={onToggleSkeleton}
              variant="outline"
              size="sm"
              className={showSkeleton ? 
                "bg-accent/20 border-accent/30 text-accent-foreground" :
                "bg-secondary/10 border-secondary/20 text-secondary-foreground"
              }
            >
              {showSkeleton ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="mr-2">الهيكل</span>
            </Button>
          </div>
        </div>

        {/* Animation Timeline */}
        {activeAnimation && animationDuration > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm text-muted-foreground">
                الوقت: {formatTime(animationProgress)} / {formatTime(animationDuration)}
              </Label>
              <Label className="text-sm text-muted-foreground">
                التقدم: {Math.round((animationProgress / animationDuration) * 100)}%
              </Label>
            </div>
            
            <Slider
              value={[animationProgress]}
              max={animationDuration}
              step={0.01}
              onValueChange={([value]) => onSeekAnimation(value)}
              className="w-full"
            />
          </div>
        )}

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Button
            onClick={onResetAnimation}
            variant="outline"
            size="sm"
            className="bg-secondary/10 border-secondary/20 text-secondary-foreground"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={onTogglePlay}
            variant="outline"
            size="sm"
            className="bg-primary/10 border-primary/20 text-primary px-6"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
          
          <Button
            onClick={() => onSeekAnimation(animationDuration)}
            variant="outline"
            size="sm"
            className="bg-secondary/10 border-secondary/20 text-secondary-foreground"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Animation List */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">قائمة الأنميشن:</Label>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
            {animations.map((animName) => {
              const isImported = importedAnimations.some(imported => imported.name === animName);
              const isActive = activeAnimation === animName;
              
              return (
                <div
                  key={animName}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                    isActive ? 
                      'bg-primary/10 border-primary/20 shadow-lg' : 
                      'bg-secondary/5 border-secondary/10 hover:bg-secondary/10'
                  }`}
                >
                  <Button
                    onClick={() => onSelectAnimation(animName)}
                    variant="ghost"
                    size="sm"
                    className={`flex-1 justify-start ${
                      isActive ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-primary animate-pulse' : 'bg-muted-foreground'
                      }`} />
                      <span className="truncate">{animName}</span>
                      {isImported && (
                        <span className="text-xs bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">
                          Mixamo
                        </span>
                      )}
                    </div>
                  </Button>
                  
                  <Dialog open={renameDialog === animName} onOpenChange={(open) => !open && setRenameDialog(null)}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => openRenameDialog(animName)}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>تغيير اسم الأنميشن</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="newName">الاسم الجديد</Label>
                          <Input
                            id="newName"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="أدخل الاسم الجديد"
                            className="mt-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setRenameDialog(null)}
                          >
                            إلغاء
                          </Button>
                          <Button
                            onClick={handleRename}
                            disabled={!newName.trim()}
                          >
                            حفظ
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              );
            })}
          </div>
        </div>

        {activeAnimation && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-primary font-medium">
              🎬 {activeAnimation} {isPlaying ? '(قيد التشغيل)' : '(متوقف)'}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};