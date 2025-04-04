// This file assumes positiveWords and negativeWords are already defined in keywords.js

async function fetchNews() {
  const selectedSector = document.getElementById('sectorSelect').value;

  const allFeeds = await Promise.allSettled([
    fetchFromRSS(`https://news.google.com/rss/search?q=${encodeURIComponent(selectedSector)}&hl=en-US&gl=US&ceid=US:en`),
    fetchFromRSS(`https://www.reddit.com/r/${sectorToSubreddit(selectedSector)}/.rss`),
    fetchFromRSS(`https://scitechdaily.com/feed/`),
    fetchFromRSS(`https://www.biospace.com/rss/`)
  ]);

  // Collect only successful results
  const allHeadlines = allFeeds
    .filter(result => result.status === "fulfilled")
    .flatMap(result => result.value);

  const relevantWords = positiveWords.concat(negativeWords).map(w => w.toLowerCase());
  const filtered = allHeadlines.filter(({ title }) =>
    relevantWords.some(word => title.toLowerCase().includes(word))
  );

  analyzeSentiment(filtered);
}

async function fetchFromRSS(feedUrl) {
  const proxy = "https://api.allorigins.win/get?url=";
  const encodedUrl = `${proxy}${encodeURIComponent(feedUrl)}`;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  try {
    const response = await fetch(encodedUrl);
    const data = await response.json();

    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, "text/xml");
    const items = Array.from(xml.querySelectorAll("item"));

    return items.map(item => {
      const title = item.querySelector("title")?.textContent || "Untitled";
      const link = item.querySelector("link")?.textContent || "#";
      const pubDate = new Date(item.querySelector("pubDate")?.textContent || Date.now());
      return { title, link, pubDate };
    }).filter(item => item.pubDate >= sixMonthsAgo);
  } catch (error) {
    console.error(`⚠️ RSS Fetch error for ${feedUrl}:`, error);
    return [];
  }
}

function sectorToSubreddit(sector) {
  const map = {
    biotech: "biotech",
    medtech: "medtech",
    diagnostics: "labrats",
    neurotechnology: "neurotechnology",
    "AI healthcare": "HealthIT",
    "robotic surgery": "surgery",
    "digital health": "digitalhealth",
    biomaterials: "materials",
    "regenerative medicine": "regenerativemedicine"
  };

  const keyword = sector.toLowerCase().split(" ")[0];
  return map[keyword] || "science";
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

    <h3>📰 Top Headlines:</h3>
    <ul>${articlesList || "<li>No headlines matched your keyword criteria.</li>"}</ul>
  `;
}
