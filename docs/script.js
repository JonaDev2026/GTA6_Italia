const menu = document.getElementById('menu');
const nav = document.getElementById('nav');

if (menu && nav) {
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
  }));
}

const revealObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {threshold: .12})
  : null;

document.querySelectorAll('.reveal').forEach(el => {
  if (revealObserver) revealObserver.observe(el);
  else el.classList.add('visible');
});

const postsFeed = document.querySelector('.posts-feed');
const dotsWrap = document.querySelector('.posts-dots');
let postCards = [];
let postDots = [];
let autoplayTimer;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function setActivePost() {
  if (!postsFeed || !postCards.length) return;
  let activeIndex = 0;
  let nearestDistance = Infinity;

  postCards.forEach((card, index) => {
    const distance = Math.abs(card.offsetLeft - postCards[0].offsetLeft - postsFeed.scrollLeft);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      activeIndex = index;
    }
  });

  postDots.forEach((dot, index) => {
    const active = index === activeIndex;
    dot.classList.toggle('active', active);
    dot.setAttribute('aria-current', String(active));
  });
}

function goToPost(index) {
  const card = postCards[index];
  if (!card || !postsFeed) return;
  postsFeed.scrollTo({
    left: card.offsetLeft - postCards[0].offsetLeft,
    behavior: reducedMotion.matches ? 'auto' : 'smooth'
  });
}

function stopAutoplay() {
  window.clearInterval(autoplayTimer);
  autoplayTimer = undefined;
}

function startAutoplay() {
  if (autoplayTimer || reducedMotion.matches || document.hidden || postCards.length < 2) return;
  autoplayTimer = window.setInterval(() => {
    const currentIndex = postDots.findIndex(dot => dot.classList.contains('active'));
    goToPost((currentIndex + 1) % postCards.length);
  }, 5000);
}

function makePostCard(post) {
  const code = String(post.code || '');
  const caption = String(post.caption_text || '').trim();
  const lines = caption.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const title = (lines.shift() || 'Post GTA6ITALIA').replace(/#[\p{L}\p{N}_]+/gu, '').trim();
  const description = lines.join(' ').replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\s+/g, ' ').trim();
  const card = document.createElement('a');
  card.className = 'post-card reveal';
  card.href = 'https://www.instagram.com/p/' + encodeURIComponent(code) + '/';
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  card.setAttribute('aria-label', title + ' — apri su Instagram');

  const image = document.createElement('img');
  image.className = 'post-image';
  image.loading = 'lazy';
  image.alt = title;
  image.src = post.thumbnail_url || '';
  image.addEventListener('error', () => {
    image.alt = 'Immagine non disponibile su Instagram';
    image.style.display = 'none';
  }, {once: true});

  const body = document.createElement('div');
  body.className = 'post-body';
  const heading = document.createElement('h3');
  heading.textContent = title;
  body.appendChild(heading);

  if (description) {
    const paragraph = document.createElement('p');
    paragraph.textContent = description.length > 260 ? description.slice(0, 257).trimEnd() + '…' : description;
    body.appendChild(paragraph);
  }

  const footer = document.createElement('div');
  footer.className = 'post-footer';
  const type = document.createElement('span');
  type.textContent = post.product_type === 'clips' || Number(post.media_type) === 2 ? 'REEL' : 'POST';
  const separator = document.createElement('span');
  separator.textContent = '·';
  const date = document.createElement('span');
  const parsedDate = new Date(post.taken_at);
  date.textContent = Number.isNaN(parsedDate.getTime())
    ? 'GTA6ITALIA'
    : new Intl.DateTimeFormat('it-IT', {day: '2-digit', month: 'short', year: 'numeric'}).format(parsedDate);
  footer.append(type, separator, date);
  card.append(image, body, footer);

  if (revealObserver) revealObserver.observe(card);
  else card.classList.add('visible');
  return card;
}

function renderPosts(posts) {
  if (!postsFeed || !dotsWrap || !Array.isArray(posts)) return;
  const validPosts = posts
    .filter(post => post && post.code && post.thumbnail_url && post.caption_text)
    .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());

  if (!validPosts.length) throw new Error('Nessun post disponibile');

  const fragment = document.createDocumentFragment();
  validPosts.forEach(post => fragment.appendChild(makePostCard(post)));
  postsFeed.replaceChildren(fragment);

  const dotsFragment = document.createDocumentFragment();
  validPosts.forEach((post, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'posts-dot' + (index === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Post ' + (index + 1));
    dot.setAttribute('aria-current', String(index === 0));
    dot.addEventListener('click', () => goToPost(index));
    dotsFragment.appendChild(dot);
  });
  dotsWrap.replaceChildren(dotsFragment);

  postCards = [...postsFeed.querySelectorAll('.post-card')];
  postDots = [...dotsWrap.querySelectorAll('.posts-dot')];
  postsFeed.scrollLeft = 0;
  setActivePost();
  stopAutoplay();
  startAutoplay();
}

async function readPosts(url, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (!data || !Array.isArray(data.posts)) throw new Error('Formato export non valido');
    return data.posts;
  } finally {
    window.clearTimeout(timeout);
  }
}

if (postsFeed && dotsWrap) {
  postsFeed.addEventListener('scroll', setActivePost, {passive: true});
  window.addEventListener('resize', setActivePost);
  postsFeed.addEventListener('pointerenter', stopAutoplay);
  postsFeed.addEventListener('pointerleave', startAutoplay);
  postsFeed.addEventListener('focusin', stopAutoplay);
  postsFeed.addEventListener('focusout', event => {
    if (!postsFeed.contains(event.relatedTarget)) startAutoplay();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });
  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) stopAutoplay();
    else startAutoplay();
  });

  function showPostsUnavailable() {
    stopAutoplay();
    postCards = [];
    postDots = [];
    postsFeed.replaceChildren();
    dotsWrap.replaceChildren();
    const message = document.createElement('p');
    message.className = 'posts-status';
    message.textContent = 'Servizio non disponibile. Ricarica il sito.';
    postsFeed.appendChild(message);
  }

  (async () => {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const posts = await readPosts('https://igtrackr.com/api/profile/gta6_italia/export?format=json');
        renderPosts(posts);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 2) await new Promise(resolve => window.setTimeout(resolve, (attempt + 1) * 1000));
      }
    }
    showPostsUnavailable();
    console.error('Feed Instagram non disponibile:', lastError);
  })();
}
