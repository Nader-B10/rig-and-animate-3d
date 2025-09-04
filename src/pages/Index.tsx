import { useState, useCallback, useEffect } from 'react';
import { ModelViewer } from '@/components/ModelViewer';
import { FileUpload } from '@/components/FileUpload';
import { AnimationImporter } from '@/components/AnimationImporter';
import { ModelExporter } from '@/components/ModelExporter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Github, Sparkles, Info } from 'lucide-react';
import { toast } from 'sonner';
import * as THREE from 'three';

interface ImportedAnimation {
  id: string;
  name: string;
  url: string;
  clip: THREE.AnimationClip;
}

const Index = () => {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'gltf' | 'glb' | 'fbx' | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [importedAnimations, setImportedAnimations] = useState<ImportedAnimation[]>([]);
  const [modelScene, setModelScene] = useState<THREE.Object3D | null>(null);
  const [allAnimations, setAllAnimations] = useState<THREE.AnimationClip[]>([]);

  // Clean up URLs when component unmounts
  useEffect(() => {
    return () => {
      if (modelUrl) {
        URL.revokeObjectURL(modelUrl);
      }
      importedAnimations.forEach(anim => {
        URL.revokeObjectURL(anim.url);
      });
    };
  }, []);

  const handleFileSelect = useCallback((url: string, type: 'gltf' | 'glb' | 'fbx') => {
    // Clean up previous model URL
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl);
    }
    
    setModelUrl(url);
    setFileType(type);
    setShowUpload(false);
    
    // Clear previous data
    setImportedAnimations([]);
    setModelScene(null);
    setAllAnimations([]);
    
    toast.success(`تم رفع ملف ${type.toUpperCase()} بنجاح!`);
  }, [modelUrl]);

  const handleUpload = useCallback(() => {
    setShowUpload(true);
  }, []);

  const clearModel = useCallback(() => {
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl);
    }
    
    // Clean up imported animations
    importedAnimations.forEach(anim => {
      URL.revokeObjectURL(anim.url);
    });
    
    setModelUrl(null);
    setFileType(null);
    setShowUpload(false);
    setImportedAnimations([]);
    setModelScene(null);
    setAllAnimations([]);
    
    toast.success('تم مسح المودل والأنميشن');
  }, [modelUrl, importedAnimations]);

  const handleAnimationImport = useCallback((animations: ImportedAnimation[]) => {
    setImportedAnimations(animations);
  }, []);

  const handleModelSceneReady = useCallback((scene: THREE.Object3D, animations: THREE.AnimationClip[]) => {
    setModelScene(scene);
    setAllAnimations(animations);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="border-b border-border/20 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center animate-pulse-glow">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-hero bg-clip-text text-transparent">
                  عارض المودلز ثلاثي الأبعاد
                </h1>
                <p className="text-sm text-muted-foreground">
                  ارفع وشاهد مودلز ثلاثية الأبعاد مع الأنميشن - دعم GLB, GLTF, FBX
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {modelUrl && (
                <Button 
                  onClick={clearModel}
                  variant="outline"
                  size="sm"
                  className="bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20"
                >
                  مسح المودل
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                onClick={() => window.open('https://github.com', '_blank')}
              >
                <Github className="w-4 h-4 mr-2" />
                المصدر
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column - Controls */}
          <div className="space-y-8 order-2 lg:order-1 lg:max-h-screen lg:overflow-y-auto">
            <Card className="gradient-card border-border shadow-card-custom">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5 text-primary" />
                  رفع المودل
                </h2>
                
                {showUpload || !modelUrl ? (
                  <FileUpload 
                    onFileSelect={handleFileSelect} 
                    className="mb-4 bg-transparent border-dashed border-primary/30"
                  />
                ) : (
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full gradient-hero flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-foreground font-medium mb-1">المودل محمل بنجاح!</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      نوع الملف: {fileType?.toUpperCase()}
                    </p>
                    <Button 
                      onClick={() => setShowUpload(true)}
                      variant="outline"
                      size="sm"
                      className="bg-primary/10 border-primary/20 text-primary"
                    >
                      رفع مودل جديد
                    </Button>
                  </div>
                )}
                
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      الميزات المدعومة:
                    </h3>
                    <ul className="space-y-1">
                      <li>• ملفات GLB و GLTF و FBX</li>
                      <li>• الأنميشن المتعددة</li>
                      <li>• التحكم التفاعلي المحسن</li>
                      <li>• إضافة أنميشن خارجية</li>
                      <li>• تصدير مع الأنميشن المدمجة</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-secondary/20 border border-secondary/30">
                    <h3 className="font-medium text-foreground mb-2">نصائح للاستخدام:</h3>
                    <ul className="space-y-1">
                      <li>• اسحب لتدوير المودل</li>
                      <li>• اسكرول للتكبير/التصغير</li>
                      <li>• انقر على أسماء الأنميشن للتبديل</li>
                      <li>• استخدم Ctrl+اسحب للتحريك</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            {/* Animation Importer - Only show when model is loaded */}
            {modelUrl && (
              <div className="space-y-4">
                <AnimationImporter 
                  onAnimationImport={handleAnimationImport}
                  importedAnimations={importedAnimations}
                />
                
                {/* Model Exporter - Show when model is loaded */}
                <ModelExporter 
                  modelUrl={modelUrl}
                  importedAnimations={importedAnimations}
                  modelScene={modelScene}
                  allAnimations={allAnimations}
                />
              </div>
            )}
          </div>

          {/* Right Column - 3D Viewer */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-8">
            <ModelViewer 
              modelUrl={modelUrl}
              fileType={fileType}
              onUpload={handleUpload}
              importedAnimations={importedAnimations}
              onModelSceneReady={handleModelSceneReady}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;