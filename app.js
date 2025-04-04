// This file assumes positiveWords and negativeWords are already defined in keywords.js

async function fetchNews() {
  const selectedSector = document.getElementById('sectorSelect').value;

  const [news, arxiv, s2] = await Promise.all([
    fetchFromGoogleNews(selectedSector),
    fetchFromArxiv(selectedSector),
    fetchFromSemanticScholar(selectedSector)
  ]);

  const allHeadlines = [...news, ...arxiv, ...s2];

  // Filter by relevant keywords
  const relevantWords = positiveWords.concat(negativeWords).map(w => w.toLowerCase());
  const filtered = allHeadlines.filter(({ title }) =>
    relevantWords.some(word => title.toLowerCase().includes(word))
  );

  analyzeSentiment(filtered);
}

async function fetchFromGoogleNews(query) {
  const proxy = "https://api.allorigins.win/get?url=";
  const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const encodedUrl = `${proxy}${encodeURIComponent(googleNewsUrl)}`;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  try {
    const response = await fetch(encodedUrl);
    if (!response.ok) throw new Error("Proxy fetch failed");

    const data = await response.json();
    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, "text/xml");
    const items = Array.from(xml.querySelectorAll("item"));

    return items.map(item => {
      const title = item.querySelector("title").textContent;
      const link = item.querySelector("link").textContent;
      const pubDate = new Date(item.querySelector("pubDate").textContent);
      return { title, link, pubDate };
    }).filter(item => item.pubDate >= ninetyDaysAgo);
  } catch (error) {
    console.error("Google News fetch error:", error);
    return [];
  }
}

async function fetchFromArxiv(query) {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=15&sortBy=lastUpdatedDate`;
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  try {
    const response = await fetch(url);
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");
    const entries = Array.from(xml.querySelectorAll("entry"));

    return entries.map(entry => {
      const title = entry.querySelector("title").textContent.trim();
      const link = entry.querySelector("id").textContent;
      const pubDate = new Date(entry.querySelector("updated").textContent);
      return { title, link, pubDate };
    }).filter(item => item.pubDate >= ninetyDaysAgo);
  } catch (error) {
    console.error("arXiv fetch error:", error);
    return [];
  }
}

async function fetchFromSemanticScholar(query) {
  const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=10&fields=title,url,year`;

  try {
    const response = await fetch(apiUrl);
    const json = await response.json();
    const currentYear = new Date().getFullYear();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return json.data.map(item => {
      const title = item.title;
      const link = item.url || "#";
      const pubDate = new Date(item.year || currentYear, 0);
      return { title, link, pubDate };
    }).filter(item => item.pubDate >= ninetyDaysAgo);
  } catch (error) {
    console.error("Semantic Scholar fetch error:", error);
    return [];
  }
}

function analyzeSentiment(headlines) {
  let positive = 0, negative = 0;
  let keywordHits = {};

  headlines.forEach(({ title }) => {
    const text = title.toLowerCase();

    positiveWords.forEach(word => {
      if (text.includes(word.toLowerCase())) {
        positive++;
        keywordHits[word] = (keywordHits[word] || 0) + 1;
      }
    });

    negativeWords.forEach(word => {
      if (text.includes(word.toLowerCase())) {
        negative++;
        keywordHits[word] = (keywordHits[word] || 0) + 1;
      }
    });
  });

  displayResult(positive, negative, keywordHits, headlines);
}

function displayResult(pos, neg, keywords, headlines) {
  const resultDiv = document.getElementById("result");
  const mood = pos > neg ? "🟢 Mostly Positive" : pos === neg ? "🟡 Neutral" : "🔴 Mostly Negative";

  const keywordList = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => `<li>${word}: ${count}</li>`)
    .join("");

  const articlesList = headlines
    .slice(0, 6)
    .map(({ title, link, pubDate }) => {
      const formattedDate = pubDate ? new Date(pubDate).toLocaleDateString() : "";
      return `<li><a href="${link}" target="_blank">${title}</a> <small>(${formattedDate})</small></li>`;
    })
    .join("");

  resultDiv.innerHTML = `
    <h2>🧠 Innovation Mood: <span class="${pos > neg ? 'positive' : (pos === neg ? 'neutral' : 'negative')}">${mood}</span></h2>
    
    <h3>🔥 Keyword Hits:</h3>
    <ul>${keywordList || "<li>No relevant keywords found.</li>"}</ul>
    
    <h3>📰 Top Results (from past 90 days):</h3>
    <ul>${articlesList || "<li>No matching results found.</li>"}</ul>
  `;
}
