// News API configuration
const API_KEY = f04d631aaf934686aaa71da1de4f79f7; // You'll need to replace this with your actual API key
const BASE_URL = 'https://newsapi.org/v2';

// DOM Elements
const newsContainer = document.getElementById('newsContainer');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');

// Fetch news articles
async function fetchNews(query = '') {
    try {
        const url = query
            ? `${BASE_URL}/everything?q=${encodeURIComponent(query)}&apiKey=${API_KEY}`
            : `${BASE_URL}/top-headlines?country=us&apiKey=${API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'ok') {
            displayNews(data.articles);
        } else {
            throw new Error('Failed to fetch news');
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        newsContainer.innerHTML = '<p class="error">Failed to load news. Please try again later.</p>';
    }
}

// Display news articles
function displayNews(articles) {
    newsContainer.innerHTML = articles.map(article => `
        <article class="news-card">
            <img src="${article.urlToImage || 'https://via.placeholder.com/400x200?text=No+Image'}" 
                 alt="${article.title}" 
                 class="news-image">
            <div class="news-content">
                <h2 class="news-title">${article.title}</h2>
                <p class="news-description">${article.description || 'No description available.'}</p>
                <div class="news-meta">
                    <span>${new Date(article.publishedAt).toLocaleDateString()}</span>
                    <span>${article.source.name}</span>
                </div>
                <a href="${article.url}" target="_blank" class="read-more">Read More</a>
            </div>
        </article>
    `).join('');
}

// Event Listeners
searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
        fetchNews(query);
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            fetchNews(query);
        }
    }
});

// Initial load
fetchNews(); 