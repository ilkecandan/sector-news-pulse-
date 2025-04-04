// This file assumes positiveWords and negativeWords are already defined in keywords.js

async function fetchNews() {
  const selectedSector = document.getElementById('sectorSelect').value;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(selectedSector)}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    const data = await response.json();

    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, "text/xml");
    const items = Array.from(xml.querySelectorAll("item"));

    let headlines = items.map(item => ({
      title: item.querySelector("title").textContent,
      link: item.querySelector("link").textContent
    }));

    // Filter headlines by presence of keywords
    const relevantWords = positiveWords.concat(negativeWords).map(w => w.toLowerCase());
    headlines = headlines.filter(({ title }) =>
      relevantWords.some(word => title.toLowerCase().includes(word))
    );

    analyzeSentiment(headlines);
  } catch (error) {
    document.getElementById("result").innerHTML = `<p style="color:red;">⚠️ Could not fetch news. Please try again later.</p>`;
    console.error(error);
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
    .slice(0, 5)
    .map(({ title, link }) => `<li><a href="${link}" target="_blank">${title}</a></li>`)
    .join("");

  resultDiv.innerHTML = `
    <h2>🧠 Innovation Mood: <span class="${pos > neg ? 'positive' : (pos === neg ? 'neutral' : 'negative')}">${mood}</span></h2>
    
    <h3>🔥 Keyword Hits:</h3>
    <ul>${keywordList || "<li>No relevant keywords found.</li>"}</ul>
    
    <h3>📰 Top Headlines:</h3>
    <ul>${articlesList || "<li>No headlines matched your keyword criteria.</li>"}</ul>
  `;
}
