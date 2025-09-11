import * as THREE from 'three';

export class FBXExporter {
  static export(scene: THREE.Object3D, animations: THREE.AnimationClip[] = []): ArrayBuffer {
    console.log('Starting FBX export...');
    
    // Clone the scene to avoid modifying the original
    const exportScene = scene.clone();
    
    // Calculate and normalize scale to fix size issues
    const boundingBox = new THREE.Box3().setFromObject(exportScene);
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    // Apply consistent unit scaling (1 unit = 1 cm in FBX, which is Blender's default)
    if (maxDimension > 0) {
      const targetSize = 100; // 100 cm = 1 meter in Blender
      const scale = targetSize / maxDimension;
      exportScene.scale.setScalar(scale);
      exportScene.updateMatrixWorld(true);
    }
    
    // Create proper FBX Binary structure
    const fbxData = this.createValidFBXBinary(exportScene, animations);
    console.log(`FBX export completed. Size: ${fbxData.byteLength} bytes`);
    return fbxData;
  }

  private static createValidFBXBinary(scene: THREE.Object3D, animations: THREE.AnimationClip[]): ArrayBuffer {
    // Create a larger buffer to accommodate all data
    const bufferSize = 2 * 1024 * 1024; // 2MB initial buffer
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    let offset = 0;

    // FBX Binary Header (27 bytes) - CRITICAL for Blender recognition
    const headerString = "Kaydara FBX Binary  \0\x1a\0";
    for (let i = 0; i < headerString.length; i++) {
      view.setUint8(offset++, headerString.charCodeAt(i));
    }

    // FBX Version (4 bytes) - Use FBX 2020 format (7500) for maximum compatibility
    view.setUint32(offset, 7500, true);
    offset += 4;

    console.log('Writing FBX header and version...');

    // Create comprehensive FBX node structure
    const fbxNodes = this.createComprehensiveFBXNodes(scene, animations);
    
    // Write all nodes to buffer
    for (const node of fbxNodes) {
      offset = this.writeNodeToBinary(view, offset, node);
      if (offset >= bufferSize - 1000) { // Safety check
        console.warn('Buffer size limit reached, truncating export');
        break;
      }
    }

    // Add proper FBX footer (null record)
    if (offset + 13 < bufferSize) {
      view.setUint32(offset, 0, true); // End offset
      view.setUint8(offset + 4, 0); // Num properties
      view.setUint8(offset + 5, 0); // Property list len
      // Fill remaining bytes with zeros
      for (let i = 6; i < 13; i++) {
        view.setUint8(offset + i, 0);
      }
      offset += 13;
    }

    console.log(`Final FBX size: ${offset} bytes`);
    
    // Return properly sized buffer
    return buffer.slice(0, offset);
  }

  private static createComprehensiveFBXNodes(scene: THREE.Object3D, animations: THREE.AnimationClip[]): any[] {
    const nodes = [];
    
    // 1. FBX Header Extension - REQUIRED
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
          name: "EncryptionType",
          properties: [{ type: 'I', value: 0 }],
          children: []
        },
        {
          name: "CreationTimeStamp",
          properties: [],
          children: [
            {
              name: "Version",
              properties: [{ type: 'I', value: 1000 }],
              children: []
            },
            {
              name: "Year",
              properties: [{ type: 'I', value: new Date().getFullYear() }],
              children: []
            },
            {
              name: "Month",
              properties: [{ type: 'I', value: new Date().getMonth() + 1 }],
              children: []
            },
            {
              name: "Day",
              properties: [{ type: 'I', value: new Date().getDate() }],
              children: []
            }
          ]
        },
        {
          name: "Creator",
          properties: [{ type: 'S', value: "3D Model Viewer - FBX Binary Exporter v2.0" }],
          children: []
        }
      ]
    });

    // 2. Global Settings - CRITICAL for proper import
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
                { type: 'I', value: 1 } // Y-Up
              ],
              children: []
            },
            {
              name: "P",
              properties: [
                { type: 'S', value: "UpAxisSign" },
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
                { type: 'S', value: "FrontAxis" },
                { type: 'S', value: "int" },
                { type: 'S', value: "Integer" },
                { type: 'S', value: "" },
                { type: 'I', value: 2 } // Z-Front
              ],
              children: []
            },
            {
              name: "P",
              properties: [
                { type: 'S', value: "FrontAxisSign" },
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
                { type: 'S', value: "CoordAxis" },
                { type: 'S', value: "int" },
                { type: 'S', value: "Integer" },
                { type: 'S', value: "" },
                { type: 'I', value: 0 } // X-Right
              ],
              children: []
            },
            {
              name: "P",
              properties: [
                { type: 'S', value: "CoordAxisSign" },
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
                { type: 'S', value: "OriginalUpAxis" },
                { type: 'S', value: "int" },
                { type: 'S', value: "Integer" },
                { type: 'S', value: "" },
                { type: 'I', value: -1 }
              ],
              children: []
            },
            {
              name: "P",
              properties: [
                { type: 'S', value: "OriginalUpAxisSign" },
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
                { type: 'D', value: 1.0 } // 1 unit = 1 cm
              ],
              children: []
            },
            {
              name: "P",
              properties: [
                { type: 'S', value: "OriginalUnitScaleFactor" },
                { type: 'S', value: "double" },
                { type: 'S', value: "Number" },
                { type: 'S', value: "" },
                { type: 'D', value: 1.0 }
              ],
              children: []
            }
          ]
        }
      ]
    });

    // 3. Documents section
    nodes.push({
      name: "Documents",
      properties: [],
      children: [
        {
          name: "Count",
          properties: [{ type: 'I', value: 1 }],
          children: []
        },
        {
          name: "Document",
          properties: [
            { type: 'L', value: 1234567890 },
            { type: 'S', value: "Scene" },
            { type: 'S', value: "Scene" }
          ],
          children: [
            {
              name: "Properties70",
              properties: [],
              children: [
                {
                  name: "P",
                  properties: [
                    { type: 'S', value: "SourceObject" },
                    { type: 'S', value: "object" },
                    { type: 'S', value: "" },
                    { type: 'S', value: "" }
                  ],
                  children: []
                }
              ]
            },
            {
              name: "RootNode",
              properties: [{ type: 'L', value: 0 }],
              children: []
            }
          ]
        }
      ]
    });

    // 4. References section
    nodes.push({
      name: "References",
      properties: [],
      children: []
    });

    // 5. Definitions section
    nodes.push({
      name: "Definitions",
      properties: [],
      children: [
        {
          name: "Version",
          properties: [{ type: 'I', value: 100 }],
          children: []
        },
        {
          name: "Count",
          properties: [{ type: 'I', value: 4 }],
          children: []
        },
        {
          name: "ObjectType",
          properties: [{ type: 'S', value: "GlobalSettings" }],
          children: [
            {
              name: "Count",
              properties: [{ type: 'I', value: 1 }],
              children: []
            }
          ]
        },
        {
          name: "ObjectType",
          properties: [{ type: 'S', value: "Model" }],
          children: [
            {
              name: "Count",
              properties: [{ type: 'I', value: 1 }],
              children: []
            },
            {
              name: "PropertyTemplate",
              properties: [{ type: 'S', value: "FbxNode" }],
              children: [
                {
                  name: "Properties70",
                  properties: [],
                  children: []
                }
              ]
            }
          ]
        },
        {
          name: "ObjectType",
          properties: [{ type: 'S', value: "Geometry" }],
          children: [
            {
              name: "Count",
              properties: [{ type: 'I', value: 1 }],
              children: []
            }
          ]
        },
        {
          name: "ObjectType",
          properties: [{ type: 'S', value: "Material" }],
          children: [
            {
              name: "Count",
              properties: [{ type: 'I', value: 1 }],
              children: []
            }
          ]
        }
      ]
    });

    // 6. Objects section - The main content
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
                    { type: 'S', value: "Vector3D" },
                    { type: 'S', value: "" },
                    { type: 'S', value: "d" },
                    { type: 'd', value: [object.position.x, object.position.y, object.position.z] }
                  ],
                  children: []
                },
                {
                  name: "P",
                  properties: [
                    { type: 'S', value: "Lcl Rotation" },
                    { type: 'S', value: "Vector3D" },
                    { type: 'S', value: "" },
                    { type: 'S', value: "d" },
                    { type: 'd', value: [
                      THREE.MathUtils.radToDeg(object.rotation.x),
                      THREE.MathUtils.radToDeg(object.rotation.y),
                      THREE.MathUtils.radToDeg(object.rotation.z)
                    ] }
                  ],
                  children: []
                },
                {
                  name: "P",
                  properties: [
                    { type: 'S', value: "Lcl Scaling" },
                    { type: 'S', value: "Vector3D" },
                    { type: 'S', value: "" },
                    { type: 'S', value: "d" },
                    { type: 'd', value: [object.scale.x, object.scale.y, object.scale.z] }
                  ],
                  children: []
                }
              ]
            }
          ]
        });

        // Add Geometry node with proper mesh data
        const geomId = objectId++;
        const positions = object.geometry.attributes.position;
        const indices = object.geometry.index;
        const normals = object.geometry.attributes.normal;
        const uvs = object.geometry.attributes.uv;

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
          } else {
            // No indices, create them
            for (let i = 0; i < positions.count; i += 3) {
              polygonIndices.push(i, i + 1, -(i + 2 + 1));
            }
          }

          const geometryChildren = [
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
          ];

          // Add normals if available
          if (normals) {
            const normalData = [];
            for (let i = 0; i < normals.count; i++) {
              normalData.push(normals.getX(i), normals.getY(i), normals.getZ(i));
            }
            geometryChildren.push({
              name: "LayerElementNormal",
              properties: [{ type: 'I', value: 0 }],
              children: [
                {
                  name: "Version",
                  properties: [{ type: 'I', value: 101 }],
                  children: []
                },
                {
                  name: "Name",
                  properties: [{ type: 'S', value: "" }],
                  children: []
                },
                {
                  name: "MappingInformationType",
                  properties: [{ type: 'S', value: "ByVertice" }],
                  children: []
                },
                {
                  name: "ReferenceInformationType",
                  properties: [{ type: 'S', value: "Direct" }],
                  children: []
                },
                {
                  name: "Normals",
                  properties: [{ type: 'd', value: normalData }],
                  children: []
                }
              ]
            });
          }

          // Add UVs if available
          if (uvs) {
            const uvData = [];
            for (let i = 0; i < uvs.count; i++) {
              uvData.push(uvs.getX(i), uvs.getY(i));
            }
            geometryChildren.push({
              name: "LayerElementUV",
              properties: [{ type: 'I', value: 0 }],
              children: [
                {
                  name: "Version",
                  properties: [{ type: 'I', value: 101 }],
                  children: []
                },
                {
                  name: "Name",
                  properties: [{ type: 'S', value: "map1" }],
                  children: []
                },
                {
                  name: "MappingInformationType",
                  properties: [{ type: 'S', value: "ByVertice" }],
                  children: []
                },
                {
                  name: "ReferenceInformationType",
                  properties: [{ type: 'S', value: "Direct" }],
                  children: []
                },
                {
                  name: "UV",
                  properties: [{ type: 'd', value: uvData }],
                  children: []
                }
              ]
            });
          }

          objectsNode.children.push({
            name: "Geometry",
            properties: [
              { type: 'L', value: geomId },
              { type: 'S', value: "Geometry::" },
              { type: 'S', value: "Mesh" }
            ],
            children: geometryChildren
          });
        }

        // Add basic material
        const materialId = objectId++;
        objectsNode.children.push({
          name: "Material",
          properties: [
            { type: 'L', value: materialId },
            { type: 'S', value: "Material::DefaultMaterial" },
            { type: 'S', value: "" }
          ],
          children: [
            {
              name: "Version",
              properties: [{ type: 'I', value: 102 }],
              children: []
            },
            {
              name: "ShadingModel",
              properties: [{ type: 'S', value: "phong" }],
              children: []
            },
            {
              name: "MultiLayer",
              properties: [{ type: 'I', value: 0 }],
              children: []
            },
            {
              name: "Properties70",
              properties: [],
              children: [
                {
                  name: "P",
                  properties: [
                    { type: 'S', value: "DiffuseColor" },
                    { type: 'S', value: "Color" },
                    { type: 'S', value: "" },
                    { type: 'S', value: "A" },
                    { type: 'D', value: 0.8 },
                    { type: 'D', value: 0.8 },
                    { type: 'D', value: 0.8 }
                  ],
                  children: []
                }
              ]
            }
          ]
        });
      }
    });

    nodes.push(objectsNode);

    // 7. Add animations if present
    if (animations.length > 0) {
      const animStacksNode = {
        name: "Takes",
        properties: [],
        children: [
          {
            name: "Current",
            properties: [{ type: 'S', value: "" }],
            children: []
          }
        ]
      };

      animations.forEach((clip, index) => {
        const stackId = objectId++;
        const layerId = objectId++;
        
        animStacksNode.children.push({
          name: "Take",
          properties: [{ type: 'S', value: clip.name || `Take_${index + 1}` }],
          children: [
            {
              name: "FileName",
              properties: [{ type: 'S', value: `${clip.name || `Take_${index + 1}`}.tak` }],
              children: []
            },
            {
              name: "LocalTime",
              properties: [
                { type: 'L', value: 0 },
                { type: 'L', value: Math.floor(clip.duration * 46186158000) }
              ],
              children: []
            },
            {
              name: "ReferenceTime",
              properties: [
                { type: 'L', value: 0 },
                { type: 'L', value: Math.floor(clip.duration * 46186158000) }
              ],
              children: []
            }
          ]
        });
      });

      nodes.push(animStacksNode);
    }

    // 8. Connections section - CRITICAL for linking objects
    const connectionsNode = {
      name: "Connections",
      properties: [],
      children: []
    };

    // Connect objects to scene root
    scene.traverse((object) => {
      const id = objectMap.get(object);
      if (id && object.parent) {
        const parentId = objectMap.get(object.parent) || 0;
        connectionsNode.children.push({
          name: "C",
          properties: [
            { type: 'S', value: "OO" },
            { type: 'L', value: id },
            { type: 'L', value: parentId }
          ],
          children: []
        });
      }
    });

    nodes.push(connectionsNode);

    console.log(`Created ${nodes.length} FBX nodes`);
    return nodes;
  }

  private static writeNodeToBinary(view: DataView, offset: number, node: any): number {
    const startOffset = offset;
    
    // Reserve space for end offset (will be filled later)
    const endOffsetPos = offset;
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
      offset = this.writePropertyToBinary(view, offset, prop);
    }
    
    // Fill in property list length
    view.setUint32(propLengthOffset, offset - propStartOffset, true);
    
    // Write children
    for (const child of node.children) {
      offset = this.writeNodeToBinary(view, offset, child);
    }
    
    // Fill in end offset
    view.setUint32(endOffsetPos, offset, true);
    
    return offset;
  }

  private static writePropertyToBinary(view: DataView, offset: number, prop: any): number {
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
        const value = prop.value;
        view.setInt32(offset, value & 0xFFFFFFFF, true);
        view.setInt32(offset + 4, Math.floor(value / 0x100000000), true);
        offset += 8;
        break;
        
      case 'D': // Double
        view.setFloat64(offset, prop.value, true);
        offset += 8;
        break;
        
      case 'd': // Double array
        const doubleArray = prop.value;
        view.setUint32(offset, doubleArray.length, true);
        offset += 4;
        view.setUint32(offset, 0, true); // Encoding (0 = uncompressed)
        offset += 4;
        view.setUint32(offset, doubleArray.length * 8, true); // Compressed length
        offset += 4;
        for (const val of doubleArray) {
          view.setFloat64(offset, val, true);
          offset += 8;
        }
        break;
        
      case 'i': // Int32 array
        const intArray = prop.value;
        view.setUint32(offset, intArray.length, true);
        offset += 4;
        view.setUint32(offset, 0, true); // Encoding (0 = uncompressed)
        offset += 4;
        view.setUint32(offset, intArray.length * 4, true); // Compressed length
        offset += 4;
        for (const val of intArray) {
          view.setInt32(offset, val, true);
          offset += 4;
        }
        break;
        
      default:
        console.warn(`Unknown property type: ${prop.type}`);
        break;
    }
    
    return offset;
  }
}