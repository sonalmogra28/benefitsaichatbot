// components/file-upload.tsx
'use client';

import { useState } from 'react';

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setMessage('Uploading...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Upload successful! File path: ${data.path}`);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage('An unexpected error occurred.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h3>Upload a Document</h3>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} disabled={isUploading} />
        <button type="submit" disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
