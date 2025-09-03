import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Upload } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface ModelProps {
  url: string;
  onAnimationsFound: (animations: string[]) => void;
  activeAnimation: string | null;
  isPlaying: boolean;
}

function Model({ url, onAnimationsFound, activeAnimation, isPlaying }: ModelProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions, mixer } = useAnimations(animations, group);
  
  useEffect(() => {
    if (animations.length > 0) {
      const animNames = animations.map(anim => anim.name);
      onAnimationsFound(animNames);
      toast.success(`تم العثور على ${animNames.length} انميشن!`);
    }
  }, [animations, onAnimationsFound]);

  useEffect(() => {
    if (activeAnimation && actions[activeAnimation]) {
      // Stop all animations
      Object.values(actions).forEach(action => action?.stop());
      
      // Play selected animation
      const action = actions[activeAnimation];
      if (action) {
        action.reset().play();
        action.paused = !isPlaying;
      }
    }
  }, [activeAnimation, actions, isPlaying]);

  useEffect(() => {
    if (activeAnimation && actions[activeAnimation]) {
      const action = actions[activeAnimation];
      if (action) {
        action.paused = !isPlaying;
      }
    }
  }, [isPlaying, activeAnimation, actions]);

  useFrame((state, delta) => {
    if (mixer) mixer.update(delta);
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

interface ModelViewerProps {
  modelUrl: string | null;
  onUpload: () => void;
}

export const ModelViewer = ({ modelUrl, onUpload }: ModelViewerProps) => {
  const [animations, setAnimations] = useState<string[]>([]);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleAnimationsFound = (animNames: string[]) => {
    setAnimations(animNames);
    if (animNames.length > 0) {
      setActiveAnimation(animNames[0]);
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const resetAnimation = () => {
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 100);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* 3D Viewer */}
      <div className="flex-1 relative bg-gradient-card rounded-xl shadow-card-custom border border-border overflow-hidden">
        {modelUrl ? (
          <>
            <Canvas
              shadows
              camera={{ position: [5, 5, 5], fov: 50 }}
              className="w-full h-full"
            >
              <ambientLight intensity={0.5} />
              <directionalLight
                position={[10, 10, 5]}
                intensity={1}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
              />
              <Model
                url={modelUrl}
                onAnimationsFound={handleAnimationsFound}
                activeAnimation={activeAnimation}
                isPlaying={isPlaying}
              />
              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={2}
                maxDistance={20}
              />
              <Environment preset="studio" />
              <ContactShadows
                position={[0, -1, 0]}
                opacity={0.4}
                scale={10}
                blur={2}
                far={4}
              />
            </Canvas>
            
            {/* Loading overlay */}
            <div className="absolute top-4 left-4 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-white text-sm">العارض ثلاثي الأبعاد</p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full gradient-hero flex items-center justify-center animate-float">
                <Upload className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                ارفع مودل ثلاثي الأبعاد
              </h3>
              <p className="text-muted-foreground mb-4">
                ادعم ملفات GLB و GLTF مع الأنميشن
              </p>
              <Button onClick={onUpload} className="gradient-primary text-white shadow-glow">
                <Upload className="w-4 h-4 mr-2" />
                اختر ملف
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Animation Controls */}
      {modelUrl && animations.length > 0 && (
        <Card className="mt-4 p-4 gradient-card border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              التحكم بالأنميشن
            </h3>
            <div className="flex gap-2">
              <Button
                onClick={togglePlay}
                variant="outline"
                size="sm"
                className="bg-primary/10 border-primary/20 text-primary"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                onClick={resetAnimation}
                variant="outline"
                size="sm"
                className="bg-primary/10 border-primary/20 text-primary"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {animations.map((animName) => (
              <Button
                key={animName}
                onClick={() => setActiveAnimation(animName)}
                variant={activeAnimation === animName ? "default" : "outline"}
                size="sm"
                className={activeAnimation === animName ? 
                  "gradient-primary text-white shadow-glow" : 
                  "bg-secondary/50 border-secondary text-secondary-foreground hover:bg-secondary"
                }
              >
                {animName}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};