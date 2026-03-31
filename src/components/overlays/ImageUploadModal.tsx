import { useState, useRef } from 'react';
import { getDB } from '@/lib/db';
import { useQueryClient } from '@tanstack/react-query';

interface ImageUploadModalProps {
  currentImage: string | null | undefined;
  onClose: () => void;
}

const ImageUploadModal = ({ currentImage, onClose }: ImageUploadModalProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mono = "'IBM Plex Mono', monospace";
  const acc = 'hsl(var(--accent))';
  const accDim = 'hsl(var(--accent-dim))';
  const dim = 'hsl(var(--text-dim))';
  const bgT = 'hsl(var(--bg-tertiary))';
  const bgP = 'hsl(var(--bg-primary))';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, GIF, etc.)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!preview) return;
    setUploading(true);
    setError(null);

    try {
      const db = await getDB();
      await db.exec(`UPDATE profile SET avatar = '${preview.replace(/'/g, "''")}' WHERE id = 1;`);
      queryClient.invalidateQueries({ queryKey: ['operator'] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save image');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setUploading(true);
    try {
      const db = await getDB();
      await db.exec(`UPDATE profile SET avatar = NULL WHERE id = 1;`);
      queryClient.invalidateQueries({ queryKey: ['operator'] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete image');
    } finally {
      setUploading(false);
    }
  };

  const displayImage = preview || currentImage;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: bgP,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: mono,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        height: 56,
        flexShrink: 0,
        borderBottom: `1px solid ${accDim}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
      }}>
        <span style={{ fontSize: 11, color: accDim, letterSpacing: 2 }}>// DOCS</span>
        <span style={{ fontFamily: "'VT323', monospace", fontSize: 22, color: acc }}>AVATAR</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: `1px solid ${accDim}`,
            color: dim,
            fontFamily: mono,
            fontSize: 10,
            cursor: 'pointer',
            padding: '6px 12px',
            letterSpacing: 1,
          }}
        >
          [ CLOSE ]
        </button>
      </div>

      <div style={{
        width: '100%',
        maxWidth: 400,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}>
        <div style={{
          width: 180,
          height: 180,
          border: `2px solid ${acc}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: bgT,
          overflow: 'hidden',
        }}>
          {displayImage ? (
            <img 
              src={displayImage} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ color: dim, fontSize: 12 }}>No image</span>
          )}
        </div>

        <div style={{ 
          padding: 12, 
          border: `1px solid ${accDim}`, 
          background: bgT,
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <div style={{ fontSize: 10, color: acc, marginBottom: 8 }}>UPLOAD INSTRUCTIONS</div>
          <div style={{ fontSize: 9, color: dim, lineHeight: 1.6 }}>
            • Recommended: Square image (e.g. 500x500)<br/>
            • Formats: JPG, PNG, GIF, WebP<br/>
            • Max size: 2MB<br/>
            • Will be cropped to fit
          </div>
        </div>

        {error && (
          <div style={{ 
            padding: '8px 12px', 
            border: '1px solid #ff4444', 
            background: 'rgba(255,68,68,0.1)',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            <span style={{ fontSize: 10, color: '#ff4444' }}>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'transparent',
              border: `1px solid ${acc}`,
              color: acc,
              fontFamily: mono,
              fontSize: 10,
              cursor: uploading ? 'not-allowed' : 'pointer',
              letterSpacing: 1,
            }}
          >
            {preview ? '[ CHANGE ]' : '[ UPLOAD ]'}
          </button>

          {displayImage && (
            <button
              onClick={handleDelete}
              disabled={uploading}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'transparent',
                border: `1px solid ${accDim}`,
                color: dim,
                fontFamily: mono,
                fontSize: 10,
                cursor: uploading ? 'not-allowed' : 'pointer',
                letterSpacing: 1,
              }}
            >
              [ DELETE ]
            </button>
          )}
        </div>

        {preview && (
          <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 8 }}>
            <button
              onClick={() => { setPreview(null); setError(null); }}
              disabled={uploading}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'transparent',
                border: `1px solid ${accDim}`,
                color: dim,
                fontFamily: mono,
                fontSize: 10,
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >
              [ CANCEL ]
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'rgba(255,176,0,0.1)',
                border: `1px solid ${acc}`,
                color: acc,
                fontFamily: mono,
                fontSize: 10,
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >
              {uploading ? '[ SAVING... ]' : '[ SAVE ]'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploadModal;
