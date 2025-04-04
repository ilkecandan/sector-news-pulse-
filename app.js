async function fetchNews() {
  const input = document.getElementById('sectorInput').value;
  const query = input || "medtech OR biotech OR deeptech OR diagnostics OR neurotechnology";

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    const data = await response.json();

    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, "text/xml");
    const items = Array.from(xml.querySelectorAll("item"));

    const headlines = items.map(item => ({
      title: item.querySelector("title").textContent,
      link: item.querySelector("link").textContent
    }));

    analyzeSentiment(headlines);
  } catch (error) {
    document.getElementById("result").innerHTML = `<p style="color:red;">⚠️ Failed to fetch news. Please try again.</p>`;
    console.error(error);
  }
}

// --- Analyze sentiment and keyword trends ---
function analyzeSentiment(headlines) {
  let positive = 0, negative = 0;
  let keywordHits = {};

  headlines.forEach(({ title }) => {
    const text = title.toLowerCase();

    positiveWords.forEach(word => {
      if (text.includes(word)) {
        positive++;
        keywordHits[word] = (keywordHits[word] || 0) + 1;
      }
    });

    negativeWords.forEach(word => {
      if (text.includes(word)) {
        negative++;
        keywordHits[word] = (keywordHits[word] || 0) + 1;
      }
    });
  });

  displayResult(positive, negative, keywordHits, headlines);
}

// --- Display results in the UI ---
function displayResult(pos, neg, keywords, headlines) {
  const resultDiv = document.getElementById("result");
  const mood = pos > neg ? "🟢 Mostly Positive" : pos === neg ? "🟡 Neutral" : "🔴 Mostly Negative";

  const keywordList = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1]) // Most frequent first
    .map(([word, count]) => `<li>${word}: ${count}</li>`)
    .join("");

  const articlesList = headlines
    .slice(0, 5)
    .map(({ title, link }) => `<li><a href="${link}" target="_blank">${title}</a></li>`)
    .join("");

  resultDiv.innerHTML = `
    <h2>🧠 Innovation Mood: <span class="${pos > neg ? 'positive' : (pos === neg ? 'neutral' : 'negative')}">${mood}</span></h2>

    <h3>🔥 Trending Keywords:</h3>
    <ul>${keywordList || "<li>No keywords found.</li>"}</ul>

    <h3>📰 Sample Headlines:</h3>
    <ul>${articlesList}</ul>
  `;
}
