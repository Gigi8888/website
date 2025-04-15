// News API configuration
// Key is now read from config.js
const BASE_URL = 'https://newsapi.org/v2';

// Gemini API configuration - Handled by Cloudflare Worker
// REMOVE direct Gemini API URL construction
// const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY_CONFIG}`; // REMOVED

// *** Define your Cloudflare Worker URL ***
// Replace this with the actual URL after you deploy your worker
const GEMINI_WORKER_URL = 'YOUR_CLOUDFLARE_WORKER_URL';

// DOM Elements
const newsContainer = document.getElementById('newsContainer');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');

// Chat Popup Elements (Dynamically Created)
let chatPopup;
let chatMessages;
let chatInput;
let chatSendButton;
let chatToggleButton;

// Fetch news articles
async function fetchNews(query = '') {
    // WARNING: NEWS_API_KEY is still exposed client-side via config.js
    // Consider proxying this too if needed
    if (!NEWS_API_KEY) {
        console.error("News API Key is not defined in config.js");
        newsContainer.innerHTML = '<p class="error">News API Key is missing.</p>';
        return;
    }
    try {
        const url = query
            ? `${BASE_URL}/everything?q=${encodeURIComponent(query)}&apiKey=${NEWS_API_KEY}` // Use variable from config.js
            : `${BASE_URL}/top-headlines?country=us&apiKey=${NEWS_API_KEY}`; // Use variable from config.js
        
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

// --- Chat Popup Functions ---

// Function to add a message to the chat display
function addChatMessage(sender, message) {
    if (!chatMessages) return; // Ensure chat elements exist
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', sender.toLowerCase());
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`; // Simple formatting
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
}

// Function to send message to Gemini API via Cloudflare Worker
async function sendToGemini(message) {
    // Check if the worker URL is set
    if (!GEMINI_WORKER_URL || GEMINI_WORKER_URL === 'YOUR_CLOUDFLARE_WORKER_URL') {
         addChatMessage('System', 'Chat worker URL is not configured.');
         console.error("GEMINI_WORKER_URL is not set in script.js");
         return;
    }

    addChatMessage('User', message);
    addChatMessage('AI', 'Thinking...');
    const thinkingMessage = chatMessages.lastChild;

    try {
        // Send the message to your Cloudflare Worker
        const response = await fetch(GEMINI_WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Send only the message in the body
            body: JSON.stringify({ message: message }),
        });

        if (thinkingMessage && thinkingMessage.textContent.includes('Thinking...')) {
            chatMessages.removeChild(thinkingMessage);
        }

        // The worker now handles interaction with the Gemini API
        // Check the response from the *worker*
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from worker' })); // Graceful error parsing
            console.error('Worker Error Response:', errorData);
            throw new Error(`Chat Service Error: ${response.status} ${errorData.error || 'Unknown error'}`);
        }

        const data = await response.json(); // Data is the response *from Gemini*, forwarded by the worker

        // Extract text - Same structure as before, as the worker forwards Gemini's response
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process that response.';
        addChatMessage('AI', aiResponse);

    } catch (error) {
        console.error('Error sending message via worker:', error);
         if (thinkingMessage && thinkingMessage.textContent.includes('Thinking...')) {
             chatMessages.removeChild(thinkingMessage);
         }
        addChatMessage('System', `Error: Could not connect to AI Service. ${error.message}`);
    }
}

// Function to create and initialize the chat popup
function createChatPopup() {
    // --- Create Elements ---
    chatToggleButton = document.createElement('button');
    chatPopup = document.createElement('div');
    const chatHeader = document.createElement('div');
    const chatCloseButton = document.createElement('button');
    chatMessages = document.createElement('div');
    const chatInputArea = document.createElement('div');
    chatInput = document.createElement('input');
    chatSendButton = document.createElement('button');

    // --- Add IDs and Classes for Styling/Selection ---
    chatToggleButton.id = 'chatToggleButton';
    chatToggleButton.textContent = 'Chat';
    chatPopup.id = 'chatPopup';
    chatPopup.classList.add('hidden'); // Start hidden
    chatHeader.id = 'chatHeader';
    chatCloseButton.id = 'chatCloseButton';
    chatCloseButton.textContent = 'X';
    chatMessages.id = 'chatMessages';
    chatInputArea.id = 'chatInputArea';
    chatInput.id = 'chatInput';
    chatInput.type = 'text';
    chatInput.placeholder = 'Ask something...';
    chatSendButton.id = 'chatSendButton';
    chatSendButton.textContent = 'Send';

    // --- Assemble Structure ---
    chatHeader.appendChild(document.createTextNode('Support Chat'));
    chatHeader.appendChild(chatCloseButton);
    chatInputArea.appendChild(chatInput);
    chatInputArea.appendChild(chatSendButton);
    chatPopup.appendChild(chatHeader);
    chatPopup.appendChild(chatMessages);
    chatPopup.appendChild(chatInputArea);

    // --- Append to Body ---
    document.body.appendChild(chatToggleButton);
    document.body.appendChild(chatPopup);

    // --- Add Basic CSS ---
    const styles = `
        #chatToggleButton {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 15px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            z-index: 1000;
        }
        #chatPopup {
            position: fixed;
            bottom: 60px;
            right: 20px;
            width: 300px;
            height: 400px;
            background-color: white;
            border: 1px solid #ccc;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            z-index: 1001;
            overflow: hidden;
        }
        #chatPopup.hidden {
            display: none;
        }
        #chatHeader {
            padding: 10px;
            background-color: #f1f1f1;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #ccc;
        }
        #chatCloseButton {
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
        }
        #chatMessages {
            flex-grow: 1;
            padding: 10px;
            overflow-y: auto;
            background-color: #e9e9e9;
        }
        .chat-message {
            margin-bottom: 8px;
            padding: 5px 8px;
            border-radius: 4px;
            max-width: 85%;
            word-wrap: break-word;
        }
        .chat-message.user {
            background-color: #dcf8c6;
            margin-left: auto; /* Align user messages to the right */
            text-align: right;
        }
        .chat-message.ai, .chat-message.system {
            background-color: #fff;
            margin-right: auto; /* Align AI/System messages to the left */
            text-align: left;
        }
         .chat-message.system {
             font-style: italic;
             color: #888;
             background-color: #f0f0f0;
         }
        #chatInputArea {
            display: flex;
            padding: 10px;
            border-top: 1px solid #ccc;
        }
        #chatInput {
            flex-grow: 1;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 3px;
            margin-right: 5px;
        }
        #chatSendButton {
            padding: 8px 12px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // --- Add Event Listeners ---
    chatToggleButton.addEventListener('click', () => {
        chatPopup.classList.toggle('hidden');
    });

    chatCloseButton.addEventListener('click', () => {
        chatPopup.classList.add('hidden');
    });

    chatSendButton.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });

     // Initial welcome message
    addChatMessage('AI', 'Hello! How can I help you today?');
}

function handleSendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        sendToGemini(message);
        chatInput.value = ''; // Clear input field
    }
}

// --- Event Listeners for News Search ---
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

// --- Initial Load ---
fetchNews();
createChatPopup(); // Initialize and create the chat popup 