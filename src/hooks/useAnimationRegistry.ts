import { useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';

interface AnimationRegistryItem {
  id: string;
  name: string;
  clip: THREE.AnimationClip;
  sourceRoot?: THREE.Object3D | null;
  type: 'original' | 'imported';
}

export const useAnimationRegistry = () => {
  const [items, setItems] = useState<AnimationRegistryItem[]>([]);

  const addOriginalAnimations = useCallback((animations: THREE.AnimationClip[]) => {
    const originalItems = animations.map((clip, index) => ({
      id: `original_${index}`,
      name: clip.name || `Animation ${index + 1}`,
      clip: clip.clone(),
      type: 'original' as const,
    }));
    
    setItems(prev => [
      ...prev.filter(item => item.type !== 'original'),
      ...originalItems
    ]);
  }, []);

  const addImportedAnimations = useCallback((importedAnimations: any[]) => {
    const importedItems = importedAnimations.map((anim) => {
      // Get source skeleton for detection
      let sourceSkeleton: THREE.Skeleton | null = null;
      if (anim.sourceRoot) {
        anim.sourceRoot.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.SkinnedMesh && child.skeleton) {
            sourceSkeleton = child.skeleton;
          }
          // Also check for bones directly
          if (child instanceof THREE.Bone && !sourceSkeleton) {
            // Find skeleton by traversing up to find SkinnedMesh
            let parent = child.parent;
            while (parent) {
              if (parent instanceof THREE.SkinnedMesh && parent.skeleton) {
                sourceSkeleton = parent.skeleton;
                break;
              }
              parent = parent.parent;
            }
          }
        });
      }

      // Clone and sanitize the animation clip
      const sanitizedClip = anim.clip.clone();
      sanitizedClip.name = anim.name;

      // Remove problematic root transformation tracks that cause flipping
      sanitizedClip.tracks = sanitizedClip.tracks.filter(track => {
        const trackName = track.name.toLowerCase();
        const isRootTransform = trackName.includes('mixamorigroot') || 
                               trackName.includes('.position') || 
                               trackName.includes('.rotation') || 
                               trackName.includes('.scale');
        
        // Only remove root transforms, keep bone animations
        return !isRootTransform || trackName.includes('bone') || trackName.includes('joint');
      });

      return {
        id: anim.id,
        name: anim.name,
        clip: sanitizedClip,
        sourceRoot: anim.sourceRoot,
        type: 'imported' as const,
      };
    });
    
    setItems(prev => [
      ...prev.filter(item => item.type !== 'imported'),
      ...importedItems
    ]);
  }, []);

  const getAllClips = useCallback(() => {
    return items.map(item => item.clip);
  }, [items]);

  const getAnimationNames = useCallback(() => {
    return items.map(item => item.name);
  }, [items]);

  const renameAnimation = useCallback((id: string, newName: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedClip = item.clip.clone();
        updatedClip.name = newName;
        return { ...item, name: newName, clip: updatedClip };
      }
      return item;
    }));
    return true;
  }, []);

  const clearRegistry = useCallback(() => {
    setItems([]);
  }, []);

  return useMemo(() => ({
    items,
    addOriginalAnimations,
    addImportedAnimations,
    getAllClips,
    getAnimationNames,
    renameAnimation,
    clearRegistry,
  }), [items, addOriginalAnimations, addImportedAnimations, getAllClips, getAnimationNames, renameAnimation, clearRegistry]);
};