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
      // Find source skeleton with enhanced detection
      let sourceSkeleton: THREE.Skeleton | null = null;
      let sourceSkinnedMesh: THREE.SkinnedMesh | null = null;
      
      sourceRoot.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh && child.skeleton && !sourceSkeleton) {
          sourceSkeleton = child.skeleton;
          sourceSkinnedMesh = child;
        }
      });

      if (!sourceSkeleton || !sourceSkinnedMesh) {
        console.warn('No source skeleton found, using original clip');
        return sourceClip.clone();
      }

      // Preserve original model orientation by ensuring consistent coordinate systems
      const originalRotation = sourceSkinnedMesh.rotation.clone();
      const originalScale = sourceSkinnedMesh.scale.clone();
      
      // Create enhanced bone mapping with coordinate system preservation
      const boneMapping: Record<string, string> = {};
      
      // Enhanced bone name mappings with more variations
      const commonMappings: Record<string, string[]> = {
        'Hips': ['mixamorig:Hips', 'Hips', 'Hip', 'Root', 'Pelvis'],
        'Spine': ['mixamorig:Spine', 'Spine', 'Spine1', 'Chest'],
        'Spine1': ['mixamorig:Spine1', 'Spine1', 'Spine2', 'UpperChest'],
        'Spine2': ['mixamorig:Spine2', 'Spine2', 'Spine3', 'Chest'],
        'Neck': ['mixamorig:Neck', 'Neck', 'Neck1'],
        'Head': ['mixamorig:Head', 'Head'],
        'LeftShoulder': ['mixamorig:LeftShoulder', 'LeftShoulder', 'L_Shoulder', 'Left_Shoulder'],
        'LeftArm': ['mixamorig:LeftArm', 'LeftArm', 'L_UpperArm', 'Left_UpperArm'],
        'LeftForeArm': ['mixamorig:LeftForeArm', 'LeftForeArm', 'L_LowerArm', 'Left_LowerArm'],
        'LeftHand': ['mixamorig:LeftHand', 'LeftHand', 'L_Hand', 'Left_Hand'],
        'RightShoulder': ['mixamorig:RightShoulder', 'RightShoulder', 'R_Shoulder', 'Right_Shoulder'],
        'RightArm': ['mixamorig:RightArm', 'RightArm', 'R_UpperArm', 'Right_UpperArm'],
        'RightForeArm': ['mixamorig:RightForeArm', 'RightForeArm', 'R_LowerArm', 'Right_LowerArm'],
        'RightHand': ['mixamorig:RightHand', 'RightHand', 'R_Hand', 'Right_Hand'],
        'LeftUpLeg': ['mixamorig:LeftUpLeg', 'LeftUpLeg', 'L_UpperLeg', 'Left_UpperLeg', 'L_Thigh'],
        'LeftLeg': ['mixamorig:LeftLeg', 'LeftLeg', 'L_LowerLeg', 'Left_LowerLeg', 'L_Shin'],
        'LeftFoot': ['mixamorig:LeftFoot', 'LeftFoot', 'L_Foot', 'Left_Foot'],
        'RightUpLeg': ['mixamorig:RightUpLeg', 'RightUpLeg', 'R_UpperLeg', 'Right_UpperLeg', 'R_Thigh'],
        'RightLeg': ['mixamorig:RightLeg', 'RightLeg', 'R_LowerLeg', 'Right_LowerLeg', 'R_Shin'],
        'RightFoot': ['mixamorig:RightFoot', 'RightFoot', 'R_Foot', 'Right_Foot']
      };

      // Build comprehensive mapping with fuzzy matching
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
          if (variations.some(v => targetName.toLowerCase().includes(v.toLowerCase()) || 
                                    v.toLowerCase().includes(targetName.toLowerCase()))) {
            const sourceVariation = sourceSkeleton!.bones.find(b => 
              variations.some(v => b.name.toLowerCase().includes(v.toLowerCase()) ||
                                   v.toLowerCase().includes(b.name.toLowerCase()))
            );
            if (sourceVariation) {
              boneMapping[sourceVariation.name] = targetName;
              break;
            }
          }
        }
      });

      console.log(`Bone mapping created: ${Object.keys(boneMapping).length} bones mapped`);

      // Enhanced retargeting with coordinate system preservation
      if (Object.keys(boneMapping).length > 3) {
        try {
          // Create a modified clip that preserves model orientation
          const retargetedClip = SkeletonUtils.retargetClip(
            targetSkeleton.bones[0], // target root
            sourceSkeleton.bones[0], // source root
            sourceClip,
            boneMapping
          );
          
          if (retargetedClip) {
            retargetedClip.name = sourceClip.name;
            
            // Remove root rotation track to avoid flipping the whole model
            const rootNames = ['Hips', 'mixamorig:Hips', 'mixamorigHips'];
            retargetedClip.tracks = retargetedClip.tracks.filter(track => {
              const isRootQuat = rootNames.some(r => track.name.endsWith(`${r}.quaternion`));
              return !isRootQuat;
            });
            
            console.log(`Animation "${sourceClip.name}" retargeted successfully`);
            return retargetedClip;
          }
        } catch (error) {
          console.warn('Retargeting failed, using original clip:', error);
        }
      }

      console.log(`Using original clip for "${sourceClip.name}" (insufficient bone mapping)`);
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

  return {
    items: registryItems,
    addOriginalAnimations,
    addImportedAnimations,
    renameAnimation,
    getAllClips,
    getAnimationNames,
    removeImportedAnimations,
    clear
  };
}