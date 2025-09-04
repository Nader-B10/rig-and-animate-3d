import * as THREE from 'three';

export class ModelOptimizer {
  static optimizeGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    // Remove duplicate vertices
    geometry.mergeVertices();
    
    // Compute normals if missing
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }
    
    // Compute bounding box and sphere for frustum culling
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    return geometry;
  }

  static optimizeMaterial(material: THREE.Material): THREE.Material {
    if (material instanceof THREE.MeshStandardMaterial) {
      // Enable efficient rendering options
      material.transparent = material.opacity < 1;
      material.alphaTest = material.transparent ? 0.1 : 0;
    }
    
    return material;
  }

  static optimizeScene(scene: THREE.Object3D): void {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Optimize geometry
        if (child.geometry) {
          this.optimizeGeometry(child.geometry);
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
  }

  static disposeScene(scene: THREE.Object3D): void {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
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
  }

  private static disposeMaterial(material: THREE.Material): void {
    // Dispose textures
    Object.values(material).forEach(value => {
      if (value instanceof THREE.Texture) {
        value.dispose();
      }
    });
    
    // Dispose material
    material.dispose();
  }

  static optimizeAnimations(animations: THREE.AnimationClip[]): THREE.AnimationClip[] {
    return animations.map(clip => {
      // Remove unnecessary keyframes
      clip.tracks = clip.tracks.filter(track => track.times.length > 1);
      
      // Optimize track data
      clip.tracks.forEach(track => {
        track.optimize();
      });
      
      return clip;
    });
  }
}