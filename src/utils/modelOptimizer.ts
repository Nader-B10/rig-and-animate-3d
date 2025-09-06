import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';


export class ModelOptimizer {
  static optimizeGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    console.log('[ModelOptimizer] Optimizing geometry...');
    // Remove duplicate vertices using BufferGeometryUtils
    const merged = mergeVertices(geometry);
    const target = merged ?? geometry;
    
    // Compute normals if missing
    if (!target.attributes.normal) {
      console.log('[ModelOptimizer] Computing missing normals');
      target.computeVertexNormals();
    }
    
    // Compute bounding box and sphere for frustum culling
    target.computeBoundingBox();
    target.computeBoundingSphere();
    
    console.log('[ModelOptimizer] Geometry optimization completed');
    return target;
  }

  static optimizeMaterial(material: THREE.Material): THREE.Material {
    console.log('[ModelOptimizer] Optimizing material:', material.type);
    if (material instanceof THREE.MeshStandardMaterial) {
      // Enable efficient rendering options
      material.transparent = material.opacity < 1;
      material.alphaTest = material.transparent ? 0.1 : 0;
      console.log(`[ModelOptimizer] Material transparency: ${material.transparent}, alphaTest: ${material.alphaTest}`);
    }
    
    return material;
  }

  static optimizeScene(scene: THREE.Object3D): void {
    console.log('[ModelOptimizer] Optimizing scene...');
    let meshCount = 0;
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshCount++;
        // Optimize geometry
        if (child.geometry) {
          const optimized = this.optimizeGeometry(child.geometry);
          if (optimized !== child.geometry) {
            console.log('[ModelOptimizer] Geometry replaced with optimized version');
            child.geometry.dispose();
            child.geometry = optimized;
          }
        }
        
        // Optimize materials
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => this.optimizeMaterial(mat));
          } else {
            this.optimizeMaterial(child.material);
          }
        }
        
        // Enable frustum culling
        child.frustumCulled = true;
        
        // Enable matrix auto update only when needed
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });
    
    console.log(`[ModelOptimizer] Scene optimization completed: ${meshCount} meshes processed`);
  }

  static disposeScene(scene: THREE.Object3D): void {
    console.log('[ModelOptimizer] Disposing scene resources...');
    let disposedCount = 0;
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        disposedCount++;
        // Dispose geometry
        if (child.geometry) {
          child.geometry.dispose();
        }
        
        // Dispose materials
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              this.disposeMaterial(mat);
            });
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
    });
    
    console.log(`[ModelOptimizer] Scene disposal completed: ${disposedCount} meshes disposed`);
  }

  private static disposeMaterial(material: THREE.Material): void {
    console.log(`[ModelOptimizer] Disposing material: ${material.type}`);
    // Dispose textures
    Object.values(material).forEach(value => {
      if (value instanceof THREE.Texture) {
        console.log('[ModelOptimizer] Disposing texture');
        value.dispose();
      }
    });
    
    // Dispose material
    material.dispose();
  }

  static optimizeAnimations(animations: THREE.AnimationClip[]): THREE.AnimationClip[] {
    console.log(`[ModelOptimizer] Optimizing ${animations.length} animations`);
    
    return animations.map(clip => {
      // Remove unnecessary keyframes
      clip.tracks = clip.tracks.filter(track => track.times.length > 1);
      
      // Optimize track data
      clip.tracks.forEach(track => {
        track.optimize();
      });
      
      console.log(`[ModelOptimizer] Animation "${clip.name}" optimized: ${clip.tracks.length} tracks`);
      return clip;
    });
  }
}