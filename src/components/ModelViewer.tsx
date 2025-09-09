import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useAnimations, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useModelLoader } from '@/hooks/useModelLoader';
import { useAnimationRegistry } from '@/hooks/useAnimationRegistry';
import { useSkeletonHelper } from '@/hooks/useSkeletonHelper';
import { AnimationControls } from '@/components/AnimationControls';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface ImportedAnimation {
  id: string;
  name: string;
  url: string;
  clip: THREE.AnimationClip;
  sourceRoot?: THREE.Object3D | null;
}

interface ModelProps {
  url: string;
  fileType: 'fbx';
  onAnimationsFound: (animations: string[]) => void;
  activeAnimation: string | null;
  isPlaying: boolean;
  importedAnimations: ImportedAnimation[];
  showSkeleton: boolean;
  animationProgress: number;
  onAnimationProgress: (progress: number, duration: number) => void;
  onSeekAnimation: (time: number) => void;
  onModelSceneReady?: (scene: THREE.Object3D, animations: THREE.AnimationClip[]) => void;
  animationRegistry: any;
}

function Model({ url, fileType, onAnimationsFound, activeAnimation, isPlaying, importedAnimations, showSkeleton, animationProgress, onAnimationProgress, onSeekAnimation, onModelSceneReady, animationRegistry }: ModelProps) {
  const group = useRef<THREE.Group>(null);
  const { modelData, isLoading, error } = useModelLoader(url, fileType);
  const [hasNotified, setHasNotified] = useState(false);
  const [targetSkeleton, setTargetSkeleton] = useState<THREE.Skeleton | null>(null);
  
  useEffect(() => {
    if (error) {
      console.error('Error loading model:', error);
      toast.error('خطأ في تحميل المودل');
    }
  }, [error]);

  // Extract skeleton from loaded model
  useEffect(() => {
    if (!modelData) {
      setTargetSkeleton(null);
      return;
    }

    let skeleton: THREE.Skeleton | null = null;
    modelData.scene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && child.skeleton && !skeleton) {
        skeleton = child.skeleton;
      }
    });
    
    setTargetSkeleton(skeleton);
  }, [modelData]);

  // Initialize animations when model loads
  useEffect(() => {
    if (!modelData) return;
    
    // Add original animations to registry
    animationRegistry.addOriginalAnimations(modelData.animations);
  }, [modelData, animationRegistry]);

  // Add imported animations when they change
  useEffect(() => {
    animationRegistry.addImportedAnimations(importedAnimations);
  }, [importedAnimations, targetSkeleton, animationRegistry]);

  // Get all clips from registry
  const allAnimationClips = animationRegistry.getAllClips();
  const { actions, mixer } = useAnimations(allAnimationClips, group);
  
  // Notify about animations found (only once per model change)
  useEffect(() => {
    if (!modelData || hasNotified) return;
    
    const animationNames = animationRegistry.getAnimationNames();
    if (animationNames.length > 0) {
      onAnimationsFound(animationNames);
      
      if (onModelSceneReady) {
        onModelSceneReady(modelData.scene, allAnimationClips);
      }
      
      const originalCount = modelData.animations.length;
      const importedCount = importedAnimations.length;
      
      if (importedCount > 0) {
        toast.success(`تم تحميل ${originalCount} أنميشن أصلية و ${importedCount} أنميشن مستوردة بنجاح`);
      } else if (originalCount > 0) {
        toast.success(`تم العثور على ${originalCount} انميشن!`);
      }
      
      setHasNotified(true);
    }
  }, [modelData, animationRegistry, onAnimationsFound, onModelSceneReady, importedAnimations.length, hasNotified, allAnimationClips]);

  // Update animation list when registry changes
  useEffect(() => {
    const animationNames = animationRegistry.getAnimationNames();
    if (animationNames.length > 0) {
      onAnimationsFound(animationNames);
    }
    // Keep parent informed about latest animations for accurate counts
    if (onModelSceneReady && modelData) {
      onModelSceneReady(modelData.scene, allAnimationClips);
    }
  }, [animationRegistry.items, onAnimationsFound, onModelSceneReady, modelData, allAnimationClips]);

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

  // Create skeleton helper BEFORE any early returns to keep hook order stable
  const skeletonHelper = useSkeletonHelper(modelData?.scene || null, showSkeleton);

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
      {skeletonHelper && <primitive object={skeletonHelper} />}
    </group>
  );
}

interface ModelViewerProps {
  modelUrl: string | null;
  fileType: 'fbx' | null;
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
  const animationRegistry = useAnimationRegistry();

  // Reset animations when model changes
  useEffect(() => {
    if (!modelUrl) {
      setAnimations([]);
      setActiveAnimation(null);
      setIsPlaying(false);
      animationRegistry.clearRegistry();
    }
  }, [modelUrl, animationRegistry]);

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
    const item = animationRegistry.items.find(item => item.name === oldName);
    if (item && animationRegistry.renameAnimation(item.id, newName)) {
      // Update active animation if it was renamed
      if (activeAnimation === oldName) {
        setActiveAnimation(newName);
      }
      // Update animations list
      setAnimations(prev => prev.map(name => name === oldName ? newName : name));
    }
  }, [animationRegistry, activeAnimation]);

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
                animationRegistry={animationRegistry}
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
                ادعم ملفات FBX مع الأنميشن - تجنب مشاكل الحجم والاتجاه
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