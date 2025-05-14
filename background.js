// Constants
const IDLE_TIMEOUT = 60; // seconds of inactivity before considering idle

// Global variables
let currentTab = null;
let startTime = null;
let activeHostname = null;

// Data structure
// website_data = {
//   "hostname": {
//     totalTime: 0,
//     visits: 0,
//     lastVisited: timestamp,
//     dailyData: {
//       "YYYY-MM-DD": timeSpent
//     }
//   }
// }

// Initialize or get stored data
function initializeData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['website_data'], (result) => {
      if (result.website_data) {
        resolve(result.website_data);
      } else {
        const initialData = {};
        chrome.storage.local.set({ website_data: initialData });
        resolve(initialData);
      }
    });
  });
}

// Extract hostname from URL
function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Record time spent on current site before switching
async function recordTimeSpent() {
  if (!activeHostname || !startTime) return;
  
  const endTime = Date.now();
  const timeSpent = Math.round((endTime - startTime) / 1000); // in seconds
  
  if (timeSpent < 1) return; // Don't record if less than 1 second
  
  const data = await initializeData();
  const today = getTodayDate();
  
  // Initialize if hostname doesn't exist
  if (!data[activeHostname]) {
    data[activeHostname] = {
      totalTime: 0,
      visits: 0,
      lastVisited: null,
      dailyData: {}
    };
  }
  
  // Update data
  data[activeHostname].totalTime += timeSpent;
  data[activeHostname].lastVisited = endTime;
  data[activeHostname].visits += 1;
  
  // Update daily data
  if (!data[activeHostname].dailyData[today]) {
    data[activeHostname].dailyData[today] = 0;
  }
  data[activeHostname].dailyData[today] += timeSpent;
  
  // Save updated data
  chrome.storage.local.set({ website_data: data });
}

// Update current tab information
async function updateCurrentTab(tabId) {
  try {
    // Record time spent on previous site
    await recordTimeSpent();
    
    // Get info about new tab
    const tab = await chrome.tabs.get(tabId);
    
    // Ignore chrome:// urls and non-http(s) urls
    if (!tab.url || !tab.url.startsWith('http')) {
      activeHostname = null;
      startTime = null;
      return;
    }
    
    // Set new active tab info
    currentTab = tabId;
    activeHostname = getHostname(tab.url);
    startTime = Date.now();
  } catch (e) {
    console.error("Error updating current tab:", e);
  }
}

// Handle tab activation (user switches tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateCurrentTab(activeInfo.tabId);
});

// Handle tab updates (URL changes in current tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === currentTab && changeInfo.url) {
    updateCurrentTab(tabId);
  }
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus, record time
    recordTimeSpent();
    activeHostname = null;
    startTime = null;
  } else {
    // Window gained focus, get active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        updateCurrentTab(tabs[0].id);
      }
    });
  }
});

// Handle browser idle state changes
chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'active') {
    // Browser became active again, start new timer
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        updateCurrentTab(tabs[0].id);
      }
    });
  } else {
    // Browser became idle or locked, record time
    recordTimeSpent();
    activeHostname = null;
    startTime = null;
  }
});

// Set up idle detection
chrome.idle.setDetectionInterval(IDLE_TIMEOUT);

// Initialize on extension startup
chrome.runtime.onStartup.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      updateCurrentTab(tabs[0].id);
    }
  });
});

// Run when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  initializeData();
});