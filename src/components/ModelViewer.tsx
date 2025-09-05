import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useAnimations, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useModelLoader } from '@/hooks/useModelLoader';
import { AnimationControls } from '@/components/AnimationControls';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface ImportedAnimation {
  id: string;
  name: string;
  url: string;
  clip: THREE.AnimationClip;
}

interface ModelProps {
  url: string;
  fileType: 'gltf' | 'glb' | 'fbx';
  onAnimationsFound: (animations: string[]) => void;
  activeAnimation: string | null;
  isPlaying: boolean;
  importedAnimations: ImportedAnimation[];
  showSkeleton: boolean;
  animationProgress: number;
  onAnimationProgress: (progress: number, duration: number) => void;
  onSeekAnimation: (time: number) => void;
  onModelSceneReady?: (scene: THREE.Object3D, animations: THREE.AnimationClip[]) => void;
}

function Model({ url, fileType, onAnimationsFound, activeAnimation, isPlaying, importedAnimations, showSkeleton, animationProgress, onAnimationProgress, onSeekAnimation, onModelSceneReady }: ModelProps) {
  const group = useRef<THREE.Group>(null);
  const { modelData, isLoading, error } = useModelLoader(url, fileType);
  const [hasNotified, setHasNotified] = useState(false);
  
  useEffect(() => {
    if (error) {
      console.error('Error loading model:', error);
      toast.error('خطأ في تحميل المودل');
    }
  }, [error]);
  
  // Combine animations with imported ones
  const allAnimationClips = useMemo(() => {
    if (!modelData) return [];
    
    const clips = [...modelData.animations];
    importedAnimations.forEach(imported => {
      const clonedClip = imported.clip.clone();
      clonedClip.name = imported.name;
      clips.push(clonedClip);
    });
    
    return clips;
  }, [modelData?.animations, importedAnimations]);
  
  const { actions, mixer } = useAnimations(allAnimationClips, group);
  
  // Notify about animations found (only once)
  useEffect(() => {
    if (!modelData || hasNotified) return;
    
    const totalAnimations = allAnimationClips.length;
    if (totalAnimations > 0) {
      const animNames = allAnimationClips.map(anim => anim.name);
      onAnimationsFound(animNames);
      
      if (onModelSceneReady) {
        onModelSceneReady(modelData.scene, allAnimationClips);
      }
      
      const originalCount = modelData.animations.length;
      const importedCount = importedAnimations.length;
      
      if (importedCount > 0) {
        toast.success(`المودل: ${originalCount} أنميشن، Mixamo: ${importedCount} أنميشن`);
      } else if (originalCount > 0) {
        toast.success(`تم العثور على ${originalCount} انميشن!`);
      }
      
      setHasNotified(true);
    }
  }, [modelData, allAnimationClips, onAnimationsFound, onModelSceneReady, importedAnimations.length, hasNotified]);

  // Handle animation playback
  useEffect(() => {
    if (activeAnimation && actions[activeAnimation]) {
      Object.values(actions).forEach(action => action?.stop());
      
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

  // Animation seeking
  useEffect(() => {
    if (activeAnimation && actions[activeAnimation] && mixer) {
      const action = actions[activeAnimation];
      if (action) {
        action.time = animationProgress;
        mixer.update(0); // Update mixer without advancing time
      }
    }
  }, [animationProgress, activeAnimation, actions, mixer]);

  // Optimized animation update with progress tracking
  useFrame((state, delta) => {
    if (mixer && !isLoading) {
      if (isPlaying) {
        mixer.update(delta);
      }
      
      // Track animation progress
      if (activeAnimation && actions[activeAnimation]) {
        const action = actions[activeAnimation];
        if (action && action.getClip()) {
          const duration = action.getClip().duration;
          const currentTime = action.time;
          onAnimationProgress(currentTime, duration);
        }
      }
    }
  });

  if (isLoading || !modelData) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#666" wireframe />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={group}>
      <primitive object={modelData.scene} />
      {showSkeleton && modelData.scene && (
        <skeletonHelper args={[modelData.scene]} />
      )}
    </group>
  );
}

interface ModelViewerProps {
  modelUrl: string | null;
  fileType: 'gltf' | 'glb' | 'fbx' | null;
  onUpload: () => void;
  importedAnimations: ImportedAnimation[];
  onModelSceneReady?: (scene: THREE.Object3D, animations: THREE.AnimationClip[]) => void;
}

export const ModelViewer = ({ modelUrl, fileType, onUpload, importedAnimations, onModelSceneReady }: ModelViewerProps) => {
  const [animations, setAnimations] = useState<string[]>([]);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [animationDuration, setAnimationDuration] = useState(0);
  const [renamedAnimations, setRenamedAnimations] = useState<Record<string, string>>({});

  // Reset animations when model changes
  useEffect(() => {
    if (!modelUrl) {
      setAnimations([]);
      setActiveAnimation(null);
      setIsPlaying(false);
    }
  }, [modelUrl]);

  const handleAnimationsFound = useCallback((animNames: string[]) => {
    setAnimations(animNames);
    if (animNames.length > 0 && !activeAnimation) {
      setActiveAnimation(animNames[0]);
      setIsPlaying(true);
    }
  }, [activeAnimation]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const resetAnimation = useCallback(() => {
    setAnimationProgress(0);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  const onAnimationProgress = useCallback((progress: number, duration: number) => {
    setAnimationProgress(progress);
    setAnimationDuration(duration);
  }, []);

  const onSeekAnimation = useCallback((time: number) => {
    setAnimationProgress(time);
  }, []);

  const onRenameAnimation = useCallback((oldName: string, newName: string) => {
    setRenamedAnimations(prev => ({
      ...prev,
      [oldName]: newName
    }));
  }, []);

  const onToggleSkeleton = useCallback(() => {
    setShowSkeleton(prev => !prev);
  }, []);

  // Memoize camera settings for better performance
  const cameraSettings = useMemo(() => ({
    position: [5, 5, 5] as [number, number, number],
    fov: 50
  }), []);

  return (
    <div className="w-full h-full flex flex-col">
      {/* 3D Viewer - Square aspect ratio */}
      <div className="aspect-square relative bg-gradient-card rounded-xl shadow-card-custom border border-border overflow-hidden">
        {modelUrl && fileType ? (
          <>
            <Canvas
              shadows
              camera={cameraSettings}
              className="w-full h-full"
              gl={{ 
                antialias: true,
                alpha: true,
                powerPreference: "high-performance"
              }}
              performance={{ min: 0.5 }}
            >
              <ambientLight intensity={0.5} />
              <directionalLight
                position={[10, 10, 5]}
                intensity={1}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
              <Model
                url={modelUrl}
                fileType={fileType}
                onAnimationsFound={handleAnimationsFound}
                activeAnimation={activeAnimation}
                isPlaying={isPlaying}
                importedAnimations={importedAnimations}
                showSkeleton={showSkeleton}
                animationProgress={animationProgress}
                onAnimationProgress={onAnimationProgress}
                onSeekAnimation={onSeekAnimation}
                onModelSceneReady={onModelSceneReady}
              />
              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={2}
                maxDistance={20}
                enableDamping={true}
                dampingFactor={0.05}
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
                ادعم ملفات GLB و GLTF و FBX مع الأنميشن
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
        <div className="mt-4">
          <AnimationControls
            animations={animations}
            activeAnimation={activeAnimation}
            isPlaying={isPlaying}
            importedAnimations={importedAnimations}
            animationProgress={animationProgress}
            animationDuration={animationDuration}
            showSkeleton={showSkeleton}
            onTogglePlay={togglePlay}
            onResetAnimation={resetAnimation}
            onSelectAnimation={setActiveAnimation}
            onSeekAnimation={onSeekAnimation}
            onRenameAnimation={onRenameAnimation}
            onToggleSkeleton={onToggleSkeleton}
          />
        </div>
      )}
    </div>
  );
};