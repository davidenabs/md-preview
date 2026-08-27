(function () {
  const vscode = acquireVsCodeApi();
  const contentDiv = document.getElementById('content');

  // Configure marked for highlight.js
  marked.setOptions({
    highlight: function(code, lang) {
      if (lang && lang.toLowerCase() === 'mermaid') {
        return '<div class="mermaid">' + code + '</div>';
      }
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch (__) {}
      }
      return code; // use external default escaping
    }
  });

  // Custom renderers
  marked.use({
    renderer: {
      blockquote(token) {
        const text = token.text || '';
        const match = text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n(.*)$/is);
        
        if (match) {
          const type = match[1].toLowerCase();
          const contentText = match[2];
          
          const iconMap = {
            'note': 'ℹ️',
            'tip': '💡',
            'important': '🔥',
            'warning': '⚠️',
            'caution': '🛑'
          };
          
          const parsedContent = marked.parse(contentText);
          
          return `<div class="github-alert github-alert-${type}">
            <div class="github-alert-title">
              <span class="github-alert-icon">${iconMap[type]}</span>
              ${type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
            <div class="github-alert-content">${parsedContent}</div>
          </div>\n`;
        }
        
        // Return false to use the default renderer for normal blockquotes
        return false;
      },
      code(token) {
        if (token.lang === 'carousel') {
          const code = token.text;
          const slides = code.split('<!-- slide -->').map(slide => slide.trim());
          
          let html = '<div class="carousel-container">';
          html += '<div class="carousel-slides">';
          
          slides.forEach((slide, index) => {
            // recursively parse the content inside
            const slideHtml = marked.parse(slide);
            const activeClass = index === 0 ? ' active' : '';
            html += `<div class="carousel-slide${activeClass}" data-index="${index}">${slideHtml}</div>`;
          });
          
          html += '</div>';
          
          if (slides.length > 1) {
            html += `<div class="carousel-controls">
              <button class="carousel-prev" data-action="prev">◀</button>
              <div class="carousel-indicators">`;
            slides.forEach((_, index) => {
              const activeClass = index === 0 ? ' active' : '';
              html += `<span class="carousel-indicator${activeClass}" data-action="goto" data-index="${index}"></span>`;
            });
            html += `</div>
              <button class="carousel-next" data-action="next">▶</button>
            </div>`;
          }
          html += '</div>';
          return html;
        }
        // Return false to use the default renderer for other code blocks
        return false;
      }
    }
  });

  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
  });

  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
      case 'update':
        const rawHtml = marked.parse(message.text);
        // We use DOMPurify to prevent XSS but allow mermaid classes
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['div', 'button', 'span'],
          ADD_ATTR: ['class', 'data-action', 'data-index']
        });
        
        contentDiv.innerHTML = cleanHtml;
        
        // Re-run mermaid
        mermaid.run({
          querySelector: '.mermaid',
          suppressErrors: true
        });
        break;
    }
  });

  // Notify extension that webview is ready
  vscode.postMessage({ command: 'ready' });

  // Event delegation for carousel
  document.body.addEventListener('click', e => {
    if (e.target.closest('[data-action="prev"]')) {
      moveCarousel(e.target.closest('.carousel-container'), -1);
    } else if (e.target.closest('[data-action="next"]')) {
      moveCarousel(e.target.closest('.carousel-container'), 1);
    } else if (e.target.closest('[data-action="goto"]')) {
      const indicator = e.target.closest('[data-action="goto"]');
      goToSlide(indicator.closest('.carousel-container'), parseInt(indicator.dataset.index, 10));
    }
  });

  function moveCarousel(container, direction) {
    if (!container) return;
    const slides = container.querySelectorAll('.carousel-slide');
    let activeIndex = Array.from(slides).findIndex(s => s.classList.contains('active'));
    let newIndex = activeIndex + direction;
    if (newIndex < 0) newIndex = slides.length - 1;
    if (newIndex >= slides.length) newIndex = 0;
    goToSlide(container, newIndex);
  }

  function goToSlide(container, index) {
    if (!container) return;
    const slides = container.querySelectorAll('.carousel-slide');
    const indicators = container.querySelectorAll('.carousel-indicator');
    
    slides.forEach((s, i) => s.classList.toggle('active', i === index));
    indicators.forEach((ind, i) => ind.classList.toggle('active', i === index));
  }
})();
