'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import Image from 'next/image';
import { UploadCloud, Copy, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { runGeneratePrompt } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export default function Home() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file (PNG, JPG, WEBP).');
        return;
    }

    if (file.size > 4 * 1024 * 1024) { // 4MB limit for Gemini
        setError('Image size should be less than 4MB.');
        return;
    }

    // Reset states
    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setGeneratedPrompt(null);
    setError(null);
    setIsCopied(false);

    // Create a preview URL
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    // Read the file as a data URI for the AI
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUri = reader.result as string;
      startTransition(async () => {
        const result = await runGeneratePrompt(dataUri);
        if (result.error) {
          setError(result.error);
        } else if (result.prompt) {
          setGeneratedPrompt(result.prompt);
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
    }
    handleFileChange(file);
  };
  
  const handleCopy = () => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt);
    setIsCopied(true);
    toast({
      title: 'Copied to clipboard!',
      description: 'The prompt is ready to be used.',
    });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setGeneratedPrompt(null);
    setError(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-background">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-headline text-foreground">Visual Promptcraft</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Transform your images into descriptive AI prompts instantly.
          </p>
        </header>

        <Card className="w-full overflow-hidden shadow-lg">
          <CardContent className="p-0">
            {!previewUrl ? (
              <label
                htmlFor="dropzone-file"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                    isDragging && "border-primary bg-primary/10"
                )}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP (MAX. 4MB)</p>
                </div>
                <input
                  ref={fileInputRef}
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />
              </label>
            ) : (
                <div className="relative w-full aspect-video bg-muted/20">
                  <Image
                    src={previewUrl}
                    alt="Uploaded image preview"
                    fill
                    className="object-contain"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 rounded-full h-8 w-8 shadow-md"
                    onClick={handleClear}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear image</span>
                  </Button>
                </div>
            )}
          </CardContent>
        </Card>

        {(isPending || generatedPrompt || error) && (
          <div className="w-full">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Generated Prompt</CardTitle>
              </CardHeader>
              <CardContent className="min-h-[100px]">
                {isPending && (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                )}
                {error && !isPending && (
                    <Alert variant="destructive">
                      <AlertTitle>Generation Failed</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {generatedPrompt && !isPending && (
                    <p className="text-foreground/90 whitespace-pre-wrap">{generatedPrompt}</p>
                )}
              </CardContent>
              {generatedPrompt && !isPending && (
                <CardFooter>
                    <Button onClick={handleCopy} className="w-full sm:w-auto" variant="default">
                        {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        {isCopied ? 'Copied!' : 'Copy Prompt'}
                    </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
