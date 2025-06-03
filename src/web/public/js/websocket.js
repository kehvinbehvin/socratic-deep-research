class QueueMonitor {
  constructor() {
    this.ws = new WebSocket(`ws://${window.location.host}`);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
  }

  handleMessage(event) {
    try {
      const update = JSON.parse(event.data);
      const sessionElement = document.getElementById(`session-${update.id}`);
      
      if (sessionElement) {
        // Update the session element with new status
        this.updateSessionStatus(sessionElement, update);
      } else {
        // If it's a new session, add it to the list
        const sessionsContainer = document.getElementById('sessions');
        if (sessionsContainer) {
          const template = document.getElementById('sessionTemplate');
          const newSession = this.createSessionElement(template, update);
          sessionsContainer.insertBefore(newSession, sessionsContainer.firstChild);
        }
      }
    } catch (error) {
      console.error('Failed to handle WebSocket message:', error);
    }
  }

  handleClose() {
    console.log('WebSocket connection closed. Attempting to reconnect...');
    setTimeout(() => {
      this.ws = new WebSocket(`ws://${window.location.host}`);
    }, 5000);
  }

  handleError(error) {
    console.error('WebSocket error:', error);
  }

  updateSessionStatus(element, update) {
    const statusElement = element.querySelector('.status');
    const progressBar = element.querySelector('.progress-bar');
    const stages = [
      'TOPIC',
      'QUESTION',
      'REFLECTION',
      'CLARIFICATION',
      'QUERY_PREPARATION',
      'SEARCH',
      'CRAWL',
      'REVIEW',
      'COMPLETE'
    ];

    // Update status badge
    if (statusElement) {
      statusElement.textContent = update.status;
      statusElement.className = this.getStatusClass(update.status);
    }

    // Update progress bar
    if (progressBar) {
      const stageIndex = stages.indexOf(update.status);
      const progress = ((stageIndex + 1) / stages.length) * 100;
      progressBar.style.width = `${progress}%`;
      progressBar.className = `progress-bar transition-all duration-500 ease-out h-full ${
        update.status === 'FAILED' ? 'bg-red-500' : 'bg-blue-500'
      }`;
    }
  }

  getStatusClass(status) {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded';
    const statusColors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800'
    };
    return `${baseClasses} ${statusColors[status] || statusColors.PENDING}`;
  }

  createSessionElement(template, topic) {
    const clone = template.content.cloneNode(true);
    const container = clone.querySelector('.bg-gray-50');
    const title = clone.querySelector('h3');
    const timestamp = clone.querySelector('p');
    const status = clone.querySelector('span');
    const progressBar = clone.querySelector('.progress-bar');

    container.id = `session-${topic.id}`;
    title.textContent = topic.content;
    timestamp.textContent = new Date(topic.createdAt).toLocaleString();
    
    status.textContent = topic.status;
    status.className = this.getStatusClass(topic.status);

    const stages = [
      'TOPIC',
      'QUESTION',
      'REFLECTION',
      'CLARIFICATION',
      'QUERY_PREPARATION',
      'SEARCH',
      'CRAWL',
      'REVIEW',
      'COMPLETE'
    ];
    const stageIndex = stages.indexOf(topic.status);
    const progress = ((stageIndex + 1) / stages.length) * 100;
    progressBar.className = `progress-bar transition-all duration-500 ease-out h-full ${
      topic.status === 'FAILED' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    progressBar.style.width = `${progress}%`;

    return clone;
  }
}

// Initialize the queue monitor when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new QueueMonitor();
}); 