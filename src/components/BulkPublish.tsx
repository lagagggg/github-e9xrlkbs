import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { processImage } from '../browser-webp-converter';
import { generateImage } from '../services/imageGenerator';
import { generateImagePrompts } from '../services/imagePromptGenerator';

interface BlogPost {
  title: string;
  focusKeyword: string;
  content?: string;
  images?: {
    intro?: string;
    ingredients?: string;
    recipe?: string;
  };
  metaDescription?: string;
  category?: string;
  status?: 'draft' | 'publish';
}

export const BulkPublish = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
      const content = e.target?.result as string;
      let data: BlogPost[] = [];

      if (file.name.endsWith('.csv')) {
        Papa.parse(content, {
          header: true,
          complete: (results) => {
            data = results.data.map(row => ({
              title: row.title,
              focusKeyword: row.focusKeyword
            }));
          }
        });
      } else if (file.name.endsWith('.xlsx')) {
        const workbook = XLSX.read(content, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(sheet).map(row => ({
          title: (row as any).title,
          focusKeyword: (row as any).focusKeyword
        }));
      }

      setPosts(data);
    };

    if (file.name.endsWith('.csv')) {
      fileReader.readAsText(file);
    } else {
      fileReader.readAsBinaryString(file);
    }
  };

  const processPost = async (post: BlogPost) => {
    try {
      // Generate blog content
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: post.title,
          focusKeyword: post.focusKeyword
        })
      });
      const data = await response.json();
      post.content = data.content;
      post.metaDescription = data.metaDescriptions[0];

      // Generate image prompts
      const imagePrompts = await generateImagePrompts(post.content);

      // Generate images
      const images = {
        intro: await generateImage(imagePrompts.intro_image_prompt),
        ingredients: await generateImage(imagePrompts.ingredients_image_prompt),
        recipe: await generateImage(imagePrompts.final_recipe_image_prompt)
      };

      // Convert images to WebP
      const webpImages = {
        intro: await processImage(images.intro),
        ingredients: await processImage(images.ingredients),
        recipe: await processImage(images.recipe)
      };

      post.images = webpImages;

      // Set default category and status
      post.category = 'recipes';
      post.status = 'draft';

      return post;
    } catch (error) {
      console.error('Error processing post:', error);
      throw error;
    }
  };

  const startBulkPublish = useCallback(async () => {
    if (processing || posts.length === 0) return;

    setProcessing(true);
    setProgress({ current: 0, total: posts.length });

    try {
      for (let i = 0; i < posts.length; i++) {
        const processedPost = await processPost(posts[i]);
        
        // Publish to WordPress
        await fetch('/api/publish-to-wordpress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(processedPost)
        });

        setProgress(prev => ({ ...prev, current: i + 1 }));
      }
    } catch (error) {
      console.error('Error in bulk publishing:', error);
    } finally {
      setProcessing(false);
    }
  }, [posts, processing]);

  return (
    <div className="bulk-publish">
      <input
        type="file"
        accept=".csv,.xlsx"
        onChange={handleFileUpload}
        disabled={processing}
      />
      <button
        onClick={startBulkPublish}
        disabled={processing || posts.length === 0}
        className="bulk-publish-button"
      >
        1 Click Bulk Publish
      </button>
      {processing && (
        <div className="progress">
          Processing {progress.current} of {progress.total} posts...
        </div>
      )}
    </div>
  );
};