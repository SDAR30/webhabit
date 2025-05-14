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
  
  // Format date for display
  function formatDateForDisplay(timestamp) {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
  
  // Get friendly name for display (remove www. prefix)
  function getFriendlyName(hostname) {
    return hostname.replace(/^www\./, '');
  }
  
  // Update display based on stored data
  async function updateDisplay() {
    try {
      // Get stored data
      const result = await chrome.storage.local.get(['website_data']);
      const websiteData = result.website_data || {};
      
      // Get time range filter value
      const timeRange = document.getElementById('time-range').value;
      
      // Calculate total time and other stats
      let totalTime = 0;
      const websites = Object.keys(websiteData);
      let mostVisitedSite = null;
      let maxVisits = 0;
      
      for (const hostname in websiteData) {
        const site = websiteData[hostname];
        totalTime += site.totalTime;
        
        if (site.visits > maxVisits) {
          maxVisits = site.visits;
          mostVisitedSite = hostname;
        }
      }
      
      // Update stats overview
      document.getElementById('total-time').textContent = formatTime(totalTime);
      document.getElementById('websites-count').textContent = websites.length;
      document.getElementById('most-visited').textContent = mostVisitedSite ? getFriendlyName(mostVisitedSite) : 'None';
      
      // Sort websites by time spent (descending)
      const sortedSites = websites
        .map(hostname => ({
          hostname,
          ...websiteData[hostname]
        }))
        .sort((a, b) => b.totalTime - a.totalTime);
      
      // Update table
      const tableBody = document.getElementById('website-data');
      
      if (sortedSites.length > 0) {
        let tableHTML = '';
        
        for (const site of sortedSites) {
          tableHTML += `
            <tr>
              <td>${getFriendlyName(site.hostname)}</td>
              <td>${formatTime(site.totalTime)}</td>
              <td>${site.visits}</td>
              <td>${formatDateForDisplay(site.lastVisited)}</td>
            </tr>
          `;
        }
        
        tableBody.innerHTML = tableHTML;
      } else {
        tableBody.innerHTML = '<tr><td colspan="4" class="no-data">No data available</td></tr>';
      }
    } catch (error) {
      console.error("Error updating display:", error);
    }
  }
  
  // Export data to CSV
  function exportToCSV() {
    chrome.storage.local.get(['website_data'], function(result) {
      const websiteData = result.website_data || {};
      const websites = Object.keys(websiteData);
      
      if (websites.length === 0) {
        alert('No data to export');
        return;
      }
      
      // Create CSV content
      let csvContent = 'Website,Total Time (seconds),Visits,Last Visited\n';
      
      for (const hostname of websites) {
        const site = websiteData[hostname];
        csvContent += `"${hostname}",${site.totalTime},${site.visits},${site.lastVisited || ''}\n`;
      }
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'website-tracking-data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }
  
  // Clear all tracking data
  function clearAllData() {
    if (confirm('Are you sure you want to clear all tracking data? This cannot be undone.')) {
      chrome.storage.local.set({ website_data: {} }, function() {
        alert('All data has been cleared');
        updateDisplay();
      });
    }
  }
  
  // Event listeners
  document.addEventListener('DOMContentLoaded', function() {
    // Initial display update
    updateDisplay();
    
    // Time range selector
    document.getElementById('time-range').addEventListener('change', updateDisplay);
    
    // Search input
    document.getElementById('search-input').addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase();
      const rows = document.querySelectorAll('#website-table tbody tr');
      
      rows.forEach(row => {
        const website = row.querySelector('td:first-child')?.textContent.toLowerCase();
        if (website && website.includes(searchTerm)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
    
    // Export button
    document.getElementById('export-btn').addEventListener('click', exportToCSV);
    
    // Clear data button
    document.getElementById('clear-data-btn').addEventListener('click', clearAllData);
    
    // Save settings
    document.getElementById('idle-timeout').addEventListener('change', function(e) {
      const value = parseInt(e.target.value);
      if (value >= 15 && value <= 300) {
        chrome.storage.local.set({ idle_timeout: value });
      }
    });
  });