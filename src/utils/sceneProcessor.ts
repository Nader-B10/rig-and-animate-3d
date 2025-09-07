import * as THREE from 'three';
import { ModelOptimizer } from './modelOptimizer';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export class SceneProcessor {
  /**
   * Creates a clean clone of the scene for export
   */
  static createExportScene(originalScene: THREE.Object3D): THREE.Object3D {
    // Create a deep clone of the scene preserving skinning/bone references
    const exportScene = skeletonClone(originalScene);
    
    // Reset transformations that might cause issues
    exportScene.position.set(0, 0, 0);
    exportScene.rotation.set(0, 0, 0);
    exportScene.scale.set(1, 1, 1);
    exportScene.updateMatrix();
    
    // Process all children
    exportScene.traverse((child) => {
      // Reset matrix auto update for consistency
      child.matrixAutoUpdate = true;
      child.updateMatrix();
      
      // Ensure proper naming
      if (!child.name) {
        child.name = `Object_${child.id}`;
      }
      
      // Handle meshes specifically
      if (child instanceof THREE.Mesh) {
        this.processMeshForExport(child);
      }
      
      // Handle skinned meshes
      if (child instanceof THREE.SkinnedMesh && child.skeleton) {
        this.processSkinnedMeshForExport(child);
      }
    });
    
    return exportScene;
  }
  
  /**
   * Process a mesh for export
   */
  private static processMeshForExport(mesh: THREE.Mesh): void {
    // Ensure geometry is valid
    if (mesh.geometry) {
      // Compute missing attributes
      if (!mesh.geometry.attributes.normal) {
        mesh.geometry.computeVertexNormals();
      }
      
      if (!mesh.geometry.attributes.uv && mesh.material && 
          Array.isArray(mesh.material) ? 
          mesh.material.some(m => m instanceof THREE.MeshStandardMaterial && m.map) :
          mesh.material instanceof THREE.MeshStandardMaterial && mesh.material.map) {
        console.warn(`Mesh "${mesh.name}" has texture but no UV coordinates`);
      }
      
      // Ensure geometry bounds are computed
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
    }
    
    // Handle materials
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(mat => this.processMaterialForExport(mat));
      } else {
        this.processMaterialForExport(mesh.material);
      }
    }
  }
  
  /**
   * Process a skinned mesh for export
   */
  private static processSkinnedMeshForExport(skinnedMesh: THREE.SkinnedMesh): void {
    // First process as regular mesh
    this.processMeshForExport(skinnedMesh);
    
    // Handle skeleton
    if (skinnedMesh.skeleton) {
      // Ensure all bones have proper names
      skinnedMesh.skeleton.bones.forEach((bone, index) => {
        if (!bone.name) {
          bone.name = `Bone_${index}`;
        }
      });
      
      // Update skeleton
      skinnedMesh.skeleton.update();
    }
    
    // Ensure bind matrix is set
    if (!skinnedMesh.bindMatrix) {
      skinnedMesh.bindMatrix = new THREE.Matrix4();
    }
    
    if (!skinnedMesh.bindMatrixInverse) {
      skinnedMesh.bindMatrixInverse = new THREE.Matrix4();
    }
  }
  
  /**
   * Process a material for export
   */
  private static processMaterialForExport(material: THREE.Material): void {
    // Ensure material has a name
    if (!material.name) {
      material.name = `Material_${material.uuid}`;
    }
    
    // Handle standard materials
    if (material instanceof THREE.MeshStandardMaterial) {
      // Ensure transparency is properly set
      if (material.opacity < 1.0 && !material.transparent) {
        material.transparent = true;
      }
      
      // Set reasonable alpha test if transparent
      if (material.transparent && material.alphaTest === 0) {
        material.alphaTest = 0.1;
      }
    }
  }
  
  /**
   * Clean and validate animations for export
   */
  static processAnimationsForExport(animations: THREE.AnimationClip[]): THREE.AnimationClip[] {
    return animations.map((clip, index) => {
      const processedClip = clip.clone();
      
      // Ensure animation has a valid name
      if (!processedClip.name || processedClip.name.trim() === '') {
        processedClip.name = `Animation_${index + 1}`;
      }
      
      // Clean and validate tracks
      processedClip.tracks = processedClip.tracks.filter(track => {
        // Remove invalid tracks
        if (!track || !track.name || !track.times || !track.values) {
          console.warn(`Removing invalid track from animation "${processedClip.name}"`);
          return false;
        }
        
        // Remove tracks with no keyframes
        if (track.times.length === 0) {
          console.warn(`Removing empty track "${track.name}" from animation "${processedClip.name}"`);
          return false;
        }
        
        // Validate track data consistency
        const expectedValueCount = track.times.length * track.getValueSize();
        if (track.values.length !== expectedValueCount) {
          console.warn(`Track "${track.name}" has inconsistent data, attempting to fix`);
          // Try to fix by trimming values
          if (track.values.length > expectedValueCount) {
            track.values = track.values.slice(0, expectedValueCount);
          } else {
            // Can't fix, remove track
            console.warn(`Cannot fix track "${track.name}", removing`);
            return false;
          }
        }
        
        return true;
      });
      
      // Optimize the animation
      processedClip.optimize();
      
      return processedClip;
    }).filter(clip => clip.tracks.length > 0); // Remove animations with no valid tracks
  }
  
  /**
   * Validate scene hierarchy for export
   */
  static validateSceneHierarchy(scene: THREE.Object3D): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    scene.traverse((child) => {
      // Check for null/undefined objects
      if (!child) {
        issues.push('Found null object in scene');
        return;
      }
      
      // Check for circular references in parent-child relationships
      let parent = child.parent;
      const visited = new Set();
      while (parent) {
        if (visited.has(parent.id)) {
          issues.push(`Circular reference detected in object "${child.name || child.id}"`);
          break;
        }
        visited.add(parent.id);
        parent = parent.parent;
      }
    });
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
}