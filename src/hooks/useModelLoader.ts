import { useState, useEffect, useCallback } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';
import { ModelOptimizer } from '@/utils/modelOptimizer';

interface ModelData {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

export function useModelLoader(url: string | null, fileType: 'fbx' | null) {
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadModel = useCallback(async (modelUrl: string, type: 'fbx') => {
    setIsLoading(true);
    setError(null);
    
    try {
      let scene: THREE.Object3D;
      let animations: THREE.AnimationClip[] = [];
      
      const loader = new FBXLoader();
      const fbx = await new Promise<THREE.Group>((resolve, reject) => {
        loader.load(
          modelUrl,
          (object) => {
            // Fix common FBX loading issues and ensure proper scaling
            object.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                // Ensure materials are properly set
                if (!child.material) {
                  child.material = new THREE.MeshStandardMaterial({ color: 0x888888 });
                }
                // Fix bone references if they exist
                if ((child as any).skeleton) {
                  (child as any).skeleton.bones.forEach((bone: THREE.Bone) => {
                    if (bone) {
                      bone.matrixAutoUpdate = true;
                    }
                  });
                }
              }
            });
            resolve(object);
          },
          undefined,
          reject
        );
      });
      
      // Apply consistent scaling for FBX models to prevent size issues
      const boundingBox = new THREE.Box3().setFromObject(fbx);
      const size = boundingBox.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z);
      
      // Scale to a reasonable size (around 2 units max dimension)
      if (maxDimension > 10) {
        const scale = 2 / maxDimension;
        fbx.scale.setScalar(scale);
      } else if (maxDimension < 0.1) {
        // If too small, scale up
        fbx.scale.setScalar(10);
      }
      
      scene = fbx;
      animations = fbx.animations || [];
      
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
      
      setModelData({ scene, animations });
    } catch (err) {
      console.error('Error loading model:', err);
      setError(err instanceof Error ? err.message : 'خطأ في تحميل المودل');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (url && fileType) {
      loadModel(url, fileType);
    } else {
      setModelData(null);
      setError(null);
    }
  }, [url, fileType, loadModel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (modelData?.scene) {
        ModelOptimizer.disposeScene(modelData.scene);
      }
    };
  }, [modelData]);

  return { modelData, isLoading, error };
}