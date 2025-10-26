'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { UploadCloud, Copy, Check, X, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { runGeneratePrompt } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type ImagePromptItem = {
  id: number;
  file: File;
  previewUrl: string;
  prompt: string | null;
  error: string | null;
  isPending: boolean;
};

let nextId = 0;

export default function Home() {
  const [items, setItems] = useState<ImagePromptItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedItemId, setCopiedItemId] = useState<number | null>(null);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      items.forEach(item => URL.revokeObjectURL(item.previewUrl));
    };
  }, [items]);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: ImagePromptItem[] = [];
    const newErrors: string[] = [];

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        newErrors.push(`"${file.name}" ليس ملف صورة صالح.`);
        return;
      }

      if (file.size > 4 * 1024 * 1024) { // 4MB limit for Gemini
        newErrors.push(`"${file.name}" يتجاوز حجم 4 ميغابايت.`);
        return;
      }

      const newItem: ImagePromptItem = {
        id: nextId++,
        file,
        previewUrl: URL.createObjectURL(file),
        prompt: null,
        error: null,
        isPending: true,
      };
      newItems.push(newItem);
    });

    if (newErrors.length > 0) {
      toast({
        variant: 'destructive',
        title: 'فشل تحميل الملف',
        description: newErrors.join('\n'),
      });
    }

    if(newItems.length > 0) {
      setItems(prev => [...newItems, ...prev]);
      newItems.forEach(item => processFile(item.id, item.file));
    }
  };

  const processFile = (id: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUri = reader.result as string;
      const result = await runGeneratePrompt(dataUri);
      setItems(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, prompt: result.prompt ?? null, error: result.error ?? null, isPending: false }
            : item
        )
      );
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
    if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
    }
    handleFiles(e.dataTransfer.files);
  };

  const handleCopy = (id: number, prompt: string | null) => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopiedItemId(id);
    toast({
      title: 'تم النسخ إلى الحافظة!',
      description: 'المطالبة جاهزة للاستخدام.',
    });
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  const handleClear = (id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };
  
  const handleClearAll = () => {
    setItems([]);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-background text-foreground">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl sm:text-5xl font-bold font-headline text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#007C91]">
            Visual Promptcraft
          </h1>
          <p className="text-muted-foreground mt-2 text-lg max-w-2xl mx-auto">
            حول صورك إلى مطالبات ذكاء اصطناعي وصفية على الفور. ارفع الصورة واحصل على مطالبة مبتكرة.
          </p>
        </header>

        <Card className="w-full overflow-hidden shadow-lg bg-card/60 backdrop-blur-xl border-white/20">
          <CardContent className="p-0">
            <label
              htmlFor="dropzone-file"
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                  "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  isDragging ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <UploadCloud className="w-12 h-12 mb-4 text-primary" />
                <p className="mb-2 text-base text-foreground">
                  <span className="font-semibold text-primary">انقر للتحميل</span> أو قم بالسحب والإفلات
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG, أو WEBP (الحد الأقصى 4 ميغابايت لكل صورة)</p>
              </div>
              <input
                ref={fileInputRef}
                id="dropzone-file"
                type="file"
                multiple
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          </CardContent>
        </Card>

        {items.length > 0 && (
          <div className="w-full space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">الصور التي تم تحميلها</h2>
                <Button variant="outline" onClick={handleClearAll} className="bg-transparent hover:bg-destructive hover:text-destructive-foreground">
                  <Trash2 className="mr-2 h-4 w-4" />
                  مسح الكل
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <Card key={item.id} className="shadow-lg overflow-hidden flex flex-col bg-card/60 backdrop-blur-xl border-white/20">
                  <div className="relative w-full aspect-video bg-muted/20">
                    <Image
                      src={item.previewUrl}
                      alt={`Preview of ${item.file.name}`}
                      fill
                      className="object-contain"
                    />
                     <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full h-8 w-8 shadow-md z-10 bg-black/50 hover:bg-destructive border-white/20"
                        onClick={() => handleClear(item.id)}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear image</span>
                      </Button>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg truncate font-medium" title={item.file.name}>{item.file.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="min-h-[120px] flex-grow flex items-center justify-center">
                    {item.isPending && (
                      <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                         <Loader2 className="h-8 w-8 animate-spin text-primary" />
                         <span className="text-sm">جارٍ الإنشاء...</span>
                      </div>
                    )}
                    {item.error && !item.isPending && (
                        <Alert variant="destructive">
                          <AlertTitle>فشل الإنشاء</AlertTitle>
                          <AlertDescription>{item.error}</AlertDescription>
                        </Alert>
                    )}
                    {item.prompt && !item.isPending && (
                        <p className="text-foreground/90 whitespace-pre-wrap text-sm">{item.prompt}</p>
                    )}
                  </CardContent>
                  {item.prompt && !item.isPending && (
                    <CardFooter>
                        <Button 
                          onClick={() => handleCopy(item.id, item.prompt)} 
                          className="w-full bg-gradient-to-r from-primary to-[#007C91] text-white transition-transform hover:scale-105"
                        >
                            {copiedItemId === item.id ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                            {copiedItemId === item.id ? 'تم النسخ!' : 'نسخ المطالبة'}
                        </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
