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
    
    // Create Binary FBX structure
    const fbxData = this.createBinaryFBX(exportScene, animations);
    return fbxData;
  }

  private static createBinaryFBX(scene: THREE.Object3D, animations: THREE.AnimationClip[]): ArrayBuffer {
    // FBX Binary format structure
    const buffer = new ArrayBuffer(1024 * 1024); // Start with 1MB buffer
    const view = new DataView(buffer);
    let offset = 0;

    // FBX Binary Header (27 bytes)
    const header = "Kaydara FBX Binary  \0\x1a\0";
    for (let i = 0; i < header.length; i++) {
      view.setUint8(offset++, header.charCodeAt(i));
    }

    // FBX Version (4 bytes) - FBX 2020 format
    view.setUint32(offset, 7500, true);
    offset += 4;

    // Create simplified binary FBX structure
    const fbxNodes = this.createFBXNodes(scene, animations);
    
    // Write nodes to buffer
    for (const node of fbxNodes) {
      offset = this.writeNode(view, offset, node);
    }

    // Add null record to end
    view.setUint32(offset, 0, true); // End offset
    view.setUint8(offset + 4, 0); // Num properties
    view.setUint8(offset + 5, 0); // Property list len
    offset += 13; // Null record is 13 bytes

    // Return trimmed buffer
    return buffer.slice(0, offset);
  }

  private static createFBXNodes(scene: THREE.Object3D, animations: THREE.AnimationClip[]): any[] {
    const nodes = [];
    
    // FBX Header Extension
    nodes.push({
      name: "FBXHeaderExtension",
      properties: [],
      children: [
        {
          name: "FBXHeaderVersion",
          properties: [{ type: 'I', value: 1003 }],
          children: []
        },
        {
          name: "FBXVersion",
          properties: [{ type: 'I', value: 7500 }],
          children: []
        },
        {
          name: "Creator",
          properties: [{ type: 'S', value: "Lovable 3D Model Viewer - Binary FBX Export" }],
          children: []
        }
      ]
    });

    // Global Settings
    nodes.push({
      name: "GlobalSettings",
      properties: [],
      children: [
        {
          name: "Version",
          properties: [{ type: 'I', value: 1000 }],
          children: []
        },
        {
          name: "Properties70",
          properties: [],
          children: [
            {
              name: "P",
              properties: [
                { type: 'S', value: "UpAxis" },
                { type: 'S', value: "int" },
                { type: 'S', value: "Integer" },
                { type: 'S', value: "" },
                { type: 'I', value: 1 }
              ],
              children: []
            },
            {
              name: "P",
              properties: [
                { type: 'S', value: "UnitScaleFactor" },
                { type: 'S', value: "double" },
                { type: 'S', value: "Number" },
                { type: 'S', value: "" },
                { type: 'D', value: 100.0 }
              ],
              children: []
            }
          ]
        }
      ]
    });

    // Objects
    const objectsNode = {
      name: "Objects",
      properties: [],
      children: []
    };

    let objectId = 1000000;
    const objectMap = new Map<THREE.Object3D, number>();

    // Process scene objects
    scene.traverse((object) => {
      const id = objectId++;
      objectMap.set(object, id);

      if (object instanceof THREE.Mesh && object.geometry) {
        // Add Model node
        objectsNode.children.push({
          name: "Model",
          properties: [
            { type: 'L', value: id },
            { type: 'S', value: `Model::${object.name || 'Mesh'}` },
            { type: 'S', value: "Mesh" }
          ],
          children: [
            {
              name: "Version",
              properties: [{ type: 'I', value: 232 }],
              children: []
            },
            {
              name: "Properties70",
              properties: [],
              children: [
                {
                  name: "P",
                  properties: [
                    { type: 'S', value: "Lcl Translation" },
                    { type: 'S', value: "Lcl Translation" },
                    { type: 'S', value: "" },
                    { type: 'S', value: "A" },
                    { type: 'D', value: object.position.x },
                    { type: 'D', value: object.position.y },
                    { type: 'D', value: object.position.z }
                  ],
                  children: []
                }
              ]
            }
          ]
        });

        // Add Geometry node
        const geomId = objectId++;
        const positions = object.geometry.attributes.position;
        const indices = object.geometry.index;

        if (positions) {
          const vertices = [];
          for (let i = 0; i < positions.count; i++) {
            vertices.push(positions.getX(i), positions.getY(i), positions.getZ(i));
          }

          const polygonIndices = [];
          if (indices) {
            for (let i = 0; i < indices.count; i += 3) {
              polygonIndices.push(
                indices.getX(i),
                indices.getY(i),
                -(indices.getZ(i) + 1) // Negative for last vertex of polygon
              );
            }
          }

          objectsNode.children.push({
            name: "Geometry",
            properties: [
              { type: 'L', value: geomId },
              { type: 'S', value: "Geometry::" },
              { type: 'S', value: "Mesh" }
            ],
            children: [
              {
                name: "Vertices",
                properties: [{ type: 'd', value: vertices }],
                children: []
              },
              {
                name: "PolygonVertexIndex",
                properties: [{ type: 'i', value: polygonIndices }],
                children: []
              }
            ]
          });
        }
      }
    });

    nodes.push(objectsNode);

    // Add animations if present
    if (animations.length > 0) {
      const animStacksNode = {
        name: "AnimationStacks",
        properties: [],
        children: []
      };

      animations.forEach((clip, index) => {
        const stackId = objectId++;
        animStacksNode.children.push({
          name: "AnimationStack",
          properties: [
            { type: 'L', value: stackId },
            { type: 'S', value: `AnimStack::${clip.name}` },
            { type: 'S', value: "" }
          ],
          children: [
            {
              name: "Properties70",
              properties: [],
              children: [
                {
                  name: "P",
                  properties: [
                    { type: 'S', value: "LocalStart" },
                    { type: 'S', value: "KTime" },
                    { type: 'S', value: "Time" },
                    { type: 'S', value: "" },
                    { type: 'L', value: 0 }
                  ],
                  children: []
                },
                {
                  name: "P",
                  properties: [
                    { type: 'S', value: "LocalStop" },
                    { type: 'S', value: "KTime" },
                    { type: 'S', value: "Time" },
                    { type: 'S', value: "" },
                    { type: 'L', value: Math.floor(clip.duration * 46186158000) }
                  ],
                  children: []
                }
              ]
            }
          ]
        });
      });

      nodes.push(animStacksNode);
    }

    // Connections
    nodes.push({
      name: "Connections",
      properties: [],
      children: []
    });

    return nodes;
  }

  private static writeNode(view: DataView, offset: number, node: any): number {
    const startOffset = offset;
    
    // Reserve space for end offset (will be filled later)
    offset += 4;
    
    // Number of properties
    view.setUint32(offset, node.properties.length, true);
    offset += 4;
    
    // Property list length (will be calculated)
    const propLengthOffset = offset;
    offset += 4;
    
    // Node name length
    view.setUint8(offset, node.name.length);
    offset += 1;
    
    // Node name
    for (let i = 0; i < node.name.length; i++) {
      view.setUint8(offset++, node.name.charCodeAt(i));
    }
    
    // Properties
    const propStartOffset = offset;
    for (const prop of node.properties) {
      offset = this.writeProperty(view, offset, prop);
    }
    
    // Fill in property list length
    view.setUint32(propLengthOffset, offset - propStartOffset, true);
    
    // Write children
    for (const child of node.children) {
      offset = this.writeNode(view, offset, child);
    }
    
    // Fill in end offset
    view.setUint32(startOffset, offset, true);
    
    return offset;
  }

  private static writeProperty(view: DataView, offset: number, prop: any): number {
    // Property type code
    view.setUint8(offset++, prop.type.charCodeAt(0));
    
    switch (prop.type) {
      case 'S': // String
        const str = prop.value.toString();
        view.setUint32(offset, str.length, true);
        offset += 4;
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset++, str.charCodeAt(i));
        }
        break;
        
      case 'I': // Int32
        view.setInt32(offset, prop.value, true);
        offset += 4;
        break;
        
      case 'L': // Int64 (stored as two 32-bit values)
        view.setInt32(offset, prop.value & 0xFFFFFFFF, true);
        view.setInt32(offset + 4, (prop.value >> 32) & 0xFFFFFFFF, true);
        offset += 8;
        break;
        
      case 'D': // Double
        view.setFloat64(offset, prop.value, true);
        offset += 8;
        break;
        
      case 'd': // Double array
        view.setUint32(offset, prop.value.length, true);
        offset += 4;
        view.setUint32(offset, 0, true); // Encoding (0 = uncompressed)
        offset += 4;
        view.setUint32(offset, prop.value.length * 8, true); // Compressed length
        offset += 4;
        for (const val of prop.value) {
          view.setFloat64(offset, val, true);
          offset += 8;
        }
        break;
        
      case 'i': // Int32 array
        view.setUint32(offset, prop.value.length, true);
        offset += 4;
        view.setUint32(offset, 0, true); // Encoding (0 = uncompressed)
        offset += 4;
        view.setUint32(offset, prop.value.length * 4, true); // Compressed length
        offset += 4;
        for (const val of prop.value) {
          view.setInt32(offset, val, true);
          offset += 4;
        }
        break;
    }
    
    return offset;
  }
}