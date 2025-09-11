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
    
    try {
      let scene: THREE.Object3D;
      let animations: THREE.AnimationClip[] = [];
      
      if (type === 'fbx') {
        const loader = new FBXLoader();
        const fbx = await new Promise<THREE.Group>((resolve, reject) => {
          loader.load(
            modelUrl,
            (object) => {
              // Fix common FBX loading issues
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
        
        // Scale FBX models appropriately
        fbx.scale.setScalar(0.01);
        scene = fbx;
        animations = fbx.animations || [];
      } else {
        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(
            modelUrl,
            (gltf) => {
              // Fix GLTF bone issues
              gltf.scene.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh && (child as any).skeleton) {
                  (child as any).skeleton.bones.forEach((bone: THREE.Bone) => {
                    if (bone) {
                      bone.matrixAutoUpdate = true;
                    }
                  });
                }
              });
              resolve(gltf);
            },
            undefined,
            reject
          );
        });
        
        scene = gltf.scene;
        animations = gltf.animations || [];
      }
      
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