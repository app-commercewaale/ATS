"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ExternalLink, Save, Info, FileSpreadsheet } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SheetsPage() {
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [embedUrl, setEmbedUrl] = useState<string>('');

  // Load saved sheet URL from localStorage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('admin_google_sheet_url');
    if (savedUrl) {
      setSheetUrl(savedUrl);
      processUrl(savedUrl);
    } else {
      // Default placeholder sheet for demo purposes
      const defaultUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit';
      setSheetUrl(defaultUrl);
      processUrl(defaultUrl);
    }
  }, []);

  const processUrl = (url: string) => {
    try {
      // Extract the sheet ID to ensure we format the embed URL correctly
      const match = url.match(/\/d\/(.*?)(\/|$)/);
      if (match && match[1]) {
        const id = match[1];
        // Using /edit with rm=minimal allows simultaneous working in a clean view
        setEmbedUrl(`https://docs.google.com/spreadsheets/d/${id}/edit?rm=minimal`);
      } else {
        setEmbedUrl(url);
      }
    } catch (e) {
      setEmbedUrl(url);
    }
  };

  const handleSave = () => {
    localStorage.setItem('admin_google_sheet_url', sheetUrl);
    processUrl(sheetUrl);
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 h-full min-h-[calc(100vh-12rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7 md:h-8 md:w-8 text-primary" />
            Master Records Sheet
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Centralized database for all application records and live data tracking.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="hidden sm:flex">
          <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Full View
          </a>
        </Button>
      </div>

      <Card className="border-primary/10">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="text-lg">Connect Central Sheet</CardTitle>
          <CardDescription>
            Paste the URL of your Google Sheet that collects application data.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="sheet-url" className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Google Sheet Link</Label>
              <Input
                id="sheet-url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="bg-muted/30"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSave} className="w-full sm:w-auto shadow-md">
                <Save className="mr-2 h-4 w-4" />
                Sync Database
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4" />
        <AlertTitle className="text-sm font-bold">Real-time Manipulation Setup</AlertTitle>
        <AlertDescription className="text-xs sm:text-sm">
          To enable simultaneous editing, click <span className="font-semibold">Share</span> in Google Sheets and set access to <span className="font-semibold">"Anyone with the link can edit"</span>.
        </AlertDescription>
      </Alert>

      <div className="flex-1 min-h-[500px] border rounded-xl overflow-hidden shadow-inner bg-card flex flex-col">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full flex-1 border-none"
            allow="autoplay; encrypted-media"
            title="Google Sheet Viewer"
            style={{ minHeight: '600px' }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 p-12 text-center space-y-4">
            <FileSpreadsheet className="h-16 w-16 text-muted-foreground opacity-20" />
            <div className="max-w-xs">
              <p className="text-sm font-medium">No Sheet Connected</p>
              <p className="text-xs text-muted-foreground mt-1">Please provide a valid Google Sheet URL above to view the application master records.</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="sm:hidden">
        <Button variant="outline" size="lg" asChild className="w-full">
          <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Sheet in New Tab
          </a>
        </Button>
      </div>
    </div>
  );
}
