import { useCallback, useState } from 'react';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as THREE from 'three';

interface ImportedAnimation {
  id: string;
  name: string;
  url: string;
  clip: THREE.AnimationClip;
  sourceRoot?: THREE.Object3D | null;
}

interface ModelExporterProps {
  modelUrl: string | null;
  importedAnimations: ImportedAnimation[];
  modelScene: THREE.Object3D | null;
  allAnimations: THREE.AnimationClip[];
}

export const ModelExporter = ({ 
  modelUrl, 
  importedAnimations, 
  modelScene, 
  allAnimations 
}: ModelExporterProps) => {
  const [isExporting, setIsExporting] = useState(false);
  
  const exportModel = useCallback(async (format: 'glb' | 'gltf') => {
    if (!modelScene || !modelUrl) {
      toast.error('لا يوجد مودل للتصدير');
      return;
    }

    setIsExporting(true);
    
    try {
      const exporter = new GLTFExporter();
      
      // Clone the scene to avoid modifying the original
      const sceneClone = modelScene.clone();
      
      // Prepare all animations with proper naming and ensure they're properly formatted
      const exportAnimations = allAnimations.map((clip, index) => {
        const clonedClip = clip.clone();
        // Ensure animation has a valid name
        if (!clonedClip.name || clonedClip.name === '') {
          clonedClip.name = `Animation_${index + 1}`;
        }
        // Validate animation tracks
        clonedClip.tracks = clonedClip.tracks.filter(track => 
          track && track.name && track.times && track.values
        );
        return clonedClip;
      });
      
      const options = {
        binary: format === 'glb',
        animations: exportAnimations,
        includeCustomExtensions: true,
        truncateDrawRange: true,
        embedImages: true,
        maxTextureSize: 2048,
        onlyVisible: false,
        forceIndices: false,
        forcePowerOfTwoTextures: false
      };

      const result = await new Promise<ArrayBuffer | any>((resolve, reject) => {
        exporter.parse(
          sceneClone,
          resolve,
          reject,
          options
        );
      });

      let blob: Blob;
      let filename: string;
      
      if (format === 'glb') {
        blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
        filename = `merged_model_${Date.now()}.glb`;
      } else {
        const jsonString = JSON.stringify(result, null, 2);
        blob = new Blob([jsonString], { type: 'application/json' });
        filename = `merged_model_${Date.now()}.gltf`;
      }
      
      // Download file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      const animationCount = exportAnimations.length;
      const importedCount = importedAnimations.length;
      const originalCount = animationCount - importedCount;
      const fileSize = (blob.size / (1024 * 1024)).toFixed(2);
      
      toast.success(`تم تصدير المودل بنجاح! (${originalCount} أصلية + ${importedCount} مستوردة، ${fileSize}MB)`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('خطأ في تصدير المودل: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'));
    } finally {
      setIsExporting(false);
    }
  }, [modelScene, modelUrl, allAnimations, importedAnimations]);

  if (!modelUrl) {
    return null;
  }

  // Calculate correct counts for display
  const totalAnimations = allAnimations.length;
  const importedCount = importedAnimations.length;
  const originalCount = Math.max(0, totalAnimations - importedCount);
  const hasImportedAnimations = importedCount > 0;

  return (
    <Card className="gradient-card border-border shadow-card-custom">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg gradient-hero flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              تصدير المودل
            </h3>
            <p className="text-sm text-muted-foreground">
              احفظ المودل مع جميع الأنميشن المدمجة
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-foreground mb-2">معلومات المودل:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• إجمالي الأنميشن: <span className="font-semibold text-primary">{totalAnimations}</span></li>
              <li>• أنميشن أصلية: <span className="font-semibold text-secondary-foreground">{originalCount}</span></li>
              <li>• أنميشن مستوردة: <span className="font-semibold text-accent-foreground">{importedCount}</span></li>
              <li>• سيتم تصدير جميع الأنميشن مدمجة مع الأسماء المحدثة</li>
              {hasImportedAnimations && <li>• تم دمج أنميشن Mixamo مع السكيلتون الأصلي</li>}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => exportModel('glb')}
              className="gradient-primary text-white shadow-glow"
              size="sm"
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              تصدير GLB
            </Button>
            
            <Button
              onClick={() => exportModel('gltf')}
              variant="outline"
              className="bg-secondary/10 border-secondary/20 text-secondary-foreground hover:bg-secondary/20"
              size="sm"
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              تصدير GLTF
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center mt-3">
            <p>GLB: ملف واحد مضغوط | GLTF: ملف JSON مع الموارد</p>
            <p className="text-accent-foreground mt-1">يحتوي على retargeted animations للسكيلتون الأصلي</p>
            {isExporting && <p className="text-primary mt-1">جاري التصدير...</p>}
          </div>
        </div>
      </div>
    </Card>
  );
};