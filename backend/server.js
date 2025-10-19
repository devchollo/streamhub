const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// Remove trailing slash from FRONTEND_URL if it exists
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

// Middleware - CORS
app.use(cors({
  origin: [
    frontendUrl,
    'http://localhost:3000',
    'https://ani-stream-psi.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// API URLs
const CONSUMET_URL = process.env.CONSUMET_API_URL || 'https://api.consumet.org';
const MANGADEX_URL = 'https://api.mangadex.org';

// Helper function to handle API requests with retry
const fetchAPI = async (url, options = {}, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Fetching: ${url}`);
      const response = await axios.get(url, {
        timeout: 30000, // Increased to 30 seconds
        ...options
      });
      console.log(`Success: ${url}`);
      return response.data;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed for ${url}: ${error.message}`);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between retries
    }
  }
};

// Helper to get English title
const getEnglishTitle = (titleObj) => {
  if (typeof titleObj === 'string') return titleObj;
  if (typeof titleObj === 'object') {
    return titleObj.en || titleObj['en-us'] || titleObj.romaji || titleObj['ja-ro'] || Object.values(titleObj)[0] || 'Unknown Title';
  }
  return 'Unknown Title';
};

// ============= MANGA ROUTES =============

// Proxy for manga covers to avoid CORS
app.get('/api/manga/cover/:mangaId/:fileName', async (req, res) => {
  try {
    const { mangaId, fileName } = req.params;
    const imageUrl = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}`;
    
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    
    res.set('Content-Type', response.headers['content-type']);
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(response.data);
  } catch (error) {
    console.error('Cover proxy error:', error.message);
    res.status(404).send('Image not found');
  }
});

// Get recent manga from MangaDex
app.get('/api/manga/recent', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const data = await fetchAPI(`${MANGADEX_URL}/manga`, {
      params: {
        limit,
        offset,
        order: { latestUploadedChapter: 'desc' },
        includes: ['cover_art', 'author', 'artist'],
        contentRating: ['safe', 'suggestive'],
        hasAvailableChapters: true,
        availableTranslatedLanguage: ['en']
      }
    });

    const results = data.data.map(manga => {
      const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
      const coverFileName = coverArt?.attributes?.fileName;
      
      // Construct full backend URL for cover proxy
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      return {
        id: manga.id,
        title: getEnglishTitle(manga.attributes.title),
        description: manga.attributes.description?.en || 'No description available',
        image: coverFileName 
          ? `${baseUrl}/api/manga/cover/${manga.id}/${coverFileName}`
          : 'https://placehold.co/300x450/1f2937/6b7280?text=No+Cover',
        coverImage: coverFileName 
          ? `${baseUrl}/api/manga/cover/${manga.id}/${coverFileName}`
          : 'https://placehold.co/300x450/1f2937/6b7280?text=No+Cover',
        status: manga.attributes.status,
        year: manga.attributes.year,
        rating: manga.attributes.contentRating,
        tags: manga.attributes.tags?.slice(0, 5).map(tag => tag.attributes.name.en) || []
      };
    });

    res.json({ results });
  } catch (error) {
    console.error('Manga recent error:', error.message);
    res.status(500).json({ error: 'Failed to fetch recent manga', message: error.message });
  }
});

// Search manga
app.get('/api/manga/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const data = await fetchAPI(`${MANGADEX_URL}/manga`, {
      params: {
        title: q,
        limit,
        includes: ['cover_art', 'author', 'artist'],
        contentRating: ['safe', 'suggestive'],
        hasAvailableChapters: true,
        availableTranslatedLanguage: ['en']
      }
    });

    const results = data.data.map(manga => {
      const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
      const coverFileName = coverArt?.attributes?.fileName;
      
      // Construct full backend URL for cover proxy
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      return {
        id: manga.id,
        title: getEnglishTitle(manga.attributes.title),
        description: manga.attributes.description?.en || 'No description available',
        image: coverFileName 
          ? `${baseUrl}/api/manga/cover/${manga.id}/${coverFileName}`
          : 'https://placehold.co/300x450/1f2937/6b7280?text=No+Cover',
        coverImage: coverFileName 
          ? `${baseUrl}/api/manga/cover/${manga.id}/${coverFileName}`
          : 'https://placehold.co/300x450/1f2937/6b7280?text=No+Cover',
        status: manga.attributes.status,
        year: manga.attributes.year,
        rating: manga.attributes.contentRating
      };
    });

    res.json({ results });
  } catch (error) {
    console.error('Manga search error:', error.message);
    res.status(500).json({ error: 'Failed to search manga', message: error.message });
  }
});

// Get manga info
app.get('/api/manga/:id/info', async (req, res) => {
  try {
    const { id } = req.params;

    const data = await fetchAPI(`${MANGADEX_URL}/manga/${id}`, {
      params: {
        includes: ['cover_art', 'author', 'artist']
      }
    });

    const manga = data.data;
    const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
    const coverFileName = coverArt?.attributes?.fileName;
    
    // Construct full backend URL for cover proxy
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.json({
      id: manga.id,
      title: getEnglishTitle(manga.attributes.title),
      description: manga.attributes.description?.en || 'No description available',
      image: coverFileName 
        ? `${baseUrl}/api/manga/cover/${manga.id}/${coverFileName}`
        : 'https://placehold.co/300x450/1f2937/6b7280?text=No+Cover',
      status: manga.attributes.status,
      year: manga.attributes.year,
      tags: manga.attributes.tags?.map(tag => tag.attributes.name.en) || []
    });
  } catch (error) {
    console.error('Manga info error:', error.message);
    res.status(500).json({ error: 'Failed to fetch manga info', message: error.message });
  }
});

// Get manga chapters
app.get('/api/manga/:id/chapters', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 500, offset = 0 } = req.query;

    const data = await fetchAPI(`${MANGADEX_URL}/manga/${id}/feed`, {
      params: {
        limit,
        offset,
        translatedLanguage: ['en'],
        order: { chapter: 'asc' },
        includeFutureUpdates: '0'
      }
    });

    const chapters = data.data
      .filter(ch => ch.attributes.chapter) // Filter out chapters without numbers
      .map(chapter => ({
        id: chapter.id,
        chapter: chapter.attributes.chapter,
        title: chapter.attributes.title || `Chapter ${chapter.attributes.chapter}`,
        pages: chapter.attributes.pages,
        publishAt: chapter.attributes.publishAt
      }))
      .sort((a, b) => parseFloat(a.chapter) - parseFloat(b.chapter)); // Sort numerically

    res.json({ chapters });
  } catch (error) {
    console.error('Chapters error:', error.message);
    res.status(500).json({ error: 'Failed to fetch chapters', message: error.message });
  }
});

// Get chapter pages
app.get('/api/manga/chapter/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;

    const chapterData = await fetchAPI(`${MANGADEX_URL}/at-home/server/${chapterId}`);
    
    const baseUrl = chapterData.baseUrl;
    const chapterHash = chapterData.chapter.hash;
    const pages = chapterData.chapter.data;

    const pageUrls = pages.map(page => 
      `${baseUrl}/data/${chapterHash}/${page}`
    );

    res.json({ pages: pageUrls });
  } catch (error) {
    console.error('Chapter pages error:', error.message);
    res.status(500).json({ error: 'Failed to fetch chapter pages', message: error.message });
  }
});

// ============= ANIME ROUTES =============

// Get recent anime with multiple fallbacks
app.get('/api/anime/recent', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    
    let data = null;
    const providers = ['gogoanime', 'zoro'];
    
    for (const provider of providers) {
      try {
        data = await fetchAPI(`${CONSUMET_URL}/anime/${provider}/recent-episodes`, {
          params: { page }
        });
        if (data?.results && Array.isArray(data.results) && data.results.length > 0) {
          break;
        }
      } catch (err) {
        console.log(`${provider} failed, trying next...`);
      }
    }

    // Safely handle response
    if (!data || !data.results || !Array.isArray(data.results)) {
      console.log('No anime results found from any provider');
      return res.json({ results: [] });
    }

    const results = data.results.map(anime => ({
      id: anime.id || '',
      title: anime.title || 'Unknown Title',
      image: anime.image || 'https://placehold.co/300x450/1f2937/6b7280?text=No+Image',
      episodeNumber: anime.episodeNumber || anime.episode || 1,
      url: anime.url || ''
    }));

    res.json({ results });
  } catch (error) {
    console.error('Anime recent error:', error.message);
    res.json({ results: [] }); // Return empty instead of error
  }
});

// Search anime
app.get('/api/anime/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    let data = null;
    const providers = ['gogoanime', 'zoro'];
    
    for (const provider of providers) {
      try {
        data = await fetchAPI(`${CONSUMET_URL}/anime/${provider}/${encodeURIComponent(q)}`);
        if (data?.results && Array.isArray(data.results) && data.results.length > 0) {
          break;
        }
      } catch (err) {
        console.log(`${provider} search failed, trying next...`);
      }
    }

    if (!data || !data.results || !Array.isArray(data.results)) {
      return res.json({ results: [] });
    }

    const results = data.results.map(anime => ({
      id: anime.id || '',
      title: anime.title || 'Unknown Title',
      image: anime.image || 'https://placehold.co/300x450/1f2937/6b7280?text=No+Image',
      releaseDate: anime.releaseDate || '',
      subOrDub: anime.subOrDub || 'sub',
      status: anime.status || 'Unknown'
    }));

    res.json({ results });
  } catch (error) {
    console.error('Anime search error:', error.message);
    res.json({ results: [] });
  }
});

// Get anime info and episodes
app.get('/api/anime/:id/episodes', async (req, res) => {
  try {
    const { id } = req.params;

    let data;
    const providers = ['gogoanime', 'zoro'];
    
    for (const provider of providers) {
      try {
        data = await fetchAPI(`${CONSUMET_URL}/anime/${provider}/info/${id}`);
        if (data) break;
      } catch (err) {
        console.log(`${provider} info failed, trying next...`);
      }
    }

    if (!data) {
      return res.status(404).json({ error: 'Anime not found' });
    }

    res.json({
      id: data.id,
      title: data.title,
      description: data.description,
      image: data.image,
      episodes: data.episodes || []
    });
  } catch (error) {
    console.error('Episodes error:', error.message);
    res.status(500).json({ error: 'Failed to fetch episodes', message: error.message });
  }
});

// Get streaming links for episode
app.get('/api/anime/watch/:episodeId', async (req, res) => {
  try {
    const { episodeId } = req.params;
    const { server = 'gogocdn' } = req.query;

    let data;
    try {
      data = await fetchAPI(`${CONSUMET_URL}/anime/gogoanime/watch/${episodeId}`, {
        params: { server }
      });
    } catch (error) {
      data = await fetchAPI(`${CONSUMET_URL}/anime/zoro/watch`, {
        params: { episodeId }
      });
    }

    res.json({
      sources: data.sources || [],
      download: data.download,
      subtitles: data.subtitles || []
    });
  } catch (error) {
    console.error('Watch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch streaming links', message: error.message });
  }
});

// ============= MOVIE ROUTES =============

// Get trending/popular movies
app.get('/api/movie/recent', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    
    let data = null;
    try {
      data = await fetchAPI(`${CONSUMET_URL}/movies/flixhq/trending`, {
        params: { page }
      });
    } catch (err) {
      // Fallback to popular
      try {
        data = await fetchAPI(`${CONSUMET_URL}/movies/flixhq/popular`, {
          params: { page }
        });
      } catch (err2) {
        console.log('Both trending and popular failed');
      }
    }

    if (!data || !data.results || !Array.isArray(data.results)) {
      console.log('No movie results found');
      return res.json({ results: [] });
    }

    const results = data.results.map(movie => ({
      id: movie.id || '',
      title: movie.title || 'Unknown Title',
      image: movie.image || 'https://placehold.co/300x450/1f2937/6b7280?text=No+Image',
      releaseDate: movie.releaseDate || '',
      type: movie.type || 'Movie'
    }));

    res.json({ results });
  } catch (error) {
    console.error('Movie recent error:', error.message);
    res.json({ results: [] });
  }
});

// Search movies
app.get('/api/movie/search', async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const data = await fetchAPI(`${CONSUMET_URL}/movies/flixhq/${encodeURIComponent(q)}`, {
      params: { page }
    });

    if (!data || !data.results || !Array.isArray(data.results)) {
      return res.json({ results: [] });
    }

    const results = data.results.map(movie => ({
      id: movie.id || '',
      title: movie.title || 'Unknown Title',
      image: movie.image || 'https://placehold.co/300x450/1f2937/6b7280?text=No+Image',
      releaseDate: movie.releaseDate || '',
      type: movie.type || 'Movie'
    }));

    res.json({ results });
  } catch (error) {
    console.error('Movie search error:', error.message);
    res.json({ results: [] });
  }
});

// Get movie info
app.get('/api/movie/:id/episodes', async (req, res) => {
  try {
    const { id } = req.params;

    const data = await fetchAPI(`${CONSUMET_URL}/movies/flixhq/info`, {
      params: { id }
    });

    res.json({
      id: data.id,
      title: data.title,
      description: data.description,
      image: data.image,
      releaseDate: data.releaseDate,
      episodes: data.episodes || []
    });
  } catch (error) {
    console.error('Movie info error:', error.message);
    res.status(500).json({ error: 'Failed to fetch movie info', message: error.message });
  }
});

// Get movie streaming links
app.get('/api/movie/watch/:episodeId', async (req, res) => {
  try {
    const { episodeId } = req.params;
    const { mediaId } = req.query;

    const data = await fetchAPI(`${CONSUMET_URL}/movies/flixhq/watch`, {
      params: { 
        episodeId,
        mediaId
      }
    });

    res.json({
      sources: data.sources || [],
      subtitles: data.subtitles || []
    });
  } catch (error) {
    console.error('Movie watch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch movie streaming links', message: error.message });
  }
});

// ============= HEALTH CHECK =============
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test Consumet API connection
app.get('/api/test/consumet', async (req, res) => {
  const tests = {
    anime_gogoanime: false,
    anime_zoro: false,
    movie_flixhq: false
  };

  // Test GogoAnime
  try {
    const data = await fetchAPI(`${CONSUMET_URL}/anime/gogoanime/recent-episodes?page=1`, {}, 1);
    tests.anime_gogoanime = !!data?.results?.length;
  } catch (e) {
    console.error('GogoAnime test failed:', e.message);
  }

  // Test Zoro
  try {
    const data = await fetchAPI(`${CONSUMET_URL}/anime/zoro/recent-episodes?page=1`, {}, 1);
    tests.anime_zoro = !!data?.results?.length;
  } catch (e) {
    console.error('Zoro test failed:', e.message);
  }

  // Test FlixHQ
  try {
    const data = await fetchAPI(`${CONSUMET_URL}/movies/flixhq/trending?page=1`, {}, 1);
    tests.movie_flixhq = !!data?.results?.length;
  } catch (e) {
    console.error('FlixHQ test failed:', e.message);
  }

  res.json({
    consumet_url: CONSUMET_URL,
    tests,
    working: Object.values(tests).some(v => v)
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'StreamHub API is running!', version: '1.0.0' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: ${frontendUrl}`);
});

module.exports = app;