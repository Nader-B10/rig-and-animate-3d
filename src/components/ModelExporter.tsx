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
      
      // Optimize the scene before export
      sceneClone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Optimize geometry
          if (child.geometry) {
            child.geometry.computeBoundingBox();
            child.geometry.computeBoundingSphere();
          }
        }
      });
      
      const options = {
        binary: format === 'glb',
        animations: allAnimations,
        includeCustomExtensions: true,
        truncateDrawRange: true,
        embedImages: true,
        maxTextureSize: 1024, // Optimize texture size
      };

      await new Promise<void>((resolve, reject) => {
        exporter.parse(
          sceneClone,
          (result) => {
            try {
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
              
              const animationCount = allAnimations.length;
              const importedCount = importedAnimations.length;
              const fileSize = (blob.size / (1024 * 1024)).toFixed(2);
              
              toast.success(`تم تصدير المودل بنجاح! (${animationCount} أنميشن، ${fileSize}MB)`);
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          (progress) => {
            // Optional: Handle progress
            console.log('Export progress:', progress);
          },
          (error) => {
            reject(error);
          },
          options
        );
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('خطأ في تصدير المودل');
    } finally {
      setIsExporting(false);
    }
  }, [modelScene, modelUrl, allAnimations, importedAnimations]);

  if (!modelUrl) {
    return null;
  }

  const originalCount = allAnimations.length - importedAnimations.length;

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
              <li>• إجمالي الأنميشن: {allAnimations.length}</li>
              <li>• أنميشن أصلية: {originalCount}</li>
              <li>• أنميشن مستوردة: {importedAnimations.length}</li>
              <li>• سيتم تصدير جميع الأنميشن مدمجة</li>
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
            {isExporting && <p className="text-primary mt-1">جاري التصدير...</p>}
          </div>
        </div>
      </div>
    </Card>
  );
};