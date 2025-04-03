async function fetchNews() {
  const sector = document.getElementById('sectorInput').value || "tech";
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(sector)}&hl=en-US&gl=US&ceid=US:en`;

  const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
  const data = await response.json();

  const parser = new DOMParser();
  const xml = parser.parseFromString(data.contents, "text/xml");
  const items = Array.from(xml.querySelectorAll("item"));

  let headlines = items.map(item => item.querySelector("title").textContent);
  analyzeSentiment(headlines);
}

function analyzeSentiment(headlines) {
  let positive = 0, negative = 0;
  let keywordHits = {};

  headlines.forEach(title => {
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

  displayResult(positive, negative, keywordHits);
}

function displayResult(pos, neg, keywords) {
  const resultDiv = document.getElementById("result");
  let mood = pos > neg ? "🟢 Mostly Positive" : "🔴 Mostly Negative";

  let keywordList = Object.entries(keywords)
    .map(([word, count]) => `${word}: ${count}`)
    .join("<br>");

  resultDiv.innerHTML = `
    <h2>Sentiment: <span class="${pos > neg ? 'positive' : 'negative'}">${mood}</span></h2>
    <h3>Keyword Frequency:</h3>
    <p>${keywordList || "No keywords found."}</p>
  `;
}
