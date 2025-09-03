import { useState } from 'react';
import { ModelViewer } from '@/components/ModelViewer';
import { FileUpload } from '@/components/FileUpload';
import { AnimationImporter } from '@/components/AnimationImporter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Github, Sparkles } from 'lucide-react';
import * as THREE from 'three';

interface ImportedAnimation {
  id: string;
  name: string;
  url: string;
  clip: THREE.AnimationClip;
}

const Index = () => {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [importedAnimations, setImportedAnimations] = useState<ImportedAnimation[]>([]);

  const handleFileSelect = (url: string) => {
    setModelUrl(url);
    setShowUpload(false);
  };

  const handleUpload = () => {
    setShowUpload(true);
  };

  const clearModel = () => {
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl);
    }
    setModelUrl(null);
    setShowUpload(false);
    setImportedAnimations([]); // Clear imported animations when clearing model
  };

  const handleAnimationImport = (animations: ImportedAnimation[]) => {
    setImportedAnimations(animations);
  };

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="border-b border-border/20 backdrop-blur-sm bg-background/80">
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
                  ارفع وشاهد مودلز ثلاثية الأبعاد مع الأنميشن
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-200px)]">
          {/* File Upload Panel */}
          <div className="lg:col-span-1">
            <div className="space-y-6 h-full">
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
                      <p className="text-foreground font-medium mb-2">المودل محمل بنجاح!</p>
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
                      <h3 className="font-medium text-foreground mb-2">الميزات المدعومة:</h3>
                      <ul className="space-y-1">
                        <li>• ملفات GLB و GLTF</li>
                        <li>• الأنميشن المتعددة</li>
                        <li>• التحكم التفاعلي</li>
                        <li>• إضافة أنميشن Mixamo</li>
                      </ul>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-secondary/20 border border-secondary/30">
                      <h3 className="font-medium text-foreground mb-2">نصائح للاستخدام:</h3>
                      <ul className="space-y-1">
                        <li>• اسحب لتدوير المودل</li>
                        <li>• اسكرول للتكبير/التصغير</li>
                        <li>• انقر على أسماء الأنميشن للتبديل</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Animation Importer - Only show when model is loaded */}
              {modelUrl && (
                <AnimationImporter 
                  onAnimationImport={handleAnimationImport}
                  importedAnimations={importedAnimations}
                />
              )}
            </div>
          </div>

          {/* 3D Viewer */}
          <div className="lg:col-span-3">
            <ModelViewer 
              modelUrl={modelUrl} 
              onUpload={handleUpload}
              importedAnimations={importedAnimations}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;