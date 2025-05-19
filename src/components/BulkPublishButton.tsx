import { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { processImage } from '../browser-webp-converter';
import { generateImage } from '../services/imageGenerator';
import { generateImagePrompts } from '../services/imagePromptGenerator';

interface BlogPost {
  title: string;
  focusKeyword: string;
}

export const BulkPublishButton = () => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    const fileReader = new FileReader();

    fileReader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        let posts: BlogPost[] = [];

        // Parse file content
        if (file.name.endsWith('.csv')) {
          Papa.parse(content, {
            header: true,
            complete: (results) => {
              posts = results.data as BlogPost[];
            }
          });
        } else if (file.name.endsWith('.xlsx')) {
          const workbook = XLSX.read(content, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          posts = XLSX.utils.sheet_to_json(sheet) as BlogPost[];
        }

        setProgress({ current: 0, total: posts.length });

        // Process each post
        for (let i = 0; i < posts.length; i++) {
          const post = posts[i];
          
          // Generate blog content
          const response = await fetch('/api/generate-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(post)
          });
          const data = await response.json();
          
          // Generate and process images
          const imagePrompts = await generateImagePrompts(data.content);
          const images = {
            intro: await generateImage(imagePrompts.intro_image_prompt),
            ingredients: await generateImage(imagePrompts.ingredients_image_prompt),
            recipe: await generateImage(imagePrompts.final_recipe_image_prompt)
          };

          // Convert to WebP
          const webpImages = {
            intro: await processImage(images.intro),
            ingredients: await processImage(images.ingredients),
            recipe: await processImage(images.recipe)
          };

          // Publish to WordPress
          await fetch('/api/publish-to-wordpress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...post,
              content: data.content,
              images: webpImages,
              metaDescription: data.metaDescriptions[0],
              category: 'recipes',
              status: 'draft'
            })
          });

          setProgress(prev => ({ ...prev, current: i + 1 }));
        }
      } catch (error) {
        console.error('Error processing posts:', error);
      } finally {
        setProcessing(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    if (file.name.endsWith('.csv')) {
      fileReader.readAsText(file);
    } else {
      fileReader.readAsBinaryString(file);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,.xlsx"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={processing}
        style={{
          marginLeft: '10px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '4px',
          cursor: processing ? 'not-allowed' : 'pointer'
        }}
      >
        {processing ? 
          `Processing ${progress.current}/${progress.total}...` : 
          '1 Click Bulk Publish'}
      </button>
    </>
  );
};