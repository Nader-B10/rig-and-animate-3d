import { useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileUpload } from '@/components/FileUpload';
import { Plus, Trash2, Upload } from 'lucide-react';
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

  const handleAnimationFile = async (url: string) => {
    setIsLoading(true);
    try {
      const loader = new GLTFLoader();
      
      // Load the animation file
      loader.load(url, (gltf) => {
        if (gltf.animations && gltf.animations.length > 0) {
          const newAnimations: ImportedAnimation[] = gltf.animations.map((clip, index) => ({
            id: `imported_${Date.now()}_${index}`,
            name: clip.name || `Mixamo Animation ${index + 1}`,
            url,
            clip
          }));
          
          const updatedAnimations = [...importedAnimations, ...newAnimations];
          onAnimationImport(updatedAnimations);
          
          toast.success(`تم استيراد ${newAnimations.length} أنميشن من Mixamo!`);
          setShowUpload(false);
        } else {
          toast.error('لم يتم العثور على أنميشن في الملف');
        }
        setIsLoading(false);
      }, undefined, (error) => {
        console.error('Error loading animation:', error);
        toast.error('خطأ في تحميل الأنميشن');
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Error loading animation:', error);
      toast.error('خطأ في تحميل الأنميشن');
      setIsLoading(false);
    }
  };

  const removeAnimation = (id: string) => {
    const updated = importedAnimations.filter(anim => anim.id !== id);
    onAnimationImport(updated);
    toast.success('تم حذف الأنميشن');
  };

  return (
    <Card className="gradient-card border-border shadow-card-custom">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            أنميشن Mixamo
          </h3>
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

        {showUpload && (
          <div className="mb-4 p-4 rounded-lg bg-secondary/20 border border-secondary/30">
            <h4 className="font-medium text-foreground mb-2">رفع أنميشن من Mixamo</h4>
            <p className="text-sm text-muted-foreground mb-3">
              يمكن رفع عدة ملفات أنميشن من Mixamo لدمجها مع المودل
            </p>
            <FileUpload 
              onFileSelect={handleAnimationFile}
              className="bg-transparent border-dashed border-primary/30"
              multiple={true}
            />
            <p className="text-xs text-muted-foreground mt-2">
              نصيحة: يمكن رفع عدة ملفات أنميشن واحدة تلو الأخرى أو مجموعة واحدة
            </p>
          </div>
        )}

        {importedAnimations.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              الأنميشن المستوردة ({importedAnimations.length})
            </p>
            {importedAnimations.map((animation) => (
              <div 
                key={animation.id}
                className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
              >
                <div>
                  <p className="font-medium text-foreground">{animation.name}</p>
                  <p className="text-xs text-muted-foreground">Mixamo Animation</p>
                </div>
                <Button
                  onClick={() => removeAnimation(animation.id)}
                  variant="outline"
                  size="sm"
                  className="bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              لم يتم استيراد أي أنميشن من Mixamo بعد
            </p>
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-accent/20 border border-accent/30">
          <h4 className="font-medium text-foreground mb-1">نصائح Mixamo:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• استخدم نفس الشخصية في Mixamo</li>
            <li>• صدّر بصيغة GLB مع الأنميشن</li>
            <li>• تأكد من إعدادات الـ Rig صحيحة</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};