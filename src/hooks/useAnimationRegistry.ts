import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { defaultNameResolver } from '../utils/animationNameResolver';

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
  addImportedAnimations: (clips: THREE.AnimationClip[]) => void;
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
      displayName: `🎬 ${clip.name}`,
      source: 'original' as const
    }));

    setAnimations(prev => [...prev, ...newEntries]);
  }, []);

  const addImportedAnimations = useCallback((clips: THREE.AnimationClip[]) => {
    setAnimations(prev => {
      const existingNames = prev.map(entry => entry.displayName);
      
      const newEntries: AnimationEntry[] = clips.map(clip => {
        const resolvedName = defaultNameResolver.resolveName(clip.name, existingNames);
        const displayName = `🎭 Mixamo: ${resolvedName}`;
        
        return {
          clip: { ...clip, name: displayName },
          originalName: clip.name,
          displayName,
          source: 'imported' as const
        };
      });

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

    if (existingNames.includes(newName)) {
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
    clearRegistry,
    getAnimationByName
  };
};