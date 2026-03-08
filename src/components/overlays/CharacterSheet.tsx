import { useState, useCallback } from 'react';
import CharSheetPage1 from './CharSheetPage1';
import CharSheetPage2 from './CharSheetPage2';
import CharSheetPage3 from './CharSheetPage3';
import CharSheetPage4 from './CharSheetPage4';
interface CharacterSheetProps {
  onClose: () => void;
}

const TOTAL_PAGES = 5;

const CharacterSheet = ({ onClose }: CharacterSheetProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [animClass, setAnimClass] = useState('');

  const goToPage = useCallback((page: number) => {
    if (page === currentPage || page > 3) return;
    setAnimClass('page-exit');
    setTimeout(() => {
      setCurrentPage(page);
      setAnimClass('page-enter');
      setTimeout(() => setAnimClass(''), 200);
    }, 150);
  }, [currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case 1: return <CharSheetPage1 />;
      case 2: return <CharSheetPage2 />;
      case 3: return <CharSheetPage3 />;
      default: return null;
    }
  };

  return (
    <div className="char-sheet-overlay">
      {/* Header */}
      <div className="char-sheet-header">
        <span style={{ fontSize: 11, color: 'hsl(var(--text-dim))' }}>// CHARACTER SHEET</span>
        <span className="font-display text-glow-bright" style={{ fontSize: 20, color: 'hsl(var(--accent-bright))' }}>
          VOID_SIGNAL
        </span>
        <button className="topbar-btn" onClick={onClose} style={{ fontSize: 11 }}>[ × CLOSE ]</button>
      </div>

      {/* Page content */}
      <div className="char-sheet-content" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div className={animClass} style={{ height: '100%', overflow: 'hidden' }}>
          {renderPage()}
        </div>
      </div>

      {/* Page nav */}
      <div className="char-sheet-nav">
        {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            className={`char-sheet-page-btn ${page === currentPage ? 'active' : ''} ${page > 3 ? 'disabled' : ''}`}
            onClick={() => goToPage(page)}
            disabled={page > 3}
          >
            {page}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CharacterSheet;
