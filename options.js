document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('options-form');
    const tweetLimitInput = document.getElementById('tweetLimit');
    const restrictionDurationInput = document.getElementById('restrictionDuration');
    const saveMessage = document.getElementById('save-message');

    // Load saved settings
    chrome.storage.local.get(['tweetLimit', 'restrictionDuration'], (result) => {
        tweetLimitInput.value = result.tweetLimit || 20;
        restrictionDurationInput.value = result.restrictionDuration || 1440; // Default to 24 hours (1440 minutes)
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const tweetLimit = parseInt(tweetLimitInput.value);
        const restrictionDuration = parseInt(restrictionDurationInput.value);

        chrome.storage.local.set({ tweetLimit, restrictionDuration }, () => {
            saveMessage.style.opacity = '1';
            setTimeout(() => {
                saveMessage.style.opacity = '0';
            }, 2000);

            // Reset tweet count and restriction status when settings are changed
            chrome.storage.local.set({
                tweetCount: 0,
                isRestricted: false,
                lastResetDate: new Date().toDateString()
            }, () => {
                // Notify background script to update all tabs
                chrome.runtime.sendMessage({ action: "settingsUpdated" });
            });
        });
    });
});