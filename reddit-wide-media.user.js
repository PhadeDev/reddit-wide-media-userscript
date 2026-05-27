// ==UserScript==
// @name         Reddit Wide Media
// @namespace    local.reddit.wide-media
// @version      0.1.1
// @description  Force old Reddit, widen the layout, and lazily expand large inline media for ultrawide browsing.
// @match        https://reddit.com/*
// @match        https://www.reddit.com/*
// @match        https://old.reddit.com/*
// @match        https://np.reddit.com/*
// @homepageURL  https://github.com/PhadeDev/reddit-wide-media-userscript
// @supportURL   https://github.com/PhadeDev/reddit-wide-media-userscript/issues
// @downloadURL  https://raw.githubusercontent.com/PhadeDev/reddit-wide-media-userscript/main/reddit-wide-media.user.js
// @updateURL    https://raw.githubusercontent.com/PhadeDev/reddit-wide-media-userscript/main/reddit-wide-media.user.js
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
  "use strict";

  const SCRIPT_CLASS = "rwm-enabled";
  const MEDIA_CLASS = "rwm-media";
  const PROCESSED_ATTR = "data-rwm-processed";

  const defaults = {
    redirect: true,
    wideMode: true,
    contentWidth: "1680",
    mediaMode: "large",
    autoMedia: true,
    resCompat: true,
  };

  const getSetting = (key) => {
    try {
      return GM_getValue(key, defaults[key]);
    } catch (_) {
      return defaults[key];
    }
  };

  const setSetting = (key, value) => {
    try {
      GM_setValue(key, value);
    } catch (_) {
      localStorage.setItem(`rwm.${key}`, String(value));
    }
  };

  const settings = Object.fromEntries(
    Object.keys(defaults).map((key) => [key, getSetting(key)]),
  );

  const REDIRECT_EXCEPTIONS = [
    /^\/login\b/i,
    /^\/register\b/i,
    /^\/account\b/i,
    /^\/settings\b/i,
    /^\/prefs\b/i,
    /^\/chat\b/i,
    /^\/appeal\b/i,
    /^\/password\b/i,
    /^\/verification\b/i,
    /^\/notifications\b/i,
    /^\/media\b/i,
    /^\/poll\b/i,
  ];

  function shouldRedirect() {
    if (!settings.redirect) return false;
    if (location.hostname === "old.reddit.com") return false;
    if (!/(^|\.)reddit\.com$/i.test(location.hostname)) return false;
    if (REDIRECT_EXCEPTIONS.some((pattern) => pattern.test(location.pathname))) return false;
    return true;
  }

  if (shouldRedirect()) {
    const target = new URL(location.href);
    target.hostname = "old.reddit.com";
    location.replace(target.href);
    return;
  }

  if (location.hostname !== "old.reddit.com") return;

  function addStyles() {
    const width = Number(settings.contentWidth) || Number(defaults.contentWidth);
    const mediaMaxHeight = settings.mediaMode === "huge" ? "92vh" : settings.mediaMode === "medium" ? "620px" : "820px";
    const mediaMaxWidth = settings.mediaMode === "huge" ? "100%" : settings.mediaMode === "medium" ? "900px" : "1180px";

    GM_addStyle(`
      html.${SCRIPT_CLASS} {
        background: #101214 !important;
      }

      html.${SCRIPT_CLASS} body {
        min-width: 0 !important;
        background: #101214 !important;
      }

      html.${SCRIPT_CLASS} #header {
        min-width: 0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .content {
        width: min(calc(100vw - 360px), ${width}px) !important;
        max-width: ${width}px !important;
        margin-left: 22px !important;
        margin-right: 320px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .listing-page .content,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .content,
      html.${SCRIPT_CLASS}.rwm-wide .search-page .content {
        padding-right: 0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .side {
        width: 290px !important;
        margin: 10px 16px 0 0 !important;
        background: transparent !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .linklisting {
        max-width: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link {
        margin: 0 0 13px 0 !important;
        padding: 10px 12px 12px 8px !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 4px !important;
        background: rgba(255, 255, 255, 0.025) !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .entry {
        overflow: visible !important;
        margin-left: 8px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .title {
        font-size: 16px !important;
        line-height: 1.35 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list {
        line-height: 1.45 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .commentarea {
        max-width: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comment {
        max-width: none !important;
      }

      html.${SCRIPT_CLASS} .${MEDIA_CLASS} {
        clear: both;
        margin: 10px 0 6px 0;
        max-width: ${mediaMaxWidth};
      }

      html.${SCRIPT_CLASS} .${MEDIA_CLASS}[hidden] {
        display: none !important;
      }

      html.${SCRIPT_CLASS} .${MEDIA_CLASS} img,
      html.${SCRIPT_CLASS} .${MEDIA_CLASS} video {
        display: block;
        max-width: 100%;
        max-height: ${mediaMaxHeight};
        width: auto;
        height: auto;
        object-fit: contain;
        background: #070809;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 4px;
      }

      html.${SCRIPT_CLASS} .${MEDIA_CLASS}.rwm-gallery {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
        gap: 10px;
        max-width: 100%;
      }

      html.${SCRIPT_CLASS} .${MEDIA_CLASS}.rwm-gallery img {
        width: 100%;
        max-height: ${mediaMaxHeight};
      }

      html.${SCRIPT_CLASS} .rwm-status {
        display: inline-block;
        margin: 8px 0 2px 0;
        padding: 5px 7px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.08);
        color: #aaa;
        font-size: 11px;
      }

      html.${SCRIPT_CLASS} .rwm-toggle {
        border: 0;
        border-radius: 4px;
        padding: 4px 7px;
        margin: 7px 0 0 0;
        cursor: pointer;
        background: #2d5d88;
        color: #fff;
        font-size: 11px;
      }

      @media (max-width: 1200px) {
        html.${SCRIPT_CLASS}.rwm-wide .content {
          width: auto !important;
          max-width: none !important;
          margin: 8px !important;
        }

        html.${SCRIPT_CLASS}.rwm-wide .side {
          display: none !important;
        }
      }
    `);
  }

  function registerMenu() {
    if (typeof GM_registerMenuCommand !== "function") return;

    GM_registerMenuCommand(`${settings.redirect ? "Disable" : "Enable"} old Reddit redirect`, () => {
      setSetting("redirect", !settings.redirect);
      location.reload();
    });

    GM_registerMenuCommand(`${settings.wideMode ? "Disable" : "Enable"} wide layout`, () => {
      setSetting("wideMode", !settings.wideMode);
      location.reload();
    });

    GM_registerMenuCommand(`Media size: ${settings.mediaMode}`, () => {
      const next = settings.mediaMode === "medium" ? "large" : settings.mediaMode === "large" ? "huge" : "medium";
      setSetting("mediaMode", next);
      location.reload();
    });

    GM_registerMenuCommand(`${settings.autoMedia ? "Disable" : "Enable"} auto media`, () => {
      setSetting("autoMedia", !settings.autoMedia);
      location.reload();
    });

    GM_registerMenuCommand(`Width: ${settings.contentWidth}px`, () => {
      const next = settings.contentWidth === "1400" ? "1680" : settings.contentWidth === "1680" ? "1920" : "1400";
      setSetting("contentWidth", next);
      location.reload();
    });
  }

  const imagePattern = /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i;
  const directImageHosts = /(^|\.)i\.redd\.it$|(^|\.)preview\.redd\.it$|(^|\.)i\.imgur\.com$/i;

  function normalizeUrl(rawUrl) {
    if (!rawUrl) return "";
    try {
      return new URL(rawUrl, location.href).href;
    } catch (_) {
      return "";
    }
  }

  function imageUrlFromPostUrl(rawUrl) {
    const url = normalizeUrl(rawUrl);
    if (!url) return "";

    try {
      const parsed = new URL(url);
      if (directImageHosts.test(parsed.hostname)) return parsed.href;
      if (imagePattern.test(parsed.pathname)) return parsed.href;
      if (/^\/media\//.test(parsed.pathname) && parsed.searchParams.has("url")) {
        return decodeURIComponent(parsed.searchParams.get("url") || "");
      }
    } catch (_) {
      return "";
    }

    return "";
  }

  function isRedditGallery(rawUrl) {
    const url = normalizeUrl(rawUrl);
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return /(^|\.)reddit\.com$/i.test(parsed.hostname) && /^\/gallery\/[a-z0-9]+/i.test(parsed.pathname);
    } catch (_) {
      return false;
    }
  }

  function isRedditVideo(rawUrl) {
    const url = normalizeUrl(rawUrl);
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return /(^|\.)v\.redd\.it$/i.test(parsed.hostname);
    } catch (_) {
      return false;
    }
  }

  function hasResMedia(thing) {
    if (!settings.resCompat) return false;
    return Boolean(
      thing.querySelector(".res-expando-box, .res-expando-box-open, .RESImage, .res-image, .res-media-host"),
    );
  }

  function getPostUrl(thing) {
    const dataUrl = thing.getAttribute("data-url");
    if (dataUrl) return dataUrl;
    const titleLink = thing.querySelector("a.title");
    return titleLink ? titleLink.href : "";
  }

  function getPermalink(thing) {
    const dataPermalink = thing.getAttribute("data-permalink");
    if (dataPermalink) return normalizeUrl(dataPermalink);
    const commentsLink = thing.querySelector('a.comments, a[href*="/comments/"]');
    return commentsLink ? normalizeUrl(commentsLink.href) : "";
  }

  function makeStatus(text) {
    const status = document.createElement("span");
    status.className = "rwm-status";
    status.textContent = text;
    return status;
  }

  function placeMediaContainer(thing) {
    const entry = thing.querySelector(".entry") || thing;
    const container = document.createElement("div");
    container.className = MEDIA_CLASS;
    container.hidden = true;
    entry.appendChild(container);
    return container;
  }

  function renderImage(container, src, alt = "") {
    const link = document.createElement("a");
    link.href = src;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.src = src;
    img.alt = alt;

    link.appendChild(img);
    container.appendChild(link);
    container.hidden = false;
  }

  function renderVideo(container, src) {
    const video = document.createElement("video");
    video.controls = true;
    video.loop = true;
    video.preload = "metadata";
    video.src = src;
    container.appendChild(video);
    container.hidden = false;
  }

  async function fetchPostJson(thing) {
    const permalink = getPermalink(thing);
    if (!permalink) return null;
    const jsonUrl = permalink.replace(/\/?$/, ".json");
    const response = await fetch(jsonUrl, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return json?.[0]?.data?.children?.[0]?.data || null;
  }

  function mediaItemsFromPostData(post) {
    if (!post) return [];

    const items = [];
    const video = post.secure_media?.reddit_video || post.media?.reddit_video;
    if (video?.fallback_url) {
      items.push({ type: "video", url: video.fallback_url.replace(/&amp;/g, "&") });
    }

    const metadata = post.media_metadata || {};
    const galleryItems = post.gallery_data?.items || [];
    for (const item of galleryItems) {
      const id = item.media_id;
      const meta = metadata[id];
      const source = meta?.s?.u || meta?.s?.gif || meta?.s?.mp4;
      if (source) {
        items.push({
          type: meta.e === "AnimatedImage" && meta.s?.mp4 ? "video" : "image",
          url: source.replace(/&amp;/g, "&"),
        });
      }
    }

    if (!items.length && post.url_overridden_by_dest) {
      const image = imageUrlFromPostUrl(post.url_overridden_by_dest);
      if (image) items.push({ type: "image", url: image });
    }

    return items;
  }

  async function renderFetchedMedia(thing, container) {
    container.hidden = false;
    container.appendChild(makeStatus("Loading media..."));

    try {
      const post = await fetchPostJson(thing);
      const items = mediaItemsFromPostData(post);
      container.textContent = "";

      if (!items.length) {
        container.appendChild(makeStatus("No expandable media found"));
        return;
      }

      if (items.length > 1) container.classList.add("rwm-gallery");
      for (const item of items.slice(0, 20)) {
        if (item.type === "video") renderVideo(container, item.url);
        else renderImage(container, item.url, post?.title || "");
      }
    } catch (error) {
      container.textContent = "";
      container.appendChild(makeStatus(`Media load failed: ${error.message}`));
    }
  }

  function addManualToggle(thing, container, loader) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rwm-toggle";
    button.textContent = "Show media";
    button.addEventListener("click", () => {
      button.remove();
      loader();
    });
    (thing.querySelector(".entry") || thing).appendChild(button);
  }

  function prepareThing(thing) {
    if (thing.getAttribute(PROCESSED_ATTR) === "1") return;
    thing.setAttribute(PROCESSED_ATTR, "1");

    if (hasResMedia(thing)) return;

    const postUrl = getPostUrl(thing);
    const directImage = imageUrlFromPostUrl(postUrl);
    const needsFetch = isRedditGallery(postUrl) || isRedditVideo(postUrl);

    if (!directImage && !needsFetch) return;

    const container = placeMediaContainer(thing);
    const load = () => {
      if (container.getAttribute("data-rwm-loaded") === "1") return;
      container.setAttribute("data-rwm-loaded", "1");
      if (directImage) renderImage(container, directImage, thing.querySelector("a.title")?.textContent || "");
      else renderFetchedMedia(thing, container);
    };

    if (!settings.autoMedia) {
      addManualToggle(thing, container, load);
      return;
    }

    mediaObserver.observe(thing);
    thing._rwmLoadMedia = load;
  }

  const mediaObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      mediaObserver.unobserve(entry.target);
      entry.target._rwmLoadMedia?.();
    }
  }, {
    root: null,
    rootMargin: "900px 0px",
    threshold: 0.01,
  });

  function scan(root = document) {
    root.querySelectorAll(".thing.link").forEach(prepareThing);
  }

  function start() {
    document.documentElement.classList.add(SCRIPT_CLASS);
    if (settings.wideMode) document.documentElement.classList.add("rwm-wide");

    addStyles();
    registerMenu();

    if (document.body) scan();
    else document.addEventListener("DOMContentLoaded", () => scan(), { once: true });

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) scan(node);
        }
      }
    });

    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
      scan();
    }, { once: true });
  }

  start();
})();
