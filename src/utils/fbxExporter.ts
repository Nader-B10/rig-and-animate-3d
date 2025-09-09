import * as THREE from 'three';

export class FBXExporter {
  static export(scene: THREE.Object3D, animations: THREE.AnimationClip[] = []): ArrayBuffer {
    // Clone the scene to avoid modifying the original
    const exportScene = scene.clone();
    
    // Calculate and normalize scale to fix size issues
    const boundingBox = new THREE.Box3().setFromObject(exportScene);
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    // Apply consistent unit scaling (100 units = 1 meter, which is Blender's default)
    if (maxDimension > 0) {
      const targetSize = 100; // 100 units in FBX = 1 meter in Blender
      const scale = targetSize / maxDimension;
      exportScene.scale.setScalar(scale);
      exportScene.updateMatrixWorld(true);
    }
    
    // Create a simple FBX structure
    let fbxContent = '';
    
    // FBX Header
    fbxContent += 'FBXHeaderExtension:  {\n';
    fbxContent += '\tFBXHeaderVersion: 1003\n';
    fbxContent += '\tFBXVersion: 7400\n';
    fbxContent += '\tCreationTimeStamp:  {\n';
    fbxContent += `\t\tVersion: 1000\n`;
    fbxContent += `\t\tYear: ${new Date().getFullYear()}\n`;
    fbxContent += `\t\tMonth: ${new Date().getMonth() + 1}\n`;
    fbxContent += `\t\tDay: ${new Date().getDate()}\n`;
    fbxContent += `\t\tHour: ${new Date().getHours()}\n`;
    fbxContent += `\t\tMinute: ${new Date().getMinutes()}\n`;
    fbxContent += `\t\tSecond: ${new Date().getSeconds()}\n`;
    fbxContent += `\t\tMillisecond: ${new Date().getMilliseconds()}\n`;
    fbxContent += '\t}\n';
    fbxContent += '\tCreator: "Lovable 3D Model Merger - Scale Normalized"\n';
    fbxContent += '}\n\n';
    
    // Global Settings for proper scaling
    fbxContent += 'GlobalSettings:  {\n';
    fbxContent += '\tVersion: 1000\n';
    fbxContent += '\tProperties70:  {\n';
    fbxContent += '\t\tP: "UpAxis", "int", "Integer", "",1\n';
    fbxContent += '\t\tP: "UpAxisSign", "int", "Integer", "",1\n';
    fbxContent += '\t\tP: "FrontAxis", "int", "Integer", "",2\n';
    fbxContent += '\t\tP: "FrontAxisSign", "int", "Integer", "",1\n';
    fbxContent += '\t\tP: "CoordAxis", "int", "Integer", "",0\n';
    fbxContent += '\t\tP: "CoordAxisSign", "int", "Integer", "",1\n';
    fbxContent += '\t\tP: "OriginalUpAxis", "int", "Integer", "",1\n';
    fbxContent += '\t\tP: "OriginalUpAxisSign", "int", "Integer", "",1\n';
    fbxContent += '\t\tP: "UnitScaleFactor", "double", "Number", "",100\n'; // 100 units = 1 meter
    fbxContent += '\t\tP: "OriginalUnitScaleFactor", "double", "Number", "",100\n';
    fbxContent += '\t}\n';
    fbxContent += '}\n\n';

    // Objects section
    fbxContent += 'Objects:  {\n';
    
    let objectId = 1000000;
    const objectMap = new Map<THREE.Object3D, number>();
    
    // Process scene hierarchy
    exportScene.traverse((object) => {
      const id = objectId++;
      objectMap.set(object, id);
      
      if (object instanceof THREE.Mesh) {
        // Model definition
        fbxContent += `\tModel: ${id}, "Model::${object.name || 'Mesh'}", "Mesh" {\n`;
        fbxContent += '\t\tVersion: 232\n';
        fbxContent += '\t\tProperties70:  {\n';
        fbxContent += `\t\t\tP: "Lcl Translation", "Lcl Translation", "", "A",${object.position.x},${object.position.y},${object.position.z}\n`;
        fbxContent += `\t\t\tP: "Lcl Rotation", "Lcl Rotation", "", "A",${THREE.MathUtils.radToDeg(object.rotation.x)},${THREE.MathUtils.radToDeg(object.rotation.y)},${THREE.MathUtils.radToDeg(object.rotation.z)}\n`;
        fbxContent += `\t\t\tP: "Lcl Scaling", "Lcl Scaling", "", "A",${object.scale.x},${object.scale.y},${object.scale.z}\n`;
        fbxContent += '\t\t}\n';
        fbxContent += '\t\tShading: T\n';
        fbxContent += '\t\tCulling: "CullingOff"\n';
        fbxContent += '\t}\n';
        
        // Geometry
        if (object.geometry) {
          const geomId = objectId++;
          fbxContent += `\tGeometry: ${geomId}, "Geometry::", "Mesh" {\n`;
          
          const positions = object.geometry.attributes.position;
          if (positions) {
            fbxContent += '\t\tVertices: *' + (positions.count * 3) + ' {\n\t\t\ta: ';
            for (let i = 0; i < positions.count; i++) {
              fbxContent += `${positions.getX(i)},${positions.getY(i)},${positions.getZ(i)}`;
              if (i < positions.count - 1) fbxContent += ',';
            }
            fbxContent += '\n\t\t}\n';
          }
          
          const indices = object.geometry.index;
          if (indices) {
            fbxContent += '\t\tPolygonVertexIndex: *' + indices.count + ' {\n\t\t\ta: ';
            for (let i = 0; i < indices.count; i += 3) {
              fbxContent += `${indices.getX(i)},${indices.getY(i)},${-(indices.getZ(i) + 1)}`;
              if (i < indices.count - 3) fbxContent += ',';
            }
            fbxContent += '\n\t\t}\n';
          }
          
          fbxContent += '\t}\n';
        }
      }
    });
    
    // Animations
    animations.forEach((clip, clipIndex) => {
      const animStackId = objectId++;
      const animLayerId = objectId++;
      
      fbxContent += `\tAnimationStack: ${animStackId}, "AnimStack::${clip.name}", "" {\n`;
      fbxContent += '\t\tProperties70:  {\n';
      fbxContent += `\t\t\tP: "LocalStart", "KTime", "Time", "",0\n`;
      fbxContent += `\t\t\tP: "LocalStop", "KTime", "Time", "",${Math.floor(clip.duration * 46186158000)}\n`;
      fbxContent += `\t\t\tP: "ReferenceStart", "KTime", "Time", "",0\n`;
      fbxContent += `\t\t\tP: "ReferenceStop", "KTime", "Time", "",${Math.floor(clip.duration * 46186158000)}\n`;
      fbxContent += '\t\t}\n';
      fbxContent += '\t}\n';
      
      fbxContent += `\tAnimationLayer: ${animLayerId}, "AnimLayer::${clip.name}", "" {\n`;
      fbxContent += '\t}\n';
      
      // Animation curves for each track
      clip.tracks.forEach((track) => {
        const curveId = objectId++;
        const property = track.name.split('.').pop() || 'position';
        
        fbxContent += `\tAnimationCurve: ${curveId}, "AnimCurve::", "" {\n`;
        fbxContent += '\t\tDefault: 0\n';
        fbxContent += '\t\tKeyVer: 4009\n';
        
        if (track.times && track.values) {
          const timeCount = track.times.length;
          fbxContent += `\t\tKeyTime: *${timeCount} {\n\t\t\ta: `;
          for (let i = 0; i < timeCount; i++) {
            fbxContent += Math.floor(track.times[i] * 46186158000);
            if (i < timeCount - 1) fbxContent += ',';
          }
          fbxContent += '\n\t\t}\n';
          
          fbxContent += `\t\tKeyValueFloat: *${track.values.length} {\n\t\t\ta: `;
          for (let i = 0; i < track.values.length; i++) {
            fbxContent += track.values[i];
            if (i < track.values.length - 1) fbxContent += ',';
          }
          fbxContent += '\n\t\t}\n';
        }
        
        fbxContent += '\t}\n';
      });
    });
    
    fbxContent += '}\n\n';
    
    // Connections
    fbxContent += 'Connections:  {\n';
    
    // Connect objects to scene
    exportScene.traverse((object) => {
      const id = objectMap.get(object);
      if (id && object.parent) {
        const parentId = objectMap.get(object.parent);
        if (parentId) {
          fbxContent += `\tC: "OO",${id},${parentId}\n`;
        }
      }
    });
    
    fbxContent += '}\n';
    
    // Convert to ArrayBuffer
    const encoder = new TextEncoder();
    return encoder.encode(fbxContent).buffer;
  }
}