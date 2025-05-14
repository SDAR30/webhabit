// Function to format seconds into a readable time string
function formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds} sec`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hr ${minutes} min`;
    }
  }
  
  // Get today's date in YYYY-MM-DD format
  function getTodayDate() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  
  // Extract hostname from URL
  function getHostname(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return null;
    }
  }
  
  // Get friendly name for display (remove www. prefix)
  function getFriendlyName(hostname) {
    return hostname.replace(/^www\./, '');
  }
  
  // Calculate total time spent today
  function calculateTodayTotal(data) {
    const today = getTodayDate();
    let totalSeconds = 0;
    
    for (const hostname in data) {
      if (data[hostname].dailyData && data[hostname].dailyData[today]) {
        totalSeconds += data[hostname].dailyData[today];
      }
    }
    
    return totalSeconds;
  }
  
  // Get top sites for today
  function getTopSitesToday(data, limit = 5) {
    const today = getTodayDate();
    const sites = [];
    
    for (const hostname in data) {
      if (data[hostname].dailyData && data[hostname].dailyData[today]) {
        sites.push({
          hostname: hostname,
          time: data[hostname].dailyData[today]
        });
      }
    }
    
    // Sort by time (descending)
    sites.sort((a, b) => b.time - a.time);
    
    // Return top sites
    return sites.slice(0, limit);
  }
  
  // Update popup with current data
  async function updatePopup() {
    try {
      // Get stored data
      const result = await chrome.storage.local.get(['website_data']);
      const data = result.website_data || {};
      
      // Update today's stats
      const todayTotal = calculateTodayTotal(data);
      document.getElementById('today-stats').innerHTML = `
        <p><strong>Total Time:</strong> ${formatTime(todayTotal)}</p>
        <p><strong>Sites Visited:</strong> ${Object.keys(data).length}</p>
      `;
      
      // Get current site
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentHostname = tab && tab.url ? getHostname(tab.url) : null;
      
      // Update current site stats
      if (currentHostname && data[currentHostname]) {
        const today = getTodayDate();
        const todayTime = data[currentHostname].dailyData && data[currentHostname].dailyData[today] 
          ? data[currentHostname].dailyData[today] 
          : 0;
        
        document.getElementById('current-site').innerHTML = `
          <p><strong>Site:</strong> ${getFriendlyName(currentHostname)}</p>
          <p><strong>Today:</strong> ${formatTime(todayTime)}</p>
          <p><strong>Total:</strong> ${formatTime(data[currentHostname].totalTime)}</p>
        `;
      } else {
        document.getElementById('current-site').innerHTML = `
          <p>No data for current site</p>
        `;
      }
      
      // Update top sites
      const topSites = getTopSitesToday(data);
      if (topSites.length > 0) {
        const listItems = topSites.map(site => 
          `<li><strong>${getFriendlyName(site.hostname)}</strong>: ${formatTime(site.time)}</li>`
        ).join('');
        document.getElementById('top-sites-list').innerHTML = listItems;
      } else {
        document.getElementById('top-sites-list').innerHTML = '<li>No data yet</li>';
      }
    } catch (error) {
      console.error("Error updating popup:", error);
    }
  }
  
  // Event listeners
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize popup
    updatePopup();
    
    // Options button
    document.getElementById('options-btn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    
    // View details button
    document.getElementById('view-details').addEventListener('click', () => {
      chrome.tabs.create({ url: 'options/options.html' });
    });
  });