console.log("Content script loaded");

let tweetObserver;
let lastProcessedTweet = null;
let isProcessing = false;

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function checkRestriction(isRestricted, tweetCount) {
  console.log("Checking restriction", { isRestricted, tweetCount });
  if (isRestricted) {
    restrictAccess();
  } else {
    observeTweets();
  }
}

function observeTweets() {
  console.log("Observing tweets");
  const tweetContainer = document.querySelector('div[aria-label="Timeline: Your Home Timeline"]');
  if (!tweetContainer) {
    console.log("Tweet container not found");
    return;
  }

  const debouncedProcessTweet = debounce(processTweet, 300);

  tweetObserver = new MutationObserver((mutations) => {
    if (isProcessing) return;

    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const newTweet = node.querySelector('article');
            if (newTweet && newTweet !== lastProcessedTweet) {
              debouncedProcessTweet(newTweet);
            }
          }
        });
      }
    });
  });

  tweetObserver.observe(tweetContainer, { childList: true, subtree: true });
}

function processTweet(tweetElement) {
  if (isProcessing) return;
  isProcessing = true;
  lastProcessedTweet = tweetElement;

  console.log("New tweet detected");
  chrome.runtime.sendMessage({ action: "checkTweetCount" }, (response) => {
    console.log("Received response for new tweet:", response);
    if (response && response.isRestricted) {
      restrictAccess();
    }
    isProcessing = false;
  });
}

function restrictAccess() {
  if (tweetObserver) {
    tweetObserver.disconnect();
  }

  document.body.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
      
      body, html {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
        font-family: 'Roboto', sans-serif;
        background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .container {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 40px;
        text-align: center;
        color: white;
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        border: 1px solid rgba(255, 255, 255, 0.18);
        max-width: 80%;
      }
      
      h1 {
        font-size: 2.5em;
        margin-bottom: 20px;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      
      p {
        font-size: 1.2em;
        margin-bottom: 15px;
        line-height: 1.5;
      }
      
      .icon {
        font-size: 4em;
        margin-bottom: 20px;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      
      .pulse {
        animation: pulse 2s infinite;
      }
    </style>
    <div class="container">
      <div class="icon pulse">⏳</div>
      <h1>Twitter Usage Restricted</h1>
      <p>You've reached your daily limit of 20 tweets.</p>
      <p>Take a break and come back tomorrow for a fresh start!</p>
      <p>Time remaining: <span id="countdown"></span></p>
    </div>
    <script>
      function updateCountdown() {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const timeLeft = tomorrow - now;
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        document.getElementById('countdown').textContent = 
          \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
      }
      
      updateCountdown();
      setInterval(updateCountdown, 1000);
    </script>
  `;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkRestriction") {
    checkRestriction(request.isRestricted, request.tweetCount);
  }
});

chrome.runtime.sendMessage({ action: "checkTweetCount" }, (response) => {
  if (response) {
    checkRestriction(response.isRestricted, response.tweetCount);
  }
});