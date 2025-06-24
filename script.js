console.log('Portfolio script starting...');
// Add a test alert to make sure script is running
window.addEventListener('load', () => {
  console.log('Window loaded, testing GitHub API...');
  fetch('https://api.github.com/users/usamasikandar67/repos?sort=updated&per_page=6')
    .then(response => response.json())
    .then(data => {
      console.log('GitHub API test successful:', data.length, 'repos found');
    })
    .catch(error => {
      console.error('GitHub API test failed:', error);
    });
});

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

  async init() {
    try {
      console.log('Initializing PortfolioManager...');
      this.setupEventListeners();
      this.initializeAnimations();
      this.setupTheme();
      this.setupKeyboardNavigation();
      this.setupSearchAndFilter();
      this.setupPerformanceOptimizations();
      this.setupProgressIndicator();
      this.setupTooltips();
      
      // Load repositories after DOM is ready
      console.log('Loading repositories...');
      await this.loadRepositories();
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
  }  // Enhanced repository loading with retry logic
  async loadRepositories() {
    console.log('Loading repositories...');
    if (this.state.isLoading) return;
    
    this.state.isLoading = true;
    const projectsGrid = document.getElementById('projects-grid');
    
    if (!projectsGrid) {
      console.error('Projects grid element not found');
      return;
    }
    
    this.showLoadingState(projectsGrid);
    
    try {
      console.log('Fetching repositories from GitHub...');
      const repos = await this.fetchRepositoriesWithRetry();
      console.log('Fetched repos:', repos?.length || 0);
      this.state.repos = this.processRepositories(repos);
      console.log('Processed repos:', this.state.repos?.length || 0);
      this.renderRepositories(this.state.repos);
      this.setupRepositoryFeatures();
    } catch (error) {
      console.error('Error loading repositories:', error);
      this.handleRepositoryError(projectsGrid, error);
    } finally {
      this.state.isLoading = false;
    }
  }
  // Fetch repositories with retry logic
  async fetchRepositoriesWithRetry(attempt = 1) {
    try {
      console.log(`Attempting to fetch repositories (attempt ${attempt})`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const url = `https://api.github.com/users/${this.config.username}/repos?sort=updated&per_page=100`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, { signal: controller.signal });
      
      clearTimeout(timeoutId);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Successfully fetched repositories:', data.length);
      return data;
    } catch (error) {
      console.error(`Fetch attempt ${attempt} failed:`, error);
      if (attempt < this.config.retryAttempts) {
        console.log(`Retrying in ${this.config.retryDelay * attempt}ms...`);
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
    const projectsGrid = document.getElementById('projects-grid');
    const filteredRepos = this.filterRepositories(repos);
    
    projectsGrid.innerHTML = '';
    
    if (filteredRepos.length === 0) {
      this.showNoResults(projectsGrid);
      return;
    }
    
    const fragment = document.createDocumentFragment();
    filteredRepos.slice(0, this.config.maxRepos).forEach((repo, index) => {
      const repoCard = this.createEnhancedRepoCard(repo, index);
      fragment.appendChild(repoCard);
    });
    
    projectsGrid.appendChild(fragment);
    this.animateRepoCards();
  }

  // Filter repositories based on search and language
  filterRepositories(repos) {
    return repos.filter(repo => {
      const matchesSearch = this.state.searchQuery === '' || 
        repo.name.toLowerCase().includes(this.state.searchQuery.toLowerCase()) ||
        repo.description.toLowerCase().includes(this.state.searchQuery.toLowerCase());
      
      const matchesLanguage = this.state.selectedLanguage === 'all' ||
        repo.language?.toLowerCase() === this.state.selectedLanguage.toLowerCase();
      
      return matchesSearch && matchesLanguage;
    });
  }

  // Create enhanced repository card
  createEnhancedRepoCard(repo, index) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.setAttribute('data-category', this.getProjectCategory(repo));
    card.style.animationDelay = `${index * 0.1}s`;
    
    const languageColor = this.getLanguageColor(repo.language);
    const topics = repo.topics?.slice(0, 3) || [];
    
    card.innerHTML = `
      <div class="project-image">
        <div class="project-icon">
          <i class="${this.getProjectIcon(repo)}"></i>
        </div>
        <div class="project-stats">
          <span class="stat"><i class="fas fa-star"></i> ${repo.stars}</span>
          <span class="stat"><i class="fas fa-code-branch"></i> ${repo.forks}</span>
        </div>
      </div>
      <div class="project-content">
        <h3 class="project-title">${repo.displayName}</h3>
        <p class="project-description">${repo.description}</p>
        <div class="project-tech">
          ${repo.language ? `<span class="tech-tag" style="background-color: ${languageColor}20; color: ${languageColor};">${repo.language}</span>` : ''}
          ${topics.map(topic => `<span class="tech-tag">${topic}</span>`).join('')}
        </div>
        <div class="project-links">
          <a href="${repo.html_url}" target="_blank" rel="noopener" class="project-link">
            <i class="fab fa-github"></i> Code
          </a>
          ${repo.homepage ? `<a href="${repo.homepage}" target="_blank" rel="noopener" class="project-link">
            <i class="fas fa-external-link-alt"></i> Live Demo
          </a>` : ''}
        </div>
      </div>
    `;
    
    return card;
  }

  // Get project category based on repository
  getProjectCategory(repo) {
    const language = repo.language?.toLowerCase() || '';
    const topics = repo.topics?.join(' ').toLowerCase() || '';
    const description = repo.description?.toLowerCase() || '';
    
    if (topics.includes('ai') || topics.includes('ml') || topics.includes('machine-learning') || 
        description.includes('ai') || description.includes('machine learning')) {
      return 'ai';
    } else if (language === 'swift' || language === 'kotlin' || language === 'java' || 
               topics.includes('android') || topics.includes('ios')) {
      return 'mobile';
    } else {
      return 'web';
    }
  }

  // Get project icon based on language and topics
  getProjectIcon(repo) {
    const language = repo.language?.toLowerCase() || '';
    const topics = repo.topics?.join(' ').toLowerCase() || '';
    
    if (topics.includes('ai') || topics.includes('ml')) return 'fas fa-brain';
    if (language === 'javascript') return 'fab fa-js-square';
    if (language === 'python') return 'fab fa-python';
    if (language === 'react' || topics.includes('react')) return 'fab fa-react';
    if (language === 'vue' || topics.includes('vue')) return 'fab fa-vuejs';
    if (language === 'swift') return 'fab fa-swift';
    if (language === 'kotlin' || language === 'java') return 'fab fa-android';
    return 'fas fa-code';
  }

  // Get language color
  getLanguageColor(language) {
    const colors = {
      'JavaScript': '#f1e05a',
      'Python': '#3572a5',
      'TypeScript': '#2b7489',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'Vue': '#2c3e50',
      'React': '#61dafb',
      'Java': '#b07219',
      'Swift': '#fa7343',
      'Kotlin': '#7f52ff'
    };
    return colors[language] || '#6b7280';
  }

  // Setup search and filter functionality
  setupSearchAndFilter() {
    // Project filters
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const filter = e.target.getAttribute('data-filter');
        this.filterProjects(filter);
      });
    });
  }

  // Filter projects by category
  filterProjects(category) {
    const projects = document.querySelectorAll('.project-card');
    
    projects.forEach(project => {
      const projectCategory = project.getAttribute('data-category');
      
      if (category === 'all' || projectCategory === category) {
        project.style.display = 'block';
        project.style.opacity = '0';
        project.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
          project.style.opacity = '1';
          project.style.transform = 'translateY(0)';
        }, 100);
      } else {
        project.style.opacity = '0';
        project.style.transform = 'translateY(-20px)';
        setTimeout(() => {
          project.style.display = 'none';
        }, 300);
      }
    });
  }

  // Format repository name for display
  formatRepoName(name) {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Show no results message
  showNoResults(container) {
    container.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h3>No projects found</h3>
        <p>Try adjusting your search or filter criteria.</p>
      </div>
    `;
  }

  // Animate repository cards
  animateRepoCards() {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      
      setTimeout(() => {
        card.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 100);
    });
  }
  // Enhanced repository rendering with search and filter
  renderRepositories(repos) {
    const projectsGrid = document.getElementById('projects-grid');
    const filteredRepos = this.filterRepositories(repos);
    
    projectsGrid.innerHTML = '';
    
    if (filteredRepos.length === 0) {
      this.showNoResults(projectsGrid);
      return;
    }
    
    const fragment = document.createDocumentFragment();
    filteredRepos.slice(0, this.config.maxRepos).forEach((repo, index) => {
      const repoCard = this.createEnhancedRepoCard(repo, index);
      fragment.appendChild(repoCard);
    });
    
    projectsGrid.appendChild(fragment);
    this.animateRepoCards();
  }

  // Filter repositories based on search and language
  filterRepositories(repos) {
    return repos.filter(repo => {
      const matchesSearch = this.state.searchQuery === '' || 
        repo.name.toLowerCase().includes(this.state.searchQuery.toLowerCase()) ||
        repo.description.toLowerCase().includes(this.state.searchQuery.toLowerCase());
      
      const matchesLanguage = this.state.selectedLanguage === 'all' ||
        repo.language?.toLowerCase() === this.state.selectedLanguage.toLowerCase();
      
      return matchesSearch && matchesLanguage;
    });
  }

  // Create enhanced repository card
  createEnhancedRepoCard(repo, index) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.setAttribute('data-category', this.getProjectCategory(repo));
    card.style.animationDelay = `${index * 0.1}s`;
    
    const languageColor = this.getLanguageColor(repo.language);
    const topics = repo.topics?.slice(0, 3) || [];
    
    card.innerHTML = `
      <div class="project-image">
        <div class="project-icon">
          <i class="${this.getProjectIcon(repo)}"></i>
        </div>
        <div class="project-stats">
          <span class="stat"><i class="fas fa-star"></i> ${repo.stars}</span>
          <span class="stat"><i class="fas fa-code-branch"></i> ${repo.forks}</span>
        </div>
      </div>
      <div class="project-content">
        <h3 class="project-title">${repo.displayName}</h3>
        <p class="project-description">${repo.description}</p>
        <div class="project-tech">
          ${repo.language ? `<span class="tech-tag" style="background-color: ${languageColor}20; color: ${languageColor};">${repo.language}</span>` : ''}
          ${topics.map(topic => `<span class="tech-tag">${topic}</span>`).join('')}
        </div>
        <div class="project-links">
          <a href="${repo.html_url}" target="_blank" rel="noopener" class="project-link">
            <i class="fab fa-github"></i> Code
          </a>
          ${repo.homepage ? `<a href="${repo.homepage}" target="_blank" rel="noopener" class="project-link">
            <i class="fas fa-external-link-alt"></i> Live Demo
          </a>` : ''}
        </div>
      </div>
    `;
    
    return card;
  }

  // Get project category based on repository
  getProjectCategory(repo) {
    const language = repo.language?.toLowerCase() || '';
    const topics = repo.topics?.join(' ').toLowerCase() || '';
    const description = repo.description?.toLowerCase() || '';
    
    if (topics.includes('ai') || topics.includes('ml') || topics.includes('machine-learning') || 
        description.includes('ai') || description.includes('machine learning')) {
      return 'ai';
    } else if (language === 'swift' || language === 'kotlin' || language === 'java' || 
               topics.includes('android') || topics.includes('ios')) {
      return 'mobile';
    } else {
      return 'web';
    }
  }

  // Get project icon based on language and topics
  getProjectIcon(repo) {
    const language = repo.language?.toLowerCase() || '';
    const topics = repo.topics?.join(' ').toLowerCase() || '';
    
    if (topics.includes('ai') || topics.includes('ml')) return 'fas fa-brain';
    if (language === 'javascript') return 'fab fa-js-square';
    if (language === 'python') return 'fab fa-python';
    if (language === 'react' || topics.includes('react')) return 'fab fa-react';
    if (language === 'vue' || topics.includes('vue')) return 'fab fa-vuejs';
    if (language === 'swift') return 'fab fa-swift';
    if (language === 'kotlin' || language === 'java') return 'fab fa-android';
    return 'fas fa-code';
  }

  // Get language color
  getLanguageColor(language) {
    const colors = {
      'JavaScript': '#f1e05a',
      'Python': '#3572a5',
      'TypeScript': '#2b7489',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'Vue': '#2c3e50',
      'React': '#61dafb',
      'Java': '#b07219',
      'Swift': '#fa7343',
      'Kotlin': '#7f52ff'
    };
    return colors[language] || '#6b7280';
  }

  // Setup search and filter functionality
  setupSearchAndFilter() {
    // Project filters
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const filter = e.target.getAttribute('data-filter');
        this.filterProjects(filter);
      });
    });
  }

  // Filter projects by category
  filterProjects(category) {
    const projects = document.querySelectorAll('.project-card');
    
    projects.forEach(project => {
      const projectCategory = project.getAttribute('data-category');
      
      if (category === 'all' || projectCategory === category) {
        project.style.display = 'block';
        project.style.opacity = '0';
        project.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
          project.style.opacity = '1';
          project.style.transform = 'translateY(0)';
        }, 100);
      } else {
        project.style.opacity = '0';
        project.style.transform = 'translateY(-20px)';
        setTimeout(() => {
          project.style.display = 'none';
        }, 300);
      }
    });
  }

  // Format repository name for display
  formatRepoName(name) {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Show no results message
  showNoResults(container) {
    container.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h3>No projects found</h3>
        <p>Try adjusting your search or filter criteria.</p>
      </div>
    `;
  }

  // Animate repository cards
  animateRepoCards() {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      
      setTimeout(() => {
        card.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 100);
    });
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
  // Setup repository features after loading
  setupRepositoryFeatures() {
    // Add any additional features like tooltips, click handlers, etc.
    this.setupProjectCardInteractions();
  }

  // Setup project card interactions
  setupProjectCardInteractions() {
    const projectCards = document.querySelectorAll('.project-card');
    
    projectCards.forEach(card => {
      // Add hover effects
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-5px)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
      });
    });
  }

  // Utility functions
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }

  debounce(func, wait, immediate) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      const later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

  // Handle visibility change for performance
  handleVisibilityChange() {
    if (document.hidden) {
      // Pause animations or reduce activity when tab is not visible
      document.querySelectorAll('.floating-elements .element').forEach(element => {
        element.style.animationPlayState = 'paused';
      });
    } else {
      // Resume animations when tab becomes visible
      document.querySelectorAll('.floating-elements .element').forEach(element => {
        element.style.animationPlayState = 'running';
      });
    }
  }

  // Handle online/offline status
  handleOnlineStatus() {
    if (navigator.onLine) {
      this.showNotification('Connection restored', 'success');
      // Retry loading repositories if they failed to load
      if (this.state.repos.length === 0) {
        this.loadRepositories();
      }
    } else {
      this.showNotification('Connection lost. Some features may not work.', 'warning');
    }
  }

  // Handle resize events
  handleResize() {
    // Update layouts that depend on viewport size
    this.updateMobileLayout();
  }

  // Update mobile layout
  updateMobileLayout() {
    const isMobile = window.innerWidth <= 768;
    const sidebar = document.getElementById('sidebar');
    
    if (isMobile) {
      sidebar.classList.add('mobile');
    } else {
      sidebar.classList.remove('mobile');
    }
  }

  // Announce navigation for accessibility
  announceNavigation(target) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Navigated to ${target.querySelector('h2')?.textContent || 'section'}`;
    
    document.body.appendChild(announcement);
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Setup theme functionality
  setupTheme() {
    const themeToggle = document.querySelector('.theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    // Apply stored theme
    document.documentElement.setAttribute('data-theme', this.state.currentTheme);
    this.updateThemeIcon(themeIcon, this.state.currentTheme);
    
    // Theme toggle handler
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const newTheme = this.state.currentTheme === 'dark' ? 'light' : 'dark';
        this.state.currentTheme = newTheme;
        document.documentElement.setAttribute('data-theme', newTheme);
        this.storeTheme(newTheme);
        this.updateThemeIcon(themeIcon, newTheme);
      });
    }
  }

  // Update theme icon
  updateThemeIcon(icon, theme) {
    if (icon) {
      icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  }

  // Setup keyboard navigation
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-nav');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-nav');
    });
  }

  // Setup performance optimizations
  setupPerformanceOptimizations() {
    // Lazy load images
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            observer.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  // Setup progress indicator
  setupProgressIndicator() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress-bar';
    document.body.appendChild(progressBar);
  }

  // Setup tooltips
  setupTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
      element.addEventListener('mouseenter', (e) => {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = e.target.getAttribute('data-tooltip');
        document.body.appendChild(tooltip);
        
        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
      });
      
      element.addEventListener('mouseleave', () => {
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) {
          tooltip.remove();
        }
      });
    });
  }

  // Setup parallax effects
  setupParallaxEffects() {
    const floatingElements = document.querySelectorAll('.floating-elements .element');
    
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const parallax = scrolled * 0.5;
      
      floatingElements.forEach((element, index) => {
        const speed = parseFloat(element.getAttribute('data-speed')) || 0.5;
        const yPos = -(scrolled * speed);
        element.style.transform = `translateY(${yPos}px) rotate(${scrolled * 0.1 + index * 45}deg)`;
      });
    });
  }

  // Setup mouse effects
  setupMouseEffects() {
    document.addEventListener('mousemove', (e) => {
      const cursor = document.querySelector('.custom-cursor');
      if (cursor) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      }
    });
  }

  // Enhanced error handling
  handleError(message, error) {
    console.error(message, error);
    this.showNotification(`${message}. Please try again later.`, 'error');
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

// Global functions for HTML event handlers
function toggleTheme() {
  if (portfolioManager) {
    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.click();
  }
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  
  if (mobileMenuToggle && sidebar) {
    mobileMenuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      mobileMenuToggle.classList.toggle('active');
    });
  }

  // Contact form handling
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactForm);
  }

  // Scroll to top button
  const scrollTopBtn = document.getElementById('scroll-top');
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Show/hide scroll to top button
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 300) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    });
  }
});

// Handle contact form submission
async function handleContactForm(e) {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const submitBtn = form.querySelector('.submit-btn');
  
  // Disable submit button
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  
  try {
    // In a real application, you would send this to your backend
    // For now, we'll simulate a successful submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Show success message
    portfolioManager.showNotification('Message sent successfully!', 'success');
    form.reset();
    
  } catch (error) {
    portfolioManager.showNotification('Failed to send message. Please try again.', 'error');
  } finally {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
  }
}

// Animate stats counter
function animateCounter(element, target, duration = 2000) {
  let start = 0;
  const increment = target / (duration / 16);
  
  const counter = () => {
    start += increment;
    element.textContent = Math.floor(start);
    
    if (start < target) {
      requestAnimationFrame(counter);
    } else {
      element.textContent = target;
    }
  };
  
  counter();
}

// Initialize stats animation when they come into view
document.addEventListener('DOMContentLoaded', () => {
  const statNumbers = document.querySelectorAll('.stat-number');
  
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.getAttribute('data-count'));
        animateCounter(entry.target, target);
        statsObserver.unobserve(entry.target);
      }
    });
  });
  
  statNumbers.forEach(stat => {
    statsObserver.observe(stat);
  });
});