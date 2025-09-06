import { useState, useEffect, useCallback } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';
import { ModelOptimizer } from '@/utils/modelOptimizer';

interface ModelData {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

export function useModelLoader(url: string | null, fileType: 'gltf' | 'glb' | 'fbx' | null) {
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadModel = useCallback(async (modelUrl: string, type: 'gltf' | 'glb' | 'fbx') => {
    setIsLoading(true);
    setError(null);
    console.log(`[useModelLoader] Starting to load ${type.toUpperCase()} model from:`, modelUrl);
    
    try {
      let scene: THREE.Object3D;
      let animations: THREE.AnimationClip[] = [];
      
      if (type === 'fbx') {
        console.log('[useModelLoader] Loading FBX model...');
        const loader = new FBXLoader();
        const fbx = await new Promise<THREE.Group>((resolve, reject) => {
          loader.load(
            modelUrl,
            (object) => {
              console.log('[useModelLoader] FBX loaded successfully');
              // Fix common FBX loading issues
              object.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  // Ensure materials are properly set
                  if (!child.material) {
                    child.material = new THREE.MeshStandardMaterial({ color: 0x888888 });
                    console.log('[useModelLoader] Fixed missing material for FBX mesh');
                  }
                  // Fix bone references if they exist
                  if ((child as any).skeleton) {
                    (child as any).skeleton.bones.forEach((bone: THREE.Bone) => {
                      if (bone) {
                        bone.matrixAutoUpdate = true;
                      }
                    });
                    console.log('[useModelLoader] Fixed bone references for FBX skeleton');
                  }
                }
              });
              resolve(object);
            },
            (progress) => {
              console.log(`[useModelLoader] FBX loading progress: ${Math.round((progress.loaded / progress.total) * 100)}%`);
            },
            (error) => {
              console.error('[useModelLoader] FBX loading error:', error);
              reject(error);
            }
          );
        });
        
        // Scale FBX models appropriately
        fbx.scale.setScalar(0.01);
        scene = fbx;
        animations = fbx.animations || [];
        console.log(`[useModelLoader] FBX processed: ${animations.length} animations found`);
      } else {
        console.log(`[useModelLoader] Loading ${type.toUpperCase()} model...`);
        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(
            modelUrl,
            (gltf) => {
              console.log(`[useModelLoader] ${type.toUpperCase()} loaded successfully`);
              // Fix GLTF bone issues
              gltf.scene.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh && (child as any).skeleton) {
                  (child as any).skeleton.bones.forEach((bone: THREE.Bone) => {
                    if (bone) {
                      bone.matrixAutoUpdate = true;
                    }
                  });
                  console.log('[useModelLoader] Fixed bone references for GLTF skeleton');
                }
              });
              resolve(gltf);
            },
            (progress) => {
              console.log(`[useModelLoader] ${type.toUpperCase()} loading progress: ${Math.round((progress.loaded / progress.total) * 100)}%`);
            },
            (error) => {
              console.error(`[useModelLoader] ${type.toUpperCase()} loading error:`, error);
              reject(error);
            }
          );
        });
        
        scene = gltf.scene;
        animations = gltf.animations || [];
        console.log(`[useModelLoader] ${type.toUpperCase()} processed: ${animations.length} animations found`);
      }
      
      console.log('[useModelLoader] Configuring scene...');
      // Ensure scene is properly configured
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = true;
        }
      });
      
      // Don't over-optimize for now to avoid issues
      // ModelOptimizer.optimizeScene(scene);
      // animations = ModelOptimizer.optimizeAnimations(animations);
      
      console.log('[useModelLoader] Model loaded successfully:', {
        type,
        animationsCount: animations.length,
        sceneChildren: scene.children.length
      });
      
      setModelData({ scene, animations });
    } catch (err) {
      console.error('[useModelLoader] Error loading model:', err);
      setError(err instanceof Error ? err.message : 'خطأ في تحميل المودل');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (url && fileType) {
      console.log(`[useModelLoader] Model URL changed, loading ${fileType} model`);
      loadModel(url, fileType);
    } else {
      console.log('[useModelLoader] No URL or file type, clearing model data');
      setModelData(null);
      setError(null);
    }
  }, [url, fileType, loadModel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (modelData?.scene) {
        console.log('[useModelLoader] Cleaning up model data on unmount');
        ModelOptimizer.disposeScene(modelData.scene);
      }
    };
  }, [modelData]);

  return { modelData, isLoading, error };
}