import { useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

interface ImportedAnimation {
  id: string;
  name: string;
  url: string;
  clip: THREE.AnimationClip;
  sourceRoot?: THREE.Object3D | null;
}

interface AnimationRegistryItem {
  id: string;
  name: string;
  clip: THREE.AnimationClip;
  isImported: boolean;
  sourceType?: string;
}

interface AnimationRegistry {
  items: AnimationRegistryItem[];
  addOriginalAnimations: (clips: THREE.AnimationClip[]) => void;
  addImportedAnimations: (imported: ImportedAnimation[], targetSkeleton?: THREE.Skeleton) => void;
  renameAnimation: (id: string, newName: string) => boolean;
  getAllClips: () => THREE.AnimationClip[];
  getAnimationNames: () => string[];
  removeImportedAnimations: () => void;
  clear: () => void;
}

export function useAnimationRegistry(): AnimationRegistry {
  const [registryItems, setRegistryItems] = useState<AnimationRegistryItem[]>([]);

  const addOriginalAnimations = useCallback((clips: THREE.AnimationClip[]) => {
    const originalItems: AnimationRegistryItem[] = clips.map((clip, index) => ({
      id: `original_${index}_${Date.now()}`,
      name: clip.name || `Animation ${index + 1}`,
      clip: clip.clone(),
      isImported: false
    }));

    setRegistryItems(prev => {
      // Remove old original animations and add new ones
      const importedOnly = prev.filter(item => item.isImported);
      return [...originalItems, ...importedOnly];
    });
  }, []);

  const retargetAnimation = useCallback((
    sourceClip: THREE.AnimationClip,
    sourceRoot: THREE.Object3D | null,
    targetSkeleton?: THREE.Skeleton
  ): THREE.AnimationClip => {
    if (!sourceRoot || !targetSkeleton) {
      return sourceClip.clone();
    }

    try {
      // Find source skeleton
      let sourceSkeleton: THREE.Skeleton | null = null;
      sourceRoot.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh && child.skeleton) {
          sourceSkeleton = child.skeleton;
        }
      });

      if (!sourceSkeleton) {
        console.warn('No source skeleton found, using original clip');
        return sourceClip.clone();
      }

      // Create bone mapping between source and target
      const boneMapping: Record<string, string> = {};
      
      // Common bone name mappings (Mixamo to standard rigs)
      const commonMappings: Record<string, string[]> = {
        'Hips': ['mixamorig:Hips', 'Hips', 'Hip'],
        'Spine': ['mixamorig:Spine', 'Spine', 'Spine1'],
        'Spine1': ['mixamorig:Spine1', 'Spine1', 'Spine2'],
        'Spine2': ['mixamorig:Spine2', 'Spine2', 'Spine3'],
        'Neck': ['mixamorig:Neck', 'Neck', 'Neck1'],
        'Head': ['mixamorig:Head', 'Head'],
        'LeftShoulder': ['mixamorig:LeftShoulder', 'LeftShoulder', 'L_Shoulder'],
        'LeftArm': ['mixamorig:LeftArm', 'LeftArm', 'L_UpperArm'],
        'LeftForeArm': ['mixamorig:LeftForeArm', 'LeftForeArm', 'L_LowerArm'],
        'LeftHand': ['mixamorig:LeftHand', 'LeftHand', 'L_Hand'],
        'RightShoulder': ['mixamorig:RightShoulder', 'RightShoulder', 'R_Shoulder'],
        'RightArm': ['mixamorig:RightArm', 'RightArm', 'R_UpperArm'],
        'RightForeArm': ['mixamorig:RightForeArm', 'RightForeArm', 'R_LowerArm'],
        'RightHand': ['mixamorig:RightHand', 'RightHand', 'R_Hand'],
        'LeftUpLeg': ['mixamorig:LeftUpLeg', 'LeftUpLeg', 'L_UpperLeg'],
        'LeftLeg': ['mixamorig:LeftLeg', 'LeftLeg', 'L_LowerLeg'],
        'LeftFoot': ['mixamorig:LeftFoot', 'LeftFoot', 'L_Foot'],
        'RightUpLeg': ['mixamorig:RightUpLeg', 'RightUpLeg', 'R_UpperLeg'],
        'RightLeg': ['mixamorig:RightLeg', 'RightLeg', 'R_LowerLeg'],
        'RightFoot': ['mixamorig:RightFoot', 'RightFoot', 'R_Foot']
      };

      // Build mapping
      targetSkeleton.bones.forEach(targetBone => {
        const targetName = targetBone.name;
        
        // Try exact match first
        const sourceExact = sourceSkeleton!.bones.find(b => b.name === targetName);
        if (sourceExact) {
          boneMapping[sourceExact.name] = targetName;
          return;
        }

        // Try common mappings
        for (const [standardName, variations] of Object.entries(commonMappings)) {
          if (variations.includes(targetName)) {
            const sourceVariation = sourceSkeleton!.bones.find(b => 
              variations.includes(b.name)
            );
            if (sourceVariation) {
              boneMapping[sourceVariation.name] = targetName;
              break;
            }
          }
        }
      });

      // Use SkeletonUtils for retargeting if we have a good mapping
      if (Object.keys(boneMapping).length > 5) {
        try {
          const retargetedClip = SkeletonUtils.retargetClip(
            targetSkeleton.bones[0], // target root
            sourceSkeleton.bones[0], // source root
            sourceClip,
            boneMapping
          );
          
          if (retargetedClip) {
            retargetedClip.name = sourceClip.name;
            return retargetedClip;
          }
        } catch (error) {
          console.warn('Retargeting failed, using original clip:', error);
        }
      }

      return sourceClip.clone();
    } catch (error) {
      console.warn('Animation retargeting error:', error);
      return sourceClip.clone();
    }
  }, []);

  const addImportedAnimations = useCallback((
    imported: ImportedAnimation[],
    targetSkeleton?: THREE.Skeleton
  ) => {
    const importedItems: AnimationRegistryItem[] = imported.map((anim, index) => {
      const retargetedClip = retargetAnimation(anim.clip, anim.sourceRoot, targetSkeleton);
      
      return {
        id: anim.id,
        name: anim.name,
        clip: retargetedClip,
        isImported: true,
        sourceType: anim.url.includes('fbx') ? 'FBX' : 'Mixamo'
      };
    });

    setRegistryItems(prev => {
      // Remove old imported animations and add new ones
      const originalOnly = prev.filter(item => !item.isImported);
      return [...originalOnly, ...importedItems];
    });
  }, [retargetAnimation]);

  const renameAnimation = useCallback((id: string, newName: string): boolean => {
    setRegistryItems(prev => {
      const item = prev.find(item => item.id === id);
      if (!item) return prev;

      const updatedItem = { ...item, name: newName };
      updatedItem.clip.name = newName; // Update the actual clip name
      
      return prev.map(item => item.id === id ? updatedItem : item);
    });
    return true;
  }, []);

  const getAllClips = useCallback((): THREE.AnimationClip[] => {
    return registryItems.map(item => item.clip);
  }, [registryItems]);

  const getAnimationNames = useCallback((): string[] => {
    return registryItems.map(item => item.name);
  }, [registryItems]);

  const removeImportedAnimations = useCallback(() => {
    setRegistryItems(prev => prev.filter(item => !item.isImported));
  }, []);

  const clear = useCallback(() => {
    setRegistryItems([]);
  }, []);

  return useMemo(() => ({
    items: registryItems,
    addOriginalAnimations,
    addImportedAnimations,
    renameAnimation,
    getAllClips,
    getAnimationNames,
    removeImportedAnimations,
    clear
  }), [
    registryItems,
    addOriginalAnimations,
    addImportedAnimations,
    renameAnimation,
    getAllClips,
    getAnimationNames,
    removeImportedAnimations,
    clear
  ]);
}