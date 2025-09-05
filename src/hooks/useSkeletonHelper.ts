import { useMemo } from 'react';
import * as THREE from 'three';

export function useSkeletonHelper(scene: THREE.Object3D | null, visible: boolean = false) {
  const skeletonHelper = useMemo(() => {
    if (!scene || !visible) return null;

    // Find the first SkinnedMesh with a skeleton
    let targetMesh: THREE.SkinnedMesh | null = null;
    
    scene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && child.skeleton && !targetMesh) {
        targetMesh = child;
      }
    });

    if (!targetMesh || !targetMesh.skeleton) {
      return null;
    }

    try {
      const helper = new THREE.SkeletonHelper(targetMesh);
      if (helper.material instanceof THREE.LineBasicMaterial) {
        helper.material.linewidth = 2;
        helper.material.color.setHex(0x00ff00);
      }
      helper.visible = visible;
      return helper;
    } catch (error) {
      console.warn('Failed to create skeleton helper:', error);
      return null;
    }
  }, [scene, visible]);

  return skeletonHelper;
}