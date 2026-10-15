"use client";

import React, { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  maxSizeMB?: number;
}

export default function FileDropzone({ onFileSelected, maxSizeMB = 50 }: FileDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const validateAndSelect = (file: File) => {
    // 1. Validate file exists
    if (!file) return;

    // 2. Validate MIME Type (PDF Only)
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Invalid File Type", {
        description: `${file.name} is not a PDF. Only PDF uploads are supported.`,
      });
      return;
    }

    // 3. Validate File Size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error("File Too Large", {
        description: `${file.name} exceeds the ${maxSizeMB}MB file size limit.`,
      });
      return;
    }

    // 4. Dispatch selected file
    console.log(`[Dropzone]: File validated successfully: ${file.name} (${file.size} bytes)`);
    onFileSelected(file);
  };

  // Drag listeners
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Keyboard navigation helpers
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onButtonClick();
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label="Upload PDF Document file dropzone"
      className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        isDragActive
          ? "border-primary bg-primary/5 scale-[0.99] shadow-lg shadow-primary/5"
          : "border-border bg-card hover:bg-secondary/15 hover:border-primary/30"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleChange}
        tabIndex={-1}
      />

      <div className="flex flex-col items-center max-w-sm mx-auto">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-transform ${
          isDragActive ? "bg-primary text-white scale-110" : "bg-primary/10 text-primary"
        }`}>
          <UploadCloud className="h-6 w-6" />
        </div>
        
        <h3 className="text-sm font-semibold text-foreground mb-1.5">
          Drag and drop your PDF here
        </h3>
        <p className="text-xs text-muted-foreground mb-6 leading-normal">
          or click to browse local folders. Only PDF documents up to {maxSizeMB}MB are accepted.
        </p>
      </div>
    </div>
  );
}
