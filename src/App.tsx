import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { BulkPublishButton } from './components/BulkPublishButton';
import './App.css';

function App() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!title || !focusKeyword) return;
    setIsGenerating(true);
    // Your existing generation logic here
    setIsGenerating(false);
  };

  return (
    <div className="app-container">
      <div className="content-container">
        <section className="hero-section">
          <h1 className="hero-title">AI SEO Blog Generator</h1>
          <p className="hero-subtitle">
            Create SEO-optimized blog content with AI-powered insights and automated image generation
          </p>
        </section>

        <main className="main-form">
          <div className="input-group">
            <label htmlFor="title" className="input-label">
              Recipe Title
            </label>
            <input
              id="title"
              type="text"
              className="text-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your recipe title"
            />
          </div>

          <div className="input-group">
            <label htmlFor="focusKeyword" className="input-label">
              Focus Keyword
            </label>
            <input
              id="focusKeyword"
              type="text"
              className="text-input"
              value={focusKeyword}
              onChange={(e) => setFocusKeyword(e.target.value)}
              placeholder="Enter your focus keyword"
            />
          </div>

          <div className="button-container">
            <button
              className="primary-button"
              onClick={handleGenerate}
              disabled={isGenerating || !title || !focusKeyword}
            >
              {isGenerating ? 'Generating...' : 'Generate Blog Post'}
            </button>
            <BulkPublishButton />
          </div>

          {isGenerating && (
            <div className="progress-container">
              <p className="progress-text">Generating your blog post...</p>
            </div>
          )}

          <div className="editor-section">
            <div className="editor-container">
              {/* Your editor component goes here */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;