//console.log("Background script loaded");

chrome.runtime.onInstalled.addListener(() => {
//   //console.log("Extension installed");
  initializeStorage();
});

function initializeStorage() {
  chrome.storage.local.get(['tweetLimit', 'restrictionDuration'], (result) => {
    chrome.storage.local.set({
      tweetCount: 0,
      lastResetDate: new Date().toDateString(),
      isRestricted: false,
      tweetLimit: result.tweetLimit || 20,
      restrictionDuration: result.restrictionDuration || 1440 // Default to 24 hours (1440 minutes)
    });
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))) {
    //console.log("Twitter tab updated, sending checkRestriction message");
    checkAndUpdateAllTabs();
  }
});

function checkAndUpdateAllTabs() {
  //console.log("Checking and updating all tabs");
  chrome.storage.local.get(['tweetCount', 'lastResetDate', 'isRestricted', 'tweetLimit', 'restrictionDuration'], (result) => {
    //console.log("Current storage state:", result);
    let { tweetCount, lastResetDate, isRestricted, tweetLimit, restrictionDuration } = result;
    const currentDate = new Date().toDateString();

    if (lastResetDate !== currentDate) {
      //console.log("Resetting counts for new day");
      tweetCount = 0;
      lastResetDate = currentDate;
      isRestricted = false;
      chrome.storage.local.set({ tweetCount, lastResetDate, isRestricted });
    }

    chrome.tabs.query({ url: ["*://twitter.com/*", "*://x.com/*"] }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { action: "checkRestriction", isRestricted, tweetCount, tweetLimit, restrictionDuration });
      });
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  //console.log("Received message:", request);
  if (request.action === "checkTweetCount") {
    handleCheckTweetCount(sendResponse);
    return true;
  } else if (request.action === "settingsUpdated") {
    checkAndUpdateAllTabs();
  }
});

function handleCheckTweetCount(sendResponse) {
  chrome.storage.local.get(['tweetCount', 'lastResetDate', 'isRestricted', 'tweetLimit', 'restrictionDuration'], (result) => {
    //console.log("Current storage state:", result);
    let { tweetCount, lastResetDate, isRestricted, tweetLimit, restrictionDuration } = result;
    const currentDate = new Date().toDateString();

    if (lastResetDate !== currentDate) {
      //console.log("Resetting counts for new day");
      tweetCount = 0;
      lastResetDate = currentDate;
      isRestricted = false;
    }

    if (!isRestricted) {
      tweetCount++;
      //console.log("Incremented tweet count:", tweetCount);
      if (tweetCount > tweetLimit) {
        //console.log("Tweet limit reached, restricting access");
        isRestricted = true;
      }
    }

    chrome.storage.local.set({ tweetCount, lastResetDate, isRestricted }, () => {
      //console.log("Updated storage:", { tweetCount, lastResetDate, isRestricted });
      checkAndUpdateAllTabs();
      sendResponse({ tweetCount, isRestricted, tweetLimit, restrictionDuration });
    });
  });
}