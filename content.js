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

function checkRestriction(isRestricted, tweetCount, tweetLimit, restrictionDuration) {
  console.log("Checking restriction", { isRestricted, tweetCount, tweetLimit, restrictionDuration });
  if (isRestricted) {
    restrictAccess(tweetLimit, restrictionDuration);
  } else {
    findTweetContainerAndObserve();
  }
}

function findTweetContainerAndObserve() {
  console.log("Attempting to find tweet container");
  const possibleSelectors = [
    'div[aria-label="Timeline: Your Home Timeline"]',
    'div[data-testid="primaryColumn"]',
    'div[data-testid="tweet"]',
    'div[data-testid="tweetText"]'
  ];

  let tweetContainer = null;
  for (const selector of possibleSelectors) {
    tweetContainer = document.querySelector(selector);
    if (tweetContainer) {
      console.log(`Tweet container found with selector: ${selector}`);
      break;
    }
  }

  if (tweetContainer) {
    observeTweets(tweetContainer);
  } else {
    console.log("Tweet container not found, retrying in 1 second");
    setTimeout(findTweetContainerAndObserve, 1000);
  }
}

function observeTweets(tweetContainer) {
  console.log("Observing tweets");

  const debouncedProcessTweet = debounce(processTweet, 300);

  tweetObserver = new MutationObserver((mutations) => {
    if (isProcessing) return;

    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const newTweet = node.querySelector('article') || node.closest('article');
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
      restrictAccess(response.tweetLimit, response.restrictionDuration);
    }
    isProcessing = false;
  });
}

function restrictAccess(tweetLimit, restrictionDuration) {
  if (tweetObserver) {
    tweetObserver.disconnect();
  }

  const restrictionEndTime = new Date().getTime() + restrictionDuration * 60 * 1000;

  document.body.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
      
      body, html {
        margin: 0;
        padding: 0;
        height: 100vh;
        width: 100vw;
        font-family: 'Roboto', sans-serif;
        background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
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
        position: relative;
        overflow: hidden;
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

      #countdown {
        font-size: 3em;
        font-weight: bold;
        margin-top: 20px;
        background: linear-gradient(90deg, #fdbb2d, #b21f1f, #1a2a6c);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-size: 200% auto;
        animation: shine 3s linear infinite;
      }

      @keyframes shine {
        to {
          background-position: 200% center;
        }
      }

      .digital-clock {
        font-family: 'Roboto', sans-serif;
        font-size: 4em;
        font-weight: bold;
        color: #fdbb2d;
        text-shadow: 0 0 10px rgba(253, 187, 45, 0.7);
        margin-top: 20px;
      }

      .progress-bar {
        width: 100%;
        height: 10px;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 5px;
        margin-top: 20px;
        overflow: hidden;
        position: relative;
      }

      .progress {
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #fdbb2d, #b21f1f, #1a2a6c);
        background-size: 200% auto;
        animation: gradientMove 3s linear infinite;
        transition: width 1s linear;
      }

      @keyframes gradientMove {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      .particles {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      .particle {
        position: absolute;
        display: block;
        pointer-events: none;
        width: 5px;
        height: 5px;
        background-color: rgba(255, 255, 255, 0.5);
        box-shadow: 0 0 10px 2px rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        animation: rise 10s infinite ease-in;
      }

      @keyframes rise {
        0% {
          opacity: 0;
          transform: translateY(0) scale(1);
        }
        10% {
          opacity: 1;
        }
        90% {
          opacity: 1;
        }
        100% {
          opacity: 0;
          transform: translateY(-1000px) scale(0.5);
        }
      }
    </style>
    <div class="container">
      <div class="particles">
        ${Array(20).fill().map(() => `<span class="particle" style="left:${Math.random()*100}%;animation-delay:${Math.random()*10}s;"></span>`).join('')}
      </div>
      <div class="icon pulse">⏳</div>
      <h1>Twitter Usage Restricted</h1>
      <p>You've reached your daily limit of ${tweetLimit} tweets.</p>
      <p>Take a break and come back when the timer reaches zero!</p>
      <div id="countdown"></div>
      <div class="digital-clock" id="digital-clock"></div>
      <div class="progress-bar">
        <div class="progress" id="progress"></div>
      </div>
    </div>
    <script>
      const restrictionEndTime = ${restrictionEndTime};
      
      function updateCountdown() {
        const now = new Date().getTime();
        const timeLeft = restrictionEndTime - now;
        
        if (timeLeft <= 0) {
          location.reload();
          return;
        }
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        document.getElementById('countdown').textContent = 
          \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;

        document.getElementById('digital-clock').textContent = 
          \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;

        const totalSeconds = ${restrictionDuration} * 60;
        const elapsedSeconds = totalSeconds - Math.floor(timeLeft / 1000);
        const progress = (elapsedSeconds / totalSeconds) * 100;
        document.getElementById('progress').style.width = \`\${progress}%\`;
      }
      
      updateCountdown();
      setInterval(updateCountdown, 1000);
    </script>
  `;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkRestriction") {
    checkRestriction(request.isRestricted, request.tweetCount, request.tweetLimit, request.restrictionDuration);
  }
});

// Initial check when the content script loads
chrome.runtime.sendMessage({ action: "checkTweetCount" }, (response) => {
  if (response) {
    checkRestriction(response.isRestricted, response.tweetCount, response.tweetLimit, response.restrictionDuration);
  }
});

// Attempt to find and observe the tweet container when the page loads
window.addEventListener('load', findTweetContainerAndObserve);