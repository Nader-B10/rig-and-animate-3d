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
          loader.load(modelUrl, resolve, undefined, reject);
        });
        
        // Scale FBX models appropriately
        fbx.scale.setScalar(0.01);
        scene = fbx;
        animations = fbx.animations || [];
      } else {
        const loader = new GLTFLoader();
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(modelUrl, resolve, undefined, reject);
        });
        
        scene = gltf.scene;
        animations = gltf.animations || [];
      }
      
      // Optimize the loaded model
      ModelOptimizer.optimizeScene(scene);
      animations = ModelOptimizer.optimizeAnimations(animations);
      
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