import React, { useState, useEffect } from 'react';
import { Search, Play, Book, Film, ChevronLeft, ChevronRight, X, Clock, Star, Calendar } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Skeleton Card Component
const SkeletonCard = () => (
  <div className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
    <div className="w-full h-64 bg-gray-700"></div>
    <div className="p-4">
      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
    </div>
  </div>
);

// Helper function to safely get title
const getTitle = (item, type) => {
  if (!item) return 'Unknown';
  
  if (type === 'manga') {
    if (typeof item.title === 'string') return item.title;
    if (typeof item.title === 'object') {
      return item.title.en || item.title['en-us'] || item.title.romaji || item.title['ja-ro'] || Object.values(item.title)[0] || 'Unknown Title';
    }
  }
  
  return item.title || item.name || 'Unknown';
};

// Helper function to safely get description
const getDescription = (item) => {
  if (!item) return 'No description available.';
  
  if (typeof item.description === 'string') return item.description;
  if (typeof item.description === 'object') {
    return item.description.en || item.description['en-us'] || Object.values(item.description)[0] || 'No description available.';
  }
  
  return 'No description available.';
};

// Media Card Component
const MediaCard = ({ item, type, onClick }) => {
  const [imgError, setImgError] = useState(false);
  
  const getImage = () => {
    if (imgError) return 'https://via.placeholder.com/300x400?text=No+Image';
    if (type === 'manga') return item.image || item.coverImage;
    return item.image || item.cover;
  };

  return (
    <div 
      onClick={onClick}
      className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/30 group"
    >
      <div className="relative overflow-hidden">
        <img 
          src={getImage()}
          alt={getTitle(item, type)}
          onError={() => setImgError(true)}
          className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
          <button className="bg-cyan-500 text-white px-4 py-2 rounded-full flex items-center gap-2 font-semibold">
            {type === 'manga' ? <Book size={18} /> : <Play size={18} />}
            {type === 'manga' ? 'Read' : 'Watch'}
          </button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white line-clamp-2 mb-2">{getTitle(item, type)}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          {item.releaseDate && (
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {item.releaseDate}
            </span>
          )}
          {item.rating && (
            <span className="flex items-center gap-1">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              {typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Detail Modal Component
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative">
          <img 
            src={item.image || item.cover || item.coverImage}
            alt={getTitle(item, type)}
            className="w-full h-72 object-cover rounded-t-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 -mt-20 relative z-10">
          <h2 className="text-3xl font-bold text-white mb-4">{getTitle(item, type)}</h2>
          
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            {item.releaseDate && (
              <span className="flex items-center gap-2 text-gray-300">
                <Calendar size={16} />
                {item.releaseDate}
              </span>
            )}
            {item.rating && (
              <span className="flex items-center gap-2 text-yellow-400">
                <Star size={16} className="fill-yellow-400" />
                {typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating}
              </span>
            )}
            {item.status && (
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full">
                {item.status}
              </span>
            )}
          </div>

          <p className="text-gray-300 mb-6 leading-relaxed">
            {getDescription(item)}
          </p>

          {(type === 'anime' || type === 'movie') && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Episodes</h3>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : episodes.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                  {episodes.map((ep, idx) => (
                    <button
                      key={idx}
                      onClick={() => onEpisodeSelect(ep, idx)}
                      className="bg-gray-800 hover:bg-cyan-600 text-white px-4 py-3 rounded-lg transition-colors font-medium"
                    >
                      EP {ep.number || idx + 1}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No episodes available</p>
              )}
            </div>
          )}

          {type === 'manga' && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Chapters</h3>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : chapters.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                  {chapters.map((ch, idx) => (
                    <button
                      key={idx}
                      onClick={() => onChapterSelect(ch, idx)}
                      className="bg-gray-800 hover:bg-cyan-600 text-white px-4 py-3 rounded-lg transition-colors font-medium"
                    >
                      Ch {ch.chapter || idx + 1}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No chapters available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Video Player Component
const VideoPlayer = ({ episodeUrl, episodeNumber, totalEpisodes, onNext, onPrev, onBack }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="h-full flex flex-col">
        <div className="bg-gray-900 p-4 flex items-center justify-between">
          <button onClick={onBack} className="text-white hover:text-cyan-400 transition-colors">
            <X size={28} />
          </button>
          <h3 className="text-white font-semibold">Episode {episodeNumber}</h3>
          <div className="flex gap-2">
            <button 
              onClick={onPrev}
              disabled={episodeNumber === 1}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              Prev
            </button>
            <button 
              onClick={onNext}
              disabled={episodeNumber === totalEpisodes}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-black">
          <video 
            controls 
            autoPlay
            className="w-full h-full"
            src={episodeUrl}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  );
};

// Manga Reader Component
const MangaReader = ({ chapterId, chapterNumber, totalChapters, onNext, onPrev, onBack }) => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPages();
  }, [chapterId]);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/manga/chapter/${chapterId}`);
      const data = await res.json();
      setPages(data.pages || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="h-full flex flex-col">
        <div className="bg-gray-900 p-4 flex items-center justify-between">
          <button onClick={onBack} className="text-white hover:text-cyan-400 transition-colors">
            <X size={28} />
          </button>
          <h3 className="text-white font-semibold">Chapter {chapterNumber}</h3>
          <div className="flex gap-2">
            <button 
              onClick={onPrev}
              disabled={chapterNumber === 1}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              Prev
            </button>
            <button 
              onClick={onNext}
              disabled={chapterNumber === totalChapters}
              className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-950">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-white text-lg">Loading pages...</div>
            </div>
          ) : pages.length > 0 ? (
            <div className="max-w-4xl mx-auto py-4">
              {pages.map((page, idx) => (
                <img 
                  key={idx}
                  src={page}
                  alt={`Page ${idx + 1}`}
                  className="w-full mb-2"
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-white text-lg">No pages available</div>
            </div>
          )}
        </div>
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
    if (!searchQuery.trim()) return;
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

  const handleEpisodeSelect = async (episode, index) => {
    try {
      const res = await fetch(`${API_URL}/anime/watch/${episode.id}`);
      const data = await res.json();
      setCurrentPlayer({
        type: 'video',
        url: data.sources?.[0]?.url,
        number: index + 1,
        total: animeList.length
      });
      setShowDetail(false);
    } catch (err) {
      console.error('Failed to load episode:', err);
    }
  };

  const handleChapterSelect = (chapter, index) => {
    setCurrentPlayer({
      type: 'manga',
      chapterId: chapter.id,
      number: index + 1,
      total: mangaList.length
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
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              StreamHub
            </h1>
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-md">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search..."
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              </div>
              <button 
                onClick={handleSearch}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
              >
                Search
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('manga')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'manga' 
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/50' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Book size={20} />
              Manga
            </button>
            <button
              onClick={() => setActiveTab('anime')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'anime' 
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/50' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Play size={20} />
              Anime
            </button>
            <button
              onClick={() => setActiveTab('movie')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'movie' 
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/50' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Film size={20} />
              Movies
            </button>
          </div>
        </div>
      </header>

      {/* Content Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
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
            <div className="col-span-full text-center text-gray-400 py-20">
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
          episodeNumber={currentPlayer.number}
          totalEpisodes={currentPlayer.total}
          onNext={() => {/* Handle next */}}
          onPrev={() => {/* Handle prev */}}
          onBack={() => setCurrentPlayer(null)}
        />
      )}

      {/* Manga Reader */}
      {currentPlayer?.type === 'manga' && (
        <MangaReader 
          chapterId={currentPlayer.chapterId}
          chapterNumber={currentPlayer.number}
          totalChapters={currentPlayer.total}
          onNext={() => {/* Handle next */}}
          onPrev={() => {/* Handle prev */}}
          onBack={() => setCurrentPlayer(null)}
        />
      )}
    </div>
  );
}