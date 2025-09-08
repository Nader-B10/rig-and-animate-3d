import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { defaultNameResolver } from '@/utils/animationNameResolver';

interface ImportedAnimation {
  id: string;
  name: string;
  url: string;
  clip: THREE.AnimationClip;
  sourceRoot?: THREE.Object3D | null;
}

export interface AnimationEntry {
  clip: THREE.AnimationClip;
  originalName: string;
  displayName: string;
  source: 'original' | 'imported';
  isRenamed?: boolean;
}

export interface AnimationRegistry {
  animations: AnimationEntry[];
  addOriginalAnimations: (clips: THREE.AnimationClip[]) => void;
  addImportedAnimations: (importedAnimations: ImportedAnimation[]) => void;
  getAllClips: () => THREE.AnimationClip[];
  getAllNames: () => string[];
  renameAnimation: (originalName: string, newName: string) => boolean;
  clearRegistry: () => void;
  getAnimationByName: (name: string) => AnimationEntry | undefined;
}

export const useAnimationRegistry = (): AnimationRegistry => {
  const [animations, setAnimations] = useState<AnimationEntry[]>([]);

  const addOriginalAnimations = useCallback((clips: THREE.AnimationClip[]) => {
    const newEntries: AnimationEntry[] = clips.map(clip => ({
      clip,
      originalName: clip.name,
      const uniqueName = defaultNameResolver.generateUniqueName(
      source: 'original' as const
    }));

    const newItems: AnimationRegistryItem[] = importedAnimations.map((imported, index) => {
      const uniqueName = defaultNameResolver.generateUniqueName(
        imported.clip.name || `Imported Animation ${index + 1}`,
  const addImportedAnimations = useCallback((importedAnimations: ImportedAnimation[]) => {
    setAnimations(prev => {
      const existingNames = prev.map(entry => entry.displayName);
      
      const newEntries: AnimationEntry[] = clips.map(clip => {
        const resolvedName = defaultNameResolver.resolveName(clip.name, existingNames);
        const displayName = `🎭 Mixamo: ${resolvedName}`;
        
      imported.clip.name = uniqueName;
          clip: { ...clip, name: displayName },
          originalName: clip.name,
        id: imported.id,
          source: 'imported' as const
        clip: imported.clip,
      });
        originalName: imported.clip.name
      return [...prev, ...newEntries];
    });
  }, []);

  const getAllClips = useCallback(() => {
    return animations.map(entry => entry.clip);
  }, [animations]);

  const getAllNames = useCallback(() => {
    return animations.map(entry => entry.displayName);
  }, [animations]);

  const renameAnimation = useCallback((originalName: string, newName: string): boolean => {
    const existingNames = animations
      .filter(entry => entry.originalName !== originalName)
      .map(entry => entry.displayName);
    const existingItem = items.find(item => item.name === newName && item.id !== id);
    if (existingItem) {
      return false; // Name already exists
    }

    setAnimations(prev => prev.map(entry => {
      if (entry.originalName === originalName) {
        return {
          ...entry,
          displayName: newName,
          clip: { ...entry.clip, name: newName },
          isRenamed: true
        };
      }
      return entry;
    }));

    return true;
  }, [animations]);

  const clearRegistry = useCallback(() => {
    setAnimations([]);
  }, []);

  const getAnimationByName = useCallback((name: string): AnimationEntry | undefined => {
    return animations.find(entry => entry.displayName === name);
  }, [animations]);

  return {
    animations,
    addOriginalAnimations,
    addImportedAnimations,
    getAllClips,
    getAllNames,
    renameAnimation,
    clearRegistry
    getAnimationByName
  };
};