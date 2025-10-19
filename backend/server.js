const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// Remove trailing slash from FRONTEND_URL if it exists
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

// Middleware - FIXED CORS
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

// Consumet API base URL (your self-hosted instance on Render)
const CONSUMET_URL = process.env.CONSUMET_API_URL || 'https://api.consumet.org';
const MANGADEX_URL = 'https://api.mangadex.org';

// Helper function to handle API requests
const fetchAPI = async (url, options = {}) => {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      ...options
    });
    return response.data;
  } catch (error) {
    console.error(`API Error: ${error.message}`);
    throw error;
  }
};

// ============= MANGA ROUTES =============

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
        hasAvailableChapters: true
      }
    });

    const results = data.data.map(manga => {
      const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
      const coverFileName = coverArt?.attributes?.fileName;
      
      return {
        id: manga.id,
        title: manga.attributes.title,
        description: manga.attributes.description?.en || manga.attributes.description || 'No description available',
        image: coverFileName 
          ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.512.jpg`
          : 'https://via.placeholder.com/300x400?text=No+Cover',
        coverImage: coverFileName 
          ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.512.jpg`
          : 'https://via.placeholder.com/300x400?text=No+Cover',
        status: manga.attributes.status,
        year: manga.attributes.year,
        rating: manga.attributes.contentRating,
        tags: manga.attributes.tags?.slice(0, 5).map(tag => tag.attributes.name.en) || []
      };
    });

    res.json({ results });
  } catch (error) {
    console.error('Manga recent error:', error);
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
        hasAvailableChapters: true
      }
    });

    const results = data.data.map(manga => {
      const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
      const coverFileName = coverArt?.attributes?.fileName;
      
      return {
        id: manga.id,
        title: manga.attributes.title,
        description: manga.attributes.description?.en || manga.attributes.description || 'No description available',
        image: coverFileName 
          ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.512.jpg`
          : 'https://via.placeholder.com/300x400?text=No+Cover',
        coverImage: coverFileName 
          ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.512.jpg`
          : 'https://via.placeholder.com/300x400?text=No+Cover',
        status: manga.attributes.status,
        year: manga.attributes.year,
        rating: manga.attributes.contentRating
      };
    });

    res.json({ results });
  } catch (error) {
    console.error('Manga search error:', error);
    res.status(500).json({ error: 'Failed to search manga', message: error.message });
  }
});

// Get manga chapters
app.get('/api/manga/:id/chapters', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const data = await fetchAPI(`${MANGADEX_URL}/manga/${id}/feed`, {
      params: {
        limit,
        offset,
        translatedLanguage: ['en'],
        order: { chapter: 'asc' },
        includeFutureUpdates: '0'
      }
    });

    const chapters = data.data.map(chapter => ({
      id: chapter.id,
      chapter: chapter.attributes.chapter,
      title: chapter.attributes.title || `Chapter ${chapter.attributes.chapter}`,
      pages: chapter.attributes.pages,
      publishAt: chapter.attributes.publishAt
    }));

    res.json({ chapters });
  } catch (error) {
    console.error('Chapters error:', error);
    res.status(500).json({ error: 'Failed to fetch chapters', message: error.message });
  }
});

// Get chapter pages
app.get('/api/manga/chapter/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;

    // Get chapter info first
    const chapterData = await fetchAPI(`${MANGADEX_URL}/at-home/server/${chapterId}`);
    
    const baseUrl = chapterData.baseUrl;
    const chapterHash = chapterData.chapter.hash;
    const pages = chapterData.chapter.data;

    // Construct full URLs for each page
    const pageUrls = pages.map(page => 
      `${baseUrl}/data/${chapterHash}/${page}`
    );

    res.json({ pages: pageUrls });
  } catch (error) {
    console.error('Chapter pages error:', error);
    res.status(500).json({ error: 'Failed to fetch chapter pages', message: error.message });
  }
});

// ============= ANIME ROUTES =============

// Get recent anime (using GogoAnime via Consumet)
app.get('/api/anime/recent', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    
    // Try GogoAnime first, fallback to Zoro
    let data;
    try {
      data = await fetchAPI(`${CONSUMET_URL}/anime/gogoanime/recent-episodes`, {
        params: { page }
      });
    } catch (error) {
      console.log('GogoAnime failed, trying Zoro...');
      data = await fetchAPI(`${CONSUMET_URL}/anime/zoro/recent-episodes`, {
        params: { page }
      });
    }

    const results = data.results.map(anime => ({
      id: anime.id,
      title: anime.title,
      image: anime.image,
      episodeNumber: anime.episodeNumber,
      url: anime.url
    }));

    res.json({ results });
  } catch (error) {
    console.error('Anime recent error:', error);
    res.status(500).json({ error: 'Failed to fetch recent anime', message: error.message });
  }
});

// Search anime
app.get('/api/anime/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Try GogoAnime first
    let data;
    try {
      data = await fetchAPI(`${CONSUMET_URL}/anime/gogoanime/${encodeURIComponent(q)}`);
    } catch (error) {
      console.log('GogoAnime search failed, trying Zoro...');
      data = await fetchAPI(`${CONSUMET_URL}/anime/zoro/${encodeURIComponent(q)}`);
    }

    const results = data.results.map(anime => ({
      id: anime.id,
      title: anime.title,
      image: anime.image,
      releaseDate: anime.releaseDate,
      subOrDub: anime.subOrDub,
      status: anime.status
    }));

    res.json({ results });
  } catch (error) {
    console.error('Anime search error:', error);
    res.status(500).json({ error: 'Failed to search anime', message: error.message });
  }
});

// Get anime info and episodes
app.get('/api/anime/:id/episodes', async (req, res) => {
  try {
    const { id } = req.params;

    let data;
    try {
      data = await fetchAPI(`${CONSUMET_URL}/anime/gogoanime/info/${id}`);
    } catch (error) {
      console.log('GogoAnime info failed, trying Zoro...');
      data = await fetchAPI(`${CONSUMET_URL}/anime/zoro/info/${id}`);
    }

    res.json({
      id: data.id,
      title: data.title,
      description: data.description,
      image: data.image,
      episodes: data.episodes || []
    });
  } catch (error) {
    console.error('Episodes error:', error);
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
      console.log('GogoAnime watch failed, trying Zoro...');
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
    console.error('Watch error:', error);
    res.status(500).json({ error: 'Failed to fetch streaming links', message: error.message });
  }
});

// ============= MOVIE ROUTES =============

// Get recent movies (using Flixhq via Consumet) - FIXED
app.get('/api/movie/recent', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    
    // Try trending movies instead of recent
    const data = await fetchAPI(`${CONSUMET_URL}/movies/flixhq/trending`, {
      params: { page }
    });

    const results = data.results.map(movie => ({
      id: movie.id,
      title: movie.title,
      image: movie.image,
      releaseDate: movie.releaseDate,
      type: movie.type
    }));

    res.json({ results });
  } catch (error) {
    console.error('Movie recent error:', error.message);
    // Return empty array instead of error to prevent frontend crash
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

    const results = data.results.map(movie => ({
      id: movie.id,
      title: movie.title,
      image: movie.image,
      releaseDate: movie.releaseDate,
      type: movie.type
    }));

    res.json({ results });
  } catch (error) {
    console.error('Movie search error:', error);
    res.status(500).json({ error: 'Failed to search movies', message: error.message });
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
    console.error('Movie info error:', error);
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
    console.error('Movie watch error:', error);
    res.status(500).json({ error: 'Failed to fetch movie streaming links', message: error.message });
  }
});

// ============= HEALTH CHECK =============
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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