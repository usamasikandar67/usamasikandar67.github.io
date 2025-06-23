class PortfolioManager {
  constructor() {
    this.config = {
      username: 'usamasikandar67',
      maxRepos: 6,
      animationDuration: 600,
      scrollThrottle: 100,
      retryAttempts: 3,
      retryDelay: 1000
    };
    
    this.state = {
      isLoading: false,
      currentTheme: this.getStoredTheme(),
      activeSection: '',
      repos: [],
      searchQuery: '',
      selectedLanguage: 'all'
    };
    
    this.observers = new Map();
    this.init();
  }
  //the portfolio
  async init() {
    try {
      this.setupEventListeners();
      this.initializeAnimations();
      this.setupTheme();
      this.setupKeyboardNavigation();
      this.setupSearchAndFilter();
      await this.loadRepositories();
      this.setupPerformanceOptimizations();
      this.setupProgressIndicator();
      this.setupTooltips();
    } catch (error) {
      this.handleError('Initialization failed', error);
    }
  }

  // Setup all event listeners
  setupEventListeners() {
    // Navigation smooth scrolling with history API
    document.querySelectorAll('.sidebar nav a').forEach(link => {
      link.addEventListener('click', this.handleNavClick.bind(this));
    });

    // Scroll events with throttling
    window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), this.config.scrollThrottle));
    
    // Resize events for responsive behavior
    window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 250));
    
    // Visibility change for performance
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Online/offline status
    window.addEventListener('online', this.handleOnlineStatus.bind(this));
    window.addEventListener('offline', this.handleOnlineStatus.bind(this));
  }

  // Enhanced navigation with history support
  handleNavClick(event) {
    event.preventDefault();
    const href = event.currentTarget.getAttribute('href');
    const target = document.querySelector(href);
    
    if (target) {
      // Update URL without page reload
      history.pushState(null, '', href);
      
      // Smooth scroll with callback
      this.smoothScrollTo(target, () => {
        this.updateActiveNavigation();
        this.announceNavigation(target);
      });
    }
  }

  // Enhanced smooth scrolling
  smoothScrollTo(element, callback) {
    const startPosition = window.pageYOffset;
    const targetPosition = element.offsetTop - 80;
    const distance = targetPosition - startPosition;
    const duration = Math.min(Math.abs(distance) / 2, 1000); // Dynamic duration
    
    let startTime = null;
    
    const animateScroll = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      
      // Easing function for smooth animation
      const ease = this.easeInOutCubic(progress);
      window.scrollTo(0, startPosition + (distance * ease));
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else if (callback) {
        callback();
      }
    };
    
    requestAnimationFrame(animateScroll);
  }

  // Easing function
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }

  // Enhanced repository loading with retry logic
  async loadRepositories() {
    if (this.state.isLoading) return;
    
    this.state.isLoading = true;
    const repoList = document.getElementById('repo-list');
    
    this.showLoadingState(repoList);
    
    try {
      const repos = await this.fetchRepositoriesWithRetry();
      this.state.repos = this.processRepositories(repos);
      this.renderRepositories(this.state.repos);
      this.setupRepositoryFeatures();
    } catch (error) {
      this.handleRepositoryError(repoList, error);
    } finally {
      this.state.isLoading = false;
    }
  }

  // Fetch repositories with retry logic
  async fetchRepositoriesWithRetry(attempt = 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(
        `https://api.github.com/users/${this.config.username}/repos?sort=updated&per_page=100`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        await this.delay(this.config.retryDelay * attempt);
        return this.fetchRepositoriesWithRetry(attempt + 1);
      }
      throw error;
    }
  }

  // Process and filter repositories
  processRepositories(repos) {
    return repos
      .filter(repo => !repo.fork && repo.name !== this.config.username)
      .map(repo => ({
        ...repo,
        displayName: this.formatRepoName(repo.name),
        description: repo.description || 'No description available.',
        language: repo.language || 'Text',
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        lastUpdated: new Date(repo.updated_at),
        topics: repo.topics || []
      }))
      .sort((a, b) => {
        if (b.stars !== a.stars) return b.stars - a.stars;
        return b.lastUpdated - a.lastUpdated;
      });
  }

  // Enhanced repository rendering with search and filter
  renderRepositories(repos) {
    const repoList = document.getElementById('repo-list');
    const filteredRepos = this.filterRepositories(repos);
    
    repoList.innerHTML = '';
    
    if (filteredRepos.length === 0) {
      this.showNoResults(repoList);
      return;
    }
    
    const fragment = document.createDocumentFragment();
    filteredRepos.slice(0, this.config.maxRepos).forEach((repo, index) => {
      const repoCard = this.createEnhancedRepoCard(repo, index);
      fragment.appendChild(repoCard);
    });
    
    repoList.appendChild(fragment);
    this.animateRepoCards();
  }

  // Filter repositories based on search and language
  filterRepositories(repos) {
    return repos.filter(repo => {
      const matchesSearch = !this.state.searchQuery || 
        repo.displayName.toLowerCase().includes(this.state.searchQuery.toLowerCase()) ||
        repo.description.toLowerCase().includes(this.state.searchQuery.toLowerCase());
      
      const matchesLanguage = this.state.selectedLanguage === 'all' || 
        repo.language.toLowerCase() === this.state.selectedLanguage.toLowerCase();
      
      return matchesSearch && matchesLanguage;
    });
  }

  // Create enhanced repository card
  createEnhancedRepoCard(repo, index) {
    const card = document.createElement('div');
    card.className = 'repo-card';
    card.style.animationDelay = `${index * 100}ms`;
    card.setAttribute('data-repo-id', repo.id);
    
    const lastUpdated = this.formatDate(repo.lastUpdated);
    const topicsHtml = repo.topics.length > 0 ? 
      `<div class="repo-topics">${repo.topics.slice(0, 3).map(topic => 
        `<span class="topic-tag">${topic}</span>`
      ).join('')}</div>` : '';
    
    card.innerHTML = `
      <div class="repo-header">
        <h3>
          <a href="${repo.html_url}" target="_blank" rel="noopener" class="repo-link">
            ${repo.displayName}
            <svg class="external-link-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15,3 21,3 21,9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </h3>
        <button class="repo-favorite" data-repo-id="${repo.id}" title="Add to favorites">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
          </svg>
        </button>
      </div>
      <p class="repo-description">${repo.description}</p>
      ${topicsHtml}
      <div class="repo-stats">
        <span class="stat-item" title="Stars">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
          </svg>
          ${repo.stars}
        </span>
        <span class="stat-item" title="Forks">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="18" r="3"></circle>
            <circle cx="6" cy="6" r="3"></circle>
            <circle cx="18" cy="6" r="3"></circle>
            <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"></path>
            <path d="M12 12v3"></path>
          </svg>
          ${repo.forks}
        </span>
        <span class="stat-item" title="Primary Language">
          <span class="language-dot" style="background-color: ${this.getLanguageColor(repo.language)}"></span>
          ${repo.language}
        </span>
        <span class="stat-item updated-date" title="Last updated">
          Updated ${lastUpdated}
        </span>
      </div>
    `;
    
    // Add click tracking
    card.addEventListener('click', () => this.trackRepoClick(repo));
    
    return card;
  }

  // Setup search and filter functionality
  setupSearchAndFilter() {
    const searchInput = document.getElementById('repo-search');
    const languageFilter = document.getElementById('language-filter');
    
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce((e) => {
        this.state.searchQuery = e.target.value;
        this.renderRepositories(this.state.repos);
      }, 300));
    }
    
    if (languageFilter) {
      languageFilter.addEventListener('change', (e) => {
        this.state.selectedLanguage = e.target.value;
        this.renderRepositories(this.state.repos);
      });
    }
  }

  // Setup repository-specific features
  setupRepositoryFeatures() {
    // Favorite functionality
    document.querySelectorAll('.repo-favorite').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(btn.dataset.repoId);
      });
    });
    
    // Update language filter options
    this.updateLanguageFilter();
  }

  // Theme management
  setupTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', this.toggleTheme.bind(this));
    }
    this.applyTheme(this.state.currentTheme);
  }

  toggleTheme() {
    this.state.currentTheme = this.state.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(this.state.currentTheme);
    this.storeTheme(this.state.currentTheme);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = document.querySelector('#theme-toggle .theme-icon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  // Setup progress indicator
  setupProgressIndicator() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.innerHTML = '<div class="scroll-progress-bar"></div>';
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', this.throttle(this.updateScrollProgress.bind(this), 16));
  }

  updateScrollProgress() {
    const scrolled = window.pageYOffset;
    const maxHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrolled / maxHeight) * 100;
    
    const progressBar = document.querySelector('.scroll-progress-bar');
    if (progressBar) {
      progressBar.style.width = `${Math.min(progress, 100)}%`;
    }
  }

  // Enhanced animations
  initializeAnimations() {
    this.setupIntersectionObserver();
    this.setupParallaxEffects();
    this.setupMouseEffects();
  }

  setupIntersectionObserver() {
    const options = {
      threshold: [0.1, 0.5, 0.9],
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(this.handleIntersection.bind(this), options);
    
    document.querySelectorAll('.section, .repo-card').forEach(element => {
      element.style.opacity = '0';
      element.style.transform = 'translateY(30px)';
      element.style.transition = 'opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      observer.observe(element);
    });
    
    this.observers.set('intersection', observer);
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        
        // Add staggered animation for repo cards
        if (entry.target.classList.contains('repo-card')) {
          const delay = Array.from(entry.target.parentNode.children).indexOf(entry.target) * 100;
          entry.target.style.transitionDelay = `${delay}ms`;
        }
      }
    });
  }
  setupTooltips() {
    document.querySelectorAll('[title]').forEach(element => {
      element.addEventListener('mouseenter', this.showTooltip.bind(this));
      element.addEventListener('mouseleave', this.hideTooltip.bind(this));
    });
  }


  setupPerformanceOptimizations() {
 
    this.preloadCriticalResources();

    this.setupLazyLoading();
    this.monitorPerformance();
  }

  preloadCriticalResources() {
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preconnect';
    preloadLink.href = 'https://api.github.com';
    document.head.appendChild(preloadLink);
  }

  // Keyboard navigation
  setupKeyboardNavigation() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  handleKeyDown(event) {
    if (event.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
    }
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'k':
          event.preventDefault();
          this.focusSearch();
          break;
        case '/':
          event.preventDefault();
          this.focusSearch();
          break;
      }
    }
  }
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout =setTimeout(() =>func.apply(this, args), wait);
    };
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  formatRepoName(name) {
    return name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  formatDate(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  }
  getLanguageColor(language) {
    const colors = {
      JavaScript: '#f1e05a',
      Python: '#3572A5',
      HTML: '#e34c26',
      CSS: '#563d7c',
      TypeScript: '#2b7489',
      Java: '#b07219',
      C: '#555555',
      'C++': '#f34b7d',
      PHP: '#4F5D95',
      Ruby: '#701516',
      Go: '#00ADD8',
      Rust: '#dea584',
      Swift: '#ffac45',
      Kotlin: '#F18E33'
    };
    return colors[language] || '#8b949e';
  }
  handleError(message, error) {
    console.error(`${message}:`, error);
    this.showNotification(`${message}. Please try again later.`, 'error');
  }
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
  getStoredTheme() {
    return localStorage.getItem('portfolio-theme') || 'dark';
  }
  storeTheme(theme) {
    localStorage.setItem('portfolio-theme', theme);
  }
  handleScroll() {
    this.updateActiveNavigation();
    this.updateScrollProgress();
  }
  updateActiveNavigation() {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.sidebar nav a');
    let currentSection = '';
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 100 && rect.bottom >= 100) {
        currentSection = section.id;
      }
    });
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSection}`) {
        link.classList.add('active');
      }
    });
    
    this.state.activeSection = currentSection;
  }
  showLoadingState(container) {
    container.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-text">Loading projects...</p>
      </div>
    `;
  }

  handleRepositoryError(container, error) {
    container.innerHTML = `
      <div class="error-container">
        <h3>Unable to load projects</h3>
        <p>Please check your connection and try again.</p>
        <button class="retry-button" onclick="portfolioManager.loadRepositories()">
          Retry
        </button>
      </div>
    `;
  }
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}
let portfolioManager;

document.addEventListener('DOMContentLoaded', () => {
  portfolioManager = new PortfolioManager();
});

window.addEventListener('beforeunload', () => {
  if (portfolioManager) {
    portfolioManager.destroy();
  }
});
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PortfolioManager;
}