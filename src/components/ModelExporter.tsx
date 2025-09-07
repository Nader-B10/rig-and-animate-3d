import { useCallback, useState } from 'react';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Package, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as THREE from 'three';
import { ExportValidator } from '@/utils/exportValidator';
import { SceneProcessor } from '@/utils/sceneProcessor';
import { ModelOptimizer } from '@/utils/modelOptimizer';

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
      // Validate scene and animations before export
      const validation = ExportValidator.validateForExport(modelScene, allAnimations);
      
      if (!validation.isValid) {
        console.error('Export validation failed:', validation.issues);
        toast.error(`فشل التحقق من المودل: ${validation.issues.join(', ')}`);
        return;
      }
      
      if (validation.warnings.length > 0) {
        console.warn('Export warnings:', validation.warnings);
        toast.warning(`تحذيرات: ${validation.warnings.slice(0, 2).join(', ')}`);
      }
      
      // Validate scene hierarchy
      const hierarchyValidation = SceneProcessor.validateSceneHierarchy(modelScene);
      if (!hierarchyValidation.isValid) {
        console.error('Scene hierarchy issues:', hierarchyValidation.issues);
        toast.error('مشاكل في بنية المودل');
        return;
      }
      
      // Create a properly processed scene for export
      console.log('Processing scene for export...');
      const exportScene = SceneProcessor.createExportScene(modelScene);
      
      // Process animations for export
      console.log('Processing animations for export...');
      const exportAnimations = SceneProcessor.processAnimationsForExport(allAnimations);
      
      // Optimize the scene before export
      console.log('Optimizing scene...');
      ModelOptimizer.optimizeScene(exportScene);
      
      // Optimize animations
      const optimizedAnimations = ModelOptimizer.optimizeAnimations(exportAnimations);
      
      console.log(`Exporting ${optimizedAnimations.length} animations with ${exportScene.children.length} scene objects`);
      
      const exporter = new GLTFExporter();
      
      const options = {
        binary: format === 'glb',
        animations: optimizedAnimations,
        includeCustomExtensions: false, // Changed to false for better compatibility
        truncateDrawRange: true,
        embedImages: true,
        maxTextureSize: 1024, // Reduced for better compatibility
        onlyVisible: false,
        forceIndices: true, // Changed to true for better compatibility
        forcePowerOfTwoTextures: true // Changed to true for better compatibility
      };

      const result = await new Promise<ArrayBuffer | any>((resolve, reject) => {
        try {
          exporter.parse(
            exportScene,
            (gltf) => {
              console.log('Export successful');
              resolve(gltf);
            },
            (error) => {
              console.error('Export error:', error);
              reject(error);
            },
            options
          );
        } catch (error) {
          console.error('Exporter parse error:', error);
          reject(error);
        }
      });

      let blob: Blob;
      let filename: string;
      
      if (format === 'glb') {
        if (!(result instanceof ArrayBuffer)) {
          throw new Error('GLB export should return ArrayBuffer');
        }
        blob = new Blob([result], { type: 'model/gltf-binary' });
        filename = `model_${Date.now()}.glb`;
      } else {
        if (typeof result !== 'object') {
          throw new Error('GLTF export should return object');
        }
        const jsonString = JSON.stringify(result, null, 2);
        blob = new Blob([jsonString], { type: 'model/gltf+json' });
        filename = `model_${Date.now()}.gltf`;
      }
      
      // Validate blob before download
      if (blob.size === 0) {
        throw new Error('العملية نتجت عنها ملف فارغ');
      }
      
      console.log(`Export blob created: ${blob.size} bytes, type: ${blob.type}`);
      
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
      
      const animationCount = optimizedAnimations.length;
      const importedCount = importedAnimations.length;
      const originalCount = Math.max(0, animationCount - importedCount);
      const fileSize = (blob.size / (1024 * 1024)).toFixed(2);
      
      toast.success(`تم تصدير المودل بنجاح! (${originalCount} أصلية + ${importedCount} مستوردة، ${fileSize}MB)`);
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast.error(`خطأ في تصدير المودل: ${errorMessage}`);
      
      // Log additional debug info
      console.error('Export debug info:', {
        hasModelScene: !!modelScene,
        hasAnimations: !!allAnimations,
        animationCount: allAnimations?.length || 0,
        sceneChildren: modelScene?.children?.length || 0
      });
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
          {/* Validation Status */}
          {modelScene && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">جاهز للتصدير</p>
              </div>
              <p className="text-xs text-green-600 dark:text-green-300">تم التحقق من صحة المودل والأنميشن</p>
            </div>
          )}
          
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-foreground mb-2">معلومات المودل:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• إجمالي الأنميشن: <span className="font-semibold text-primary">{totalAnimations}</span></li>
              <li>• أنميشن أصلية: <span className="font-semibold text-secondary-foreground">{originalCount}</span></li>
              <li>• أنميشن مستوردة: <span className="font-semibold text-accent-foreground">{importedCount}</span></li>
              <li>• سيتم تحسين وتنظيف البيانات قبل التصدير</li>
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
            <p>GLB: ملف واحد مضغوط محسّن | GLTF: ملف JSON منظم</p>
            <p className="text-accent-foreground mt-1">تم تحسين الملفات للتوافق الأمثل مع جميع التطبيقات</p>
            {isExporting && (
              <div className="text-primary mt-2">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>جاري معالجة وتصدير الملف...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};