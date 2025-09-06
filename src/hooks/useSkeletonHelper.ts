import { useMemo } from 'react';
import * as THREE from 'three';

export function useSkeletonHelper(scene: THREE.Object3D | null, visible: boolean = false) {
  const skeletonHelper = useMemo(() => {
    if (!scene || !visible) return null;
    
    console.log('[SkeletonHelper] Creating skeleton helper for scene');

    // Enhanced skeleton detection - check all possible SkinnedMesh locations
    let targetMesh: THREE.SkinnedMesh | null = null;
    let allSkinnedMeshes: THREE.SkinnedMesh[] = [];
    
    scene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && child.skeleton) {
        allSkinnedMeshes.push(child);
        if (!targetMesh) {
          targetMesh = child;
        }
      }
    });

    // If no SkinnedMesh found, create a debug log
    if (allSkinnedMeshes.length === 0) {
      console.log('[SkeletonHelper] No SkinnedMesh found in scene for skeleton helper');
      return null;
    }
    
    console.log(`[SkeletonHelper] Found ${allSkinnedMeshes.length} SkinnedMesh objects`);

    // Select the mesh with the most bones (usually the main character)
    if (allSkinnedMeshes.length > 1) {
      targetMesh = allSkinnedMeshes.reduce((prev, current) => 
        (current.skeleton.bones.length > prev.skeleton.bones.length) ? current : prev
      );
      console.log(`[SkeletonHelper] Selected mesh with ${targetMesh.skeleton.bones.length} bones`);
    }

    if (!targetMesh || !targetMesh.skeleton) {
      console.warn('[SkeletonHelper] No valid skeleton found for helper');
      return null;
    }

    try {
      console.log(`[SkeletonHelper] Creating helper for skeleton with ${targetMesh.skeleton.bones.length} bones`);
      const helper = new THREE.SkeletonHelper(targetMesh);
      if (helper.material instanceof THREE.LineBasicMaterial) {
        helper.material.linewidth = 3; // Increased line width for better visibility
        helper.material.color.setHex(0x00ff88); // Brighter green
        helper.material.opacity = 0.9;
        helper.material.transparent = true;
        helper.material.depthTest = false; // Always on top
      }
      helper.visible = visible;
      helper.name = 'SkeletonHelper';
      
      console.log(`[SkeletonHelper] Skeleton helper created with ${targetMesh.skeleton.bones.length} bones`);
      return helper;
    } catch (error) {
      console.warn('[SkeletonHelper] Failed to create skeleton helper:', error);
      return null;
    }
  }, [scene, visible]);

  return skeletonHelper;
}