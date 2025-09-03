import { useRef } from 'react';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Package } from 'lucide-react';
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
  
  const exportModel = async (format: 'glb' | 'gltf') => {
    if (!modelScene || !modelUrl) {
      toast.error('لا يوجد مودل للتصدير');
      return;
    }

    try {
      const exporter = new GLTFExporter();
      
      // Clone the scene to avoid modifying the original
      const sceneClone = modelScene.clone();
      
      // Export options
      const options = {
        binary: format === 'glb',
        animations: allAnimations, // Include all animations (original + imported)
        includeCustomExtensions: true,
      };

      exporter.parse(
        sceneClone,
        (result) => {
          // Create downloadable file
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
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          const animationCount = allAnimations.length;
          const importedCount = importedAnimations.length;
          toast.success(`تم تصدير المودل بنجاح! (${animationCount} أنميشن، منها ${importedCount} من Mixamo)`);
        },
        (error) => {
          console.error('Export error:', error);
          toast.error('خطأ في تصدير المودل');
        },
        options
      );
    } catch (error) {
      console.error('Export error:', error);
      toast.error('خطأ في تصدير المودل');
    }
  };

  if (!modelUrl) {
    return null;
  }

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
              <li>• أنميشن Mixamo: {importedAnimations.length}</li>
              <li>• سيتم تصدير جميع الأنميشن مدمجة</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => exportModel('glb')}
              className="gradient-primary text-white shadow-glow"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              تصدير GLB
            </Button>
            
            <Button
              onClick={() => exportModel('gltf')}
              variant="outline"
              className="bg-secondary/10 border-secondary/20 text-secondary-foreground hover:bg-secondary/20"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              تصدير GLTF
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center mt-3">
            <p>GLB: ملف واحد مضغوط | GLTF: ملف JSON مع الموارد</p>
          </div>
        </div>
      </div>
    </Card>
  );
};