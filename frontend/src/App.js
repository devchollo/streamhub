import React, { useState, useEffect } from 'react';
import { Search, Play, Book, Film, ChevronLeft, ChevronRight, X, Calendar, Star, Menu } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Skeleton Card Component
const SkeletonCard = () => (
  <div className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
    <div className="w-full aspect-[2/3] bg-gray-700"></div>
    <div className="p-3">
      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
    </div>
  </div>
);

// Helper to get title
const getTitle = (item, type) => {
  if (!item) return 'Unknown';
  if (type === 'manga') {
    if (typeof item.title === 'string') return item.title;
    if (typeof item.title === 'object') {
      return item.title.en || item.title['en-us'] || item.title.romaji || Object.values(item.title)[0] || 'Unknown';
    }
  }
  return item.title || item.name || 'Unknown';
};

// Helper to get description
const getDescription = (item) => {
  if (!item) return 'No description available.';
  if (typeof item.description === 'string') return item.description;
  if (typeof item.description === 'object') {
    return item.description.en || item.description['en-us'] || Object.values(item.description)[0] || 'No description available.';
  }
  return 'No description available.';
};

// Media Card Component - Mobile Optimized
const MediaCard = ({ item, type, onClick }) => {
  const [imgError, setImgError] = useState(false);
  
  const getImage = () => {
    if (imgError) return 'https://via.placeholder.com/300x450?text=No+Image';
    if (type === 'manga') {
      // Use the backend proxy URL
      return item.image || item.coverImage || 'https://via.placeholder.com/300x450?text=No+Cover';
    }
    return item.image || item.cover || 'https://via.placeholder.com/300x450?text=No+Image';
  };

  return (
    <div 
      onClick={onClick}
      className="bg-gray-800 rounded-xl overflow-hidden cursor-pointer transform active:scale-95 transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/20"
    >
      <div className="relative overflow-hidden">
        <img 
          src={getImage()}
          alt={getTitle(item, type)}
          onError={() => setImgError(true)}
          className="w-full aspect-[2/3] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 hover:opacity-100 active:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-4">
          <button className="bg-cyan-500 text-white px-6 py-2.5 rounded-full flex items-center gap-2 font-semibold text-sm shadow-lg">
            {type === 'manga' ? <Book size={16} /> : <Play size={16} />}
            {type === 'manga' ? 'Read' : 'Watch'}
          </button>
        </div>
        {item.episodeNumber && (
          <div className="absolute top-2 right-2 bg-cyan-500 text-white px-2 py-1 rounded-md text-xs font-bold">
            EP {item.episodeNumber}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-white text-sm line-clamp-2 mb-1">{getTitle(item, type)}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {item.releaseDate && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {item.releaseDate}
            </span>
          )}
          {item.status && (
            <span className="px-2 py-0.5 bg-gray-700 rounded-full text-[10px]">
              {item.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Detail Modal Component - Mobile Optimized
const DetailModal = ({ item, type, onClose, onEpisodeSelect, onChapterSelect }) => {
  const [episodes, setEpisodes] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (type === 'anime' || type === 'movie') {
      fetchEpisodes();
    } else if (type === 'manga') {
      fetchChapters();
    }
  }, [item, type]);

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/anime/${item.id}/episodes`);
      const data = await res.json();
      setEpisodes(data.episodes || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/manga/${item.id}/chapters`);
      const data = await res.json();
      setChapters(data.chapters || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative">
          <img 
            src={item.image || item.cover || item.coverImage}
            alt={getTitle(item, type)}
            className="w-full h-56 sm:h-72 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white p-2.5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          {/* Swipe indicator for mobile */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-600 rounded-full sm:hidden"></div>
        </div>

        <div className="p-4 sm:p-6 -mt-16 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{getTitle(item, type)}</h2>
          
          <div className="flex flex-wrap gap-2 mb-4 text-xs sm:text-sm">
            {item.releaseDate && (
              <span className="flex items-center gap-1.5 text-gray-300 bg-gray-800 px-3 py-1.5 rounded-full">
                <Calendar size={14} />
                {item.releaseDate}
              </span>
            )}
            {item.rating && (
              <span className="flex items-center gap-1.5 text-yellow-400 bg-gray-800 px-3 py-1.5 rounded-full">
                <Star size={14} className="fill-yellow-400" />
                {typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating}
              </span>
            )}
            {item.status && (
              <span className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-full font-medium">
                {item.status}
              </span>
            )}
          </div>

          <p className="text-gray-300 text-sm sm:text-base mb-6 leading-relaxed line-clamp-4 sm:line-clamp-none">
            {getDescription(item)}
          </p>

          {(type === 'anime' || type === 'movie') && (
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 flex items-center gap-2">
                <Play size={20} className="text-cyan-500" />
                Episodes
              </h3>
              {loading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : episodes.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto">
                  {episodes.map((ep, idx) => (
                    <button
                      key={idx}
                      onClick={() => onEpisodeSelect(ep, idx, episodes)}
                      className="bg-gray-800 hover:bg-cyan-600 active:bg-cyan-700 text-white px-3 py-3 rounded-lg transition-colors font-medium text-sm"
                    >
                      {ep.number || idx + 1}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No episodes available</p>
              )}
            </div>
          )}

          {type === 'manga' && (
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 flex items-center gap-2">
                <Book size={20} className="text-cyan-500" />
                Chapters
              </h3>
              {loading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : chapters.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto">
                  {chapters.map((ch, idx) => (
                    <button
                      key={idx}
                      onClick={() => onChapterSelect(ch, idx, chapters)}
                      className="bg-gray-800 hover:bg-cyan-600 active:bg-cyan-700 text-white px-3 py-3 rounded-lg transition-colors font-medium text-sm"
                    >
                      {ch.chapter}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No chapters available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Video Player Component - Mobile Optimized
const VideoPlayer = ({ episodeUrl, currentEpisode, allEpisodes, onBack }) => {
  const currentIndex = allEpisodes.findIndex(ep => ep.id === currentEpisode.id);
  const episodeNumber = currentEpisode.number || currentIndex + 1;
  
  const handleNext = () => {
    if (currentIndex < allEpisodes.length - 1) {
      // Fetch next episode stream
      fetchEpisodeStream(allEpisodes[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      // Fetch previous episode stream
      fetchEpisodeStream(allEpisodes[currentIndex - 1]);
    }
  };

  const fetchEpisodeStream = async (episode) => {
    try {
      const res = await fetch(`${API_URL}/anime/watch/${episode.id}`);
      const data = await res.json();
      window.location.href = `#watch-${episode.id}`;
      window.location.reload(); // Simple reload to load new episode
    } catch (err) {
      console.error('Failed to load episode:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="bg-gray-900 p-3 sm:p-4 flex items-center justify-between gap-2">
        <button onClick={onBack} className="text-white hover:text-cyan-400 transition-colors p-1">
          <X size={24} />
        </button>
        <h3 className="text-white font-semibold text-sm sm:text-base flex-1 text-center truncate">
          Episode {episodeNumber}
        </h3>
        <div className="flex gap-1 sm:gap-2">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-1 text-sm"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Prev</span>
          </button>
          <button 
            onClick={handleNext}
            disabled={currentIndex === allEpisodes.length - 1}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-1 text-sm"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-black">
        <video 
          controls 
          autoPlay
          playsInline
          className="w-full h-full"
          src={episodeUrl}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

// Manga Reader Component - Mobile Optimized
const MangaReader = ({ currentChapter, allChapters, onBack }) => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentIndex = allChapters.findIndex(ch => ch.id === currentChapter.id);
  const chapterNumber = currentChapter.chapter || currentIndex + 1;

  useEffect(() => {
    fetchPages();
  }, [currentChapter.id]);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/manga/chapter/${currentChapter.id}`);
      const data = await res.json();
      setPages(data.pages || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleNext = () => {
    if (currentIndex < allChapters.length - 1) {
      window.location.href = `#chapter-${allChapters[currentIndex + 1].id}`;
      window.location.reload();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      window.location.href = `#chapter-${allChapters[currentIndex - 1].id}`;
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="bg-gray-900 p-3 sm:p-4 flex items-center justify-between gap-2 sticky top-0 z-10">
        <button onClick={onBack} className="text-white hover:text-cyan-400 transition-colors p-1">
          <X size={24} />
        </button>
        <h3 className="text-white font-semibold text-sm sm:text-base flex-1 text-center truncate">
          Chapter {chapterNumber}
        </h3>
        <div className="flex gap-1 sm:gap-2">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-1 text-sm"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Prev</span>
          </button>
          <button 
            onClick={handleNext}
            disabled={currentIndex === allChapters.length - 1}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-1 text-sm"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-950">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-white text-base">Loading pages...</div>
          </div>
        ) : pages.length > 0 ? (
          <div className="max-w-4xl mx-auto">
            {pages.map((page, idx) => (
              <img 
                key={idx}
                src={page}
                alt={`Page ${idx + 1}`}
                className="w-full"
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-white text-base">No pages available</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  const [activeTab, setActiveTab] = useState('manga');
  const [searchQuery, setSearchQuery] = useState('');
  const [mangaList, setMangaList] = useState([]);
  const [animeList, setAnimeList] = useState([]);
  const [movieList, setMovieList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(null);

  useEffect(() => {
    fetchContent();
  }, [activeTab]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      if (activeTab === 'manga') {
        const res = await fetch(`${API_URL}/manga/recent`);
        const data = await res.json();
        setMangaList(data.results || []);
      } else if (activeTab === 'anime') {
        const res = await fetch(`${API_URL}/anime/recent`);
        const data = await res.json();
        setAnimeList(data.results || []);
      } else if (activeTab === 'movie') {
        const res = await fetch(`${API_URL}/movie/recent`);
        const data = await res.json();
        setMovieList(data.results || []);
      }
    } catch (err) {
      console.error('Failed to fetch content:', err);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchContent();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/${activeTab}/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      if (activeTab === 'manga') setMangaList(data.results || []);
      else if (activeTab === 'anime') setAnimeList(data.results || []);
      else if (activeTab === 'movie') setMovieList(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
    }
    setLoading(false);
  };

  const handleCardClick = (item) => {
    setSelectedItem(item);
    setShowDetail(true);
  };

  const handleEpisodeSelect = async (episode, index, allEpisodes) => {
    try {
      const res = await fetch(`${API_URL}/anime/watch/${episode.id}`);
      const data = await res.json();
      setCurrentPlayer({
        type: 'video',
        url: data.sources?.[0]?.url,
        currentEpisode: episode,
        allEpisodes: allEpisodes
      });
      setShowDetail(false);
    } catch (err) {
      console.error('Failed to load episode:', err);
      alert('Failed to load episode. Please try again.');
    }
  };

  const handleChapterSelect = (chapter, index, allChapters) => {
    setCurrentPlayer({
      type: 'manga',
      currentChapter: chapter,
      allChapters: allChapters
    });
    setShowDetail(false);
  };

  const getCurrentList = () => {
    if (activeTab === 'manga') return mangaList;
    if (activeTab === 'anime') return animeList;
    return movieList;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header - Mobile Optimized */}
      <header className="bg-gray-900/95 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              StreamHub
            </h1>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search..."
                className="w-full bg-gray-800 text-white px-4 py-2.5 rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            </div>
            <button 
              onClick={handleSearch}
              className="bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white px-4 sm:px-6 py-2.5 rounded-lg transition-colors font-semibold text-sm whitespace-nowrap"
            >
              Search
            </button>
          </div>

          {/* Tabs - Mobile Scrollable */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('manga')}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
                activeTab === 'manga' 
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/50' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 active:bg-gray-600'
              }`}
            >
              <Book size={18} />
              Manga
            </button>
            <button
              onClick={() => setActiveTab('anime')}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
                activeTab === 'anime' 
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/50' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 active:bg-gray-600'
              }`}
            >
              <Play size={18} />
              Anime
            </button>
            <button
              onClick={() => setActiveTab('movie')}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
                activeTab === 'movie' 
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/50' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 active:bg-gray-600'
              }`}
            >
              <Film size={18} />
              Movies
            </button>
          </div>
        </div>
      </header>

      {/* Content Grid - Mobile Optimized */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
          {loading ? (
            [...Array(10)].map((_, i) => <SkeletonCard key={i} />)
          ) : getCurrentList().length > 0 ? (
            getCurrentList().map((item, idx) => (
              <MediaCard 
                key={idx}
                item={item}
                type={activeTab}
                onClick={() => handleCardClick(item)}
              />
            ))
          ) : (
            <div className="col-span-full text-center text-gray-400 py-20 text-sm sm:text-base">
              No content available
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {showDetail && selectedItem && (
        <DetailModal 
          item={selectedItem}
          type={activeTab}
          onClose={() => setShowDetail(false)}
          onEpisodeSelect={handleEpisodeSelect}
          onChapterSelect={handleChapterSelect}
        />
      )}

      {/* Video Player */}
      {currentPlayer?.type === 'video' && (
        <VideoPlayer 
          episodeUrl={currentPlayer.url}
          currentEpisode={currentPlayer.currentEpisode}
          allEpisodes={currentPlayer.allEpisodes}
          onBack={() => setCurrentPlayer(null)}
        />
      )}

      {/* Manga Reader */}
      {currentPlayer?.type === 'manga' && (
        <MangaReader 
          currentChapter={currentPlayer.currentChapter}
          allChapters={currentPlayer.allChapters}
          onBack={() => setCurrentPlayer(null)}
        />
      )}
    </div>
  );
}