console.log("Background script loaded");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
  chrome.storage.local.set({ tweetCount: 0, lastResetDate: new Date().toDateString(), isRestricted: false });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))) {
    console.log("Twitter tab updated, sending checkRestriction message");
    checkAndUpdateAllTabs();
  }
});

function checkAndUpdateAllTabs() {
  console.log("Checking and updating all tabs");
  chrome.storage.local.get(['tweetCount', 'lastResetDate', 'isRestricted'], (result) => {
    console.log("Current storage state:", result);
    let { tweetCount, lastResetDate, isRestricted } = result;
    const currentDate = new Date().toDateString();

    if (lastResetDate !== currentDate) {
      console.log("Resetting counts for new day");
      tweetCount = 0;
      lastResetDate = currentDate;
      isRestricted = false;
    }

    chrome.tabs.query({ url: ["*://twitter.com/*", "*://x.com/*"] }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { action: "checkRestriction", isRestricted, tweetCount });
      });
    });

    chrome.storage.local.set({ tweetCount, lastResetDate, isRestricted });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);
  if (request.action === "checkTweetCount") {
    chrome.storage.local.get(['tweetCount', 'lastResetDate', 'isRestricted'], (result) => {
      console.log("Current storage state:", result);
      let { tweetCount, lastResetDate, isRestricted } = result;
      const currentDate = new Date().toDateString();

      if (lastResetDate !== currentDate) {
        console.log("Resetting counts for new day");
        tweetCount = 0;
        lastResetDate = currentDate;
        isRestricted = false;
      }

      if (!isRestricted) {
        tweetCount++;
        console.log("Incremented tweet count:", tweetCount);
        if (tweetCount > 20) {
          console.log("Tweet limit reached, restricting access");
          isRestricted = true;
        }
      }

      chrome.storage.local.set({ tweetCount, lastResetDate, isRestricted }, () => {
        console.log("Updated storage:", { tweetCount, lastResetDate, isRestricted });
        checkAndUpdateAllTabs();
        sendResponse({ tweetCount, isRestricted });
      });
    });
    return true;
  }
});