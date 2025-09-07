import * as THREE from 'three';

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
}

export class ExportValidator {
  static validateScene(scene: THREE.Object3D): ValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    if (!scene) {
      issues.push('Scene is null or undefined');
      return { isValid: false, issues, warnings };
    }

    let hasGeometry = false;
    let hasMaterials = false;
    let hasSkinnedMesh = false;
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        hasGeometry = true;
        
        if (!child.geometry) {
          issues.push(`Mesh "${child.name}" has no geometry`);
        } else if (!child.geometry.attributes.position) {
          issues.push(`Mesh "${child.name}" has no position attribute`);
        }
        
        if (child.material) {
          hasMaterials = true;
        } else {
          warnings.push(`Mesh "${child.name}" has no material`);
        }
        
        if (child instanceof THREE.SkinnedMesh) {
          hasSkinnedMesh = true;
          if (!child.skeleton) {
            issues.push(`SkinnedMesh "${child.name}" has no skeleton`);
          }
        }
      }
    });
    
    if (!hasGeometry) {
      warnings.push('Scene contains no geometry');
    }
    
    if (!hasMaterials) {
      warnings.push('Scene contains no materials');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }

  static validateAnimations(animations: THREE.AnimationClip[]): ValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    if (!animations || animations.length === 0) {
      warnings.push('No animations to export');
      return { isValid: true, issues, warnings };
    }
    
    animations.forEach((clip, index) => {
      if (!clip.name || clip.name.trim() === '') {
        warnings.push(`Animation ${index} has no name`);
      }
      
      if (!clip.tracks || clip.tracks.length === 0) {
        issues.push(`Animation "${clip.name || index}" has no tracks`);
      }
      
      clip.tracks.forEach((track, trackIndex) => {
        if (!track.name) {
          issues.push(`Track ${trackIndex} in animation "${clip.name || index}" has no name`);
        }
        
        if (!track.times || track.times.length === 0) {
          issues.push(`Track "${track.name}" in animation "${clip.name || index}" has no keyframes`);
        }
        
        if (!track.values || track.values.length === 0) {
          issues.push(`Track "${track.name}" in animation "${clip.name || index}" has no values`);
        }
        
        if (track.times && track.values) {
          const expectedValueCount = track.times.length * track.getValueSize();
          if (track.values.length !== expectedValueCount) {
            issues.push(`Track "${track.name}" has mismatched times/values count`);
          }
        }
      });
    });
    
    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }

  static validateForExport(scene: THREE.Object3D, animations: THREE.AnimationClip[]): ValidationResult {
    const sceneValidation = this.validateScene(scene);
    const animationValidation = this.validateAnimations(animations);
    
    return {
      isValid: sceneValidation.isValid && animationValidation.isValid,
      issues: [...sceneValidation.issues, ...animationValidation.issues],
      warnings: [...sceneValidation.warnings, ...animationValidation.warnings]
    };
  }
}