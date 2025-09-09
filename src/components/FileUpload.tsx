import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface FileUploadProps {
  onFileSelect: (url: string, fileType: 'fbx') => void;
  className?: string;
  multiple?: boolean;
}

export const FileUpload = ({ onFileSelect, className, multiple = false }: FileUploadProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;

    acceptedFiles.forEach((file) => {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      if (!fileExtension || fileExtension !== 'fbx') {
        toast.error(`نوع الملف غير مدعوم: ${file.name}. يرجى رفع ملف FBX فقط`);
        return;
      }

      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error(`الملف كبير جداً: ${file.name}. الحد الأقصى 100MB`);
        return;
      }

      const url = URL.createObjectURL(file);
      onFileSelect(url, 'fbx');
    });
    
    toast.success(`تم رفع ${acceptedFiles.length} ملف${acceptedFiles.length > 1 ? '' : ''}`);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.fbx'],
    },
    multiple: multiple,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  return (
    <Card 
      {...getRootProps()} 
      className={`p-8 cursor-pointer transition-all duration-300 border-dashed border-2 ${
        isDragActive 
          ? 'border-primary bg-primary/5 shadow-glow' 
          : isDragReject
          ? 'border-destructive bg-destructive/5'
          : 'border-border hover:border-primary/50 hover:bg-primary/5'
      } ${className}`}
    >
      <input {...getInputProps()} />
      
      <div className="text-center">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-300 ${
          isDragActive 
            ? 'gradient-hero shadow-glow animate-pulse-glow' 
            : isDragReject
            ? 'bg-destructive/10'
            : 'bg-primary/10'
        }`}>
          {isDragReject ? (
            <AlertCircle className="w-8 h-8 text-destructive" />
          ) : isDragActive ? (
            <FileCheck className="w-8 h-8 text-white" />
          ) : (
            <Upload className="w-8 h-8 text-primary" />
          )}
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {isDragActive ? 'أفلت الملف هنا...' : 'ارفع مودل FBX'}
        </h3>
        
        <p className="text-muted-foreground mb-4">
          {isDragReject 
            ? 'نوع الملف غير مدعوم - يجب أن يكون FBX'
            : multiple
            ? 'اسحب وأفلت ملفات FBX هنا، أو انقر للاختيار (يمكن اختيار عدة ملفات)'
            : 'اسحب وأفلت ملف FBX هنا، أو انقر للاختيار'
          }
        </p>
        
        {!isDragActive && (
          <Button 
            type="button" 
            variant="outline"
            className="gradient-primary text-white border-0 shadow-glow hover:shadow-primary"
          >
            <Upload className="w-4 h-4 mr-2" />
            اختر ملف
          </Button>
        )}
        
        <div className="mt-4 text-xs text-muted-foreground">
          <p>النوع المدعوم: FBX فقط</p>
          <p>الحد الأقصى: 100MB</p>
          <p className="text-yellow-600 mt-1">⚠️ للحصول على أفضل النتائج، استخدم FBX فقط للمودل والأنميشن</p>
        </div>
      </div>
    </Card>
  );
};