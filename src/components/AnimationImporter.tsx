import { useState, useCallback } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileUpload } from '@/components/FileUpload';
import { Plus, Trash2, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import * as THREE from 'three';

interface ImportedAnimation {
  id: string;
  name: string;
  url: string;
  clip: THREE.AnimationClip;
}

interface AnimationImporterProps {
  onAnimationImport: (animations: ImportedAnimation[]) => void;
  importedAnimations: ImportedAnimation[];
}

export const AnimationImporter = ({ onAnimationImport, importedAnimations }: AnimationImporterProps) => {
  const [showUpload, setShowUpload] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnimationFile = useCallback(async (url: string, fileType: 'gltf' | 'glb' | 'fbx') => {
    setIsLoading(true);
    
    try {
      let animations: THREE.AnimationClip[] = [];
      
      if (fileType === 'fbx') {
        const loader = new FBXLoader();
        
        await new Promise<void>((resolve, reject) => {
          loader.load(url, (fbx) => {
            if (fbx.animations && fbx.animations.length > 0) {
              animations = fbx.animations;
              resolve();
            } else {
              reject(new Error('لم يتم العثور على أنميشن في ملف FBX'));
            }
          }, undefined, reject);
        });
      } else {
        const loader = new GLTFLoader();
        
        await new Promise<void>((resolve, reject) => {
          loader.load(url, (gltf) => {
            if (gltf.animations && gltf.animations.length > 0) {
              animations = gltf.animations;
              resolve();
            } else {
              reject(new Error('لم يتم العثور على أنميشن في الملف'));
            }
          }, undefined, reject);
        });
      }
      
      if (animations.length > 0) {
        const newAnimations: ImportedAnimation[] = animations.map((clip, index) => ({
          id: `imported_${Date.now()}_${index}`,
          name: clip.name || `${fileType.toUpperCase()} Animation ${index + 1}`,
          url,
          clip: clip.clone() // Clone to avoid conflicts
        }));
        
        const updatedAnimations = [...importedAnimations, ...newAnimations];
        onAnimationImport(updatedAnimations);
        
        toast.success(`تم استيراد ${newAnimations.length} أنميشن من ${fileType.toUpperCase()}!`);
        setShowUpload(false);
      }
    } catch (error) {
      console.error('Error loading animation:', error);
      toast.error(error instanceof Error ? error.message : 'خطأ في تحميل الأنميشن');
    } finally {
      setIsLoading(false);
    }
  }, [importedAnimations, onAnimationImport]);

  const removeAnimation = useCallback((id: string) => {
    const animationToRemove = importedAnimations.find(anim => anim.id === id);
    if (animationToRemove) {
      URL.revokeObjectURL(animationToRemove.url);
    }
    
    const updated = importedAnimations.filter(anim => anim.id !== id);
    onAnimationImport(updated);
    toast.success('تم حذف الأنميشن');
  }, [importedAnimations, onAnimationImport]);

  const clearAllAnimations = useCallback(() => {
    importedAnimations.forEach(anim => {
      URL.revokeObjectURL(anim.url);
    });
    onAnimationImport([]);
    toast.success('تم حذف جميع الأنميشن المستوردة');
  }, [importedAnimations, onAnimationImport]);

  return (
    <Card className="gradient-card border-border shadow-card-custom">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            أنميشن خارجية
          </h3>
          <div className="flex gap-2">
            {importedAnimations.length > 0 && (
              <Button
                onClick={clearAllAnimations}
                variant="outline"
                size="sm"
                className="bg-destructive/10 border-destructive/20 text-destructive"
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                مسح الكل
              </Button>
            )}
            <Button
              onClick={() => setShowUpload(!showUpload)}
              variant="outline"
              size="sm"
              className="bg-primary/10 border-primary/20 text-primary"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              إضافة أنميشن
            </Button>
          </div>
        </div>

        {showUpload && (
          <div className="mb-4 p-4 rounded-lg bg-secondary/20 border border-secondary/30">
            <h4 className="font-medium text-foreground mb-2">رفع أنميشن خارجية</h4>
            <p className="text-sm text-muted-foreground mb-3">
              يمكن رفع ملفات أنميشن من Mixamo أو أي مصدر آخر (GLB, GLTF, FBX)
            </p>
            <FileUpload 
              onFileSelect={handleAnimationFile}
              className="bg-transparent border-dashed border-primary/30"
              multiple={true}
            />
            <div className="mt-3 p-3 rounded-lg bg-accent/20 border border-accent/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-accent-foreground mt-0.5 flex-shrink-0" />
                <div className="text-xs text-accent-foreground">
                  <p className="font-medium mb-1">نصائح مهمة:</p>
                  <ul className="space-y-1">
                    <li>• تأكد من توافق الأنميشن مع المودل الأساسي</li>
                    <li>• استخدم نفس الـ Rig في Mixamo</li>
                    <li>• ملفات FBX تحتاج معايرة إضافية</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {importedAnimations.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              الأنميشن المستوردة ({importedAnimations.length})
            </p>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {importedAnimations.map((animation) => (
                <div 
                  key={animation.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{animation.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {animation.url.includes('fbx') ? 'FBX Animation' : 'Mixamo Animation'}
                    </p>
                  </div>
                  <Button
                    onClick={() => removeAnimation(animation.id)}
                    variant="outline"
                    size="sm"
                    className="bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              لم يتم استيراد أي أنميشن خارجية بعد
            </p>
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-accent/20 border border-accent/30">
          <h4 className="font-medium text-foreground mb-1">الأنواع المدعومة:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• <strong>GLB/GLTF:</strong> من Mixamo أو أي مصدر</li>
            <li>• <strong>FBX:</strong> من Maya, Blender, 3ds Max</li>
            <li>• تأكد من تطابق الـ Skeleton مع المودل الأساسي</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};