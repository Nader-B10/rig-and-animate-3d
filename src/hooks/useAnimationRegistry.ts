import { useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { defaultNameResolver } from '@/utils/animationNameResolver';

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
    // Ensure unique names across existing items and new originals
    const used = new Set(items.map(i => i.name));

    const originalItems = animations.map((clip, index) => {
      const base = clip.name || `Animation ${index + 1}`;
      const uniqueName = defaultNameResolver.generateUniqueName(base, false, used);
      used.add(uniqueName);

      const cloned = clip.clone();
      cloned.name = uniqueName;

      return {
        id: `original_${index}`,
        name: uniqueName,
        clip: cloned,
        type: 'original' as const,
      };
    });
    
    setItems(prev => [
      ...prev.filter(item => item.type !== 'original'),
      ...originalItems
    ]);
  }, [items]);

  const addImportedAnimations = useCallback((importedAnimations: any[]) => {
    const used = new Set(items.map(i => i.name));
    const importedItems = importedAnimations.map((anim, idx) => {
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

      // Generate a unique, cleaned name for imported animations
      const base = anim.name || sanitizedClip.name || `Imported ${idx + 1}`;
      const uniqueName = defaultNameResolver.generateUniqueName(base, true, used);
      used.add(uniqueName);
      sanitizedClip.name = uniqueName;

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
        id: anim.id || `imported_${idx}`,
        name: uniqueName,
        clip: sanitizedClip,
        sourceRoot: anim.sourceRoot,
        type: 'imported' as const,
      };
    });
    
    setItems(prev => [
      ...prev.filter(item => item.type !== 'imported'),
      ...importedItems
    ]);
  }, [items]);

  const getAllClips = useCallback(() => {
    return items.map(item => item.clip);
  }, [items]);

  const getAnimationNames = useCallback(() => {
    return items.map(item => item.name);
  }, [items]);

  const renameAnimation = useCallback((id: string, newName: string) => {
    setItems(prev => {
      const used = new Set(prev.filter(i => i.id !== id).map(i => i.name));
      const target = prev.find(i => i.id === id);

      let finalName = (newName || '').trim();
      if (!finalName) finalName = target?.name || 'Animation';

      if (defaultNameResolver.hasConflict(finalName, used)) {
        finalName = defaultNameResolver.generateUniqueName(finalName, target?.type === 'imported', used);
      }

      return prev.map(item => {
        if (item.id === id) {
          const updatedClip = item.clip.clone();
          updatedClip.name = finalName;
          return { ...item, name: finalName, clip: updatedClip };
        }
        return item;
      });
    });
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