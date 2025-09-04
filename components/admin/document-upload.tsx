'use client';

import { useState, useCallback, type KeyboardEvent } from 'react';
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface DocumentUploadProps {
  companyId: string;
  onUploadComplete?: (document: any) => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  documentId?: string;
}

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentUpload({
  companyId,
  onUploadComplete,
}: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [documentType, setDocumentType] = useState<string>('policy');
  const [category, setCategory] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const validateFile = (file: File): string | undefined => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'File type not supported. Please upload PDF, DOC, DOCX, or TXT files.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 10MB limit.';
    }
    return undefined;
  };

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadingFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const error = validateFile(file);

      newFiles.push({
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error,
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const uploadFile = async (uploadingFile: UploadingFile, index: number) => {
    try {
      // Update status to uploading
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...uploadingFile,
          status: 'uploading',
          progress: 10,
        };
        return updated;
      });

      // Prepare form data
      const formData = new FormData();
      formData.append('file', uploadingFile.file);
      formData.append(
        'metadata',
        JSON.stringify({
          title: uploadingFile.file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          documentType,
          category: category || undefined,
          tags: tags ? tags.split(',').map((t) => t.trim()) : [],
        }),
      );

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFiles((prev) => {
          const updated = [...prev];
          if (updated[index].progress < 90) {
            updated[index] = {
              ...updated[index],
              progress: updated[index].progress + 10,
            };
          }
          return updated;
        });
      }, 500);

      // Upload file
      const response = await fetch(
        `/api/admin/companies/${companyId}/documents/upload`,
        {
          method: 'POST',
          body: formData,
        },
      );

      clearInterval(progressInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();

      // Update to processing status
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...uploadingFile,
          status: 'processing',
          progress: 95,
          documentId: result.document.id,
        };
        return updated;
      });

      // Mark as complete
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...uploadingFile,
          status: 'complete',
          progress: 100,
        };
        return updated;
      });

      toast({
        title: 'Document uploaded successfully',
        description: `${uploadingFile.file.name} has been uploaded and is being processed.`,
      });

      if (onUploadComplete) {
        onUploadComplete(result.document);
      }
    } catch (error) {
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...uploadingFile,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed',
        };
        return updated;
      });

      toast({
        title: 'Upload failed',
        description:
          error instanceof Error
            ? error.message
            : 'An error occurred during upload',
        variant: 'destructive',
      });
    }
  };

  const handleUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await uploadFile(files[i], i);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('file-upload')?.click();
    }
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const uploadingCount = files.filter(
    (f) => f.status === 'uploading' || f.status === 'processing',
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Knowledge Base Documents</CardTitle>
        <CardDescription>
          Upload PDF, Word, or text documents to enhance the AI&apos;s knowledge
          about your benefits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Document metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="documentType">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="documentType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="policy">Policy Document</SelectItem>
                <SelectItem value="guide">Employee Guide</SelectItem>
                <SelectItem value="faq">FAQ</SelectItem>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category">Category (optional)</Label>
            <Input
              id="category"
              placeholder="e.g., Healthcare, Retirement"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="e.g., dental, vision, 401k"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload className="mx-auto size-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop files here, or click to browse
          </p>
          <Input
            type="file"
            multiple
            accept=".pdf,.txt,.doc,.docx"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="file-upload"
          />
          <p className="text-xs text-muted-foreground mt-2">
            PDF, DOC, DOCX, or TXT up to 10MB each
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected Files</h4>
            {files.map((file, index) => (
              <div
                key={`${file.file.name}-${index}`}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <FileText className="size-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {file.status === 'uploading' ||
                  file.status === 'processing' ? (
                    <Progress value={file.progress} className="h-1 mt-1" />
                  ) : null}
                  {file.error && (
                    <p className="text-xs text-destructive mt-1">
                      {file.error}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {file.status === 'pending' && (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                  {file.status === 'uploading' && (
                    <Badge variant="default">
                      <Loader2 className="size-3 mr-1 animate-spin" />
                      Uploading
                    </Badge>
                  )}
                  {file.status === 'processing' && (
                    <Badge variant="default">
                      <Loader2 className="size-3 mr-1 animate-spin" />
                      Processing
                    </Badge>
                  )}
                  {file.status === 'complete' && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="size-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                  {file.status === 'error' && (
                    <Badge variant="destructive">
                      <AlertCircle className="size-3 mr-1" />
                      Error
                    </Badge>
                  )}
                  {(file.status === 'pending' || file.status === 'error') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {pendingCount > 0 && (
          <Button
            onClick={handleUpload}
            disabled={uploadingCount > 0}
            className="w-full"
          >
            {uploadingCount > 0 ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Uploading {uploadingCount} file{uploadingCount > 1 ? 's' : ''}
                ...
              </>
            ) : (
              <>
                <Upload className="size-4 mr-2" />
                Upload {pendingCount} file{pendingCount > 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}

        {/* Info alert */}
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Processing Information</AlertTitle>
          <AlertDescription>
            After upload, documents are automatically processed to extract text
            and generate embeddings. This may take a few minutes depending on
            file size. Documents will be available for search once processing is
            complete.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
