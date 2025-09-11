export function detectFileType(filename: string): 'gltf' | 'glb' | 'fbx' | null {
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'gltf':
      return 'gltf';
    case 'glb':
      return 'glb';
    case 'fbx':
      return 'fbx';
    default:
      return null;
  }
}

export function validateFileSize(file: File, maxSizeMB: number = 100): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}