// ==UserScript==
// @name         Reddit Wide Media
// @namespace    local.reddit.wide-media
// @version      0.1.5
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
    contentWidth: "1920",
    mediaMode: "large",
    autoMedia: true,
    autoExpandText: true,
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
    const mediaMaxHeight = settings.mediaMode === "huge" ? "92vh" : settings.mediaMode === "medium" ? "680px" : "840px";
    const mediaMaxWidth = settings.mediaMode === "huge" ? "1560px" : settings.mediaMode === "medium" ? "980px" : "1280px";

    GM_addStyle(`
      html.${SCRIPT_CLASS} {
        background: #101214 !important;
        color-scheme: dark;
        --rwm-sidebar-width: 304px;
        --rwm-content-width: min(calc(100vw - 380px), ${width}px);
        --rwm-content-left: max(18px, calc((100vw - var(--rwm-sidebar-width) - var(--rwm-content-width)) / 2));
        --rwm-card: #171b20;
        --rwm-card-2: #1d232b;
        --rwm-border: #344252;
        --rwm-text: #d7dde3;
        --rwm-muted: #aeb8c4;
        --rwm-link: #8fc7ff;
        --rwm-link-visited: #c3b6ff;
        --rwm-accent: #45a3ff;
      }

      html.${SCRIPT_CLASS} body {
        min-width: 0 !important;
        background: #101214 !important;
        color: #d7dde3 !important;
        font-size: 15px !important;
        line-height: 1.45 !important;
      }

      html.${SCRIPT_CLASS} #header {
        min-width: 0 !important;
        background: #171b20 !important;
        border-bottom: 1px solid #303842 !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area {
        height: auto !important;
        min-height: 28px !important;
        background: #11151a !important;
        border-bottom: 1px solid #303842 !important;
        line-height: 28px !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area a,
      html.${SCRIPT_CLASS} #sr-more-link,
      html.${SCRIPT_CLASS} #header-bottom-left a,
      html.${SCRIPT_CLASS} #header-bottom-right a {
        color: #d2dae4 !important;
        font-size: 12px !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-left {
        min-height: 42px !important;
        background: #18202a !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right {
        top: 30px !important;
        background: #17202a !important;
        border-radius: 0 0 0 4px !important;
        color: #cbd5df !important;
        padding: 5px 8px !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .mail,
      html.${SCRIPT_CLASS} #header-bottom-right .pref-lang,
      html.${SCRIPT_CLASS} #header-bottom-right .logout {
        vertical-align: middle !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .mail {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 24px !important;
        height: 18px !important;
        padding: 0 6px !important;
        margin: 0 4px !important;
        border-radius: 999px !important;
        background: #263241 !important;
        border: 1px solid #405267 !important;
        color: #d7e5f5 !important;
        text-decoration: none !important;
        overflow: visible !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .mail.nohavemail,
      html.${SCRIPT_CLASS} #header-bottom-right .mail.havemail {
        background-image: none !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .mail:before {
        content: "mail";
        font-size: 11px;
        font-weight: 800;
        line-height: 1;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .mail.havemail {
        background: #5b3717 !important;
        border-color: #f5a33b !important;
        color: #fff3d9 !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .message-count,
      html.${SCRIPT_CLASS} #header-bottom-right .havemail + .message-count {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 22px !important;
        height: 18px !important;
        padding: 0 6px !important;
        border-radius: 999px !important;
        background: #f0a12a !important;
        color: #15100a !important;
        font-size: 12px !important;
        font-weight: 900 !important;
        text-shadow: none !important;
      }

      html.${SCRIPT_CLASS} .tabmenu {
        margin-top: 8px !important;
      }

      html.${SCRIPT_CLASS} .tabmenu li a,
      html.${SCRIPT_CLASS} .tabmenu li.selected a {
        padding: 5px 9px !important;
        background: #26313d !important;
        border: 1px solid #3b4856 !important;
        color: #dce7f3 !important;
        font-size: 13px !important;
        font-weight: 700 !important;
      }

      html.${SCRIPT_CLASS} .tabmenu li.selected a {
        background: #3b638a !important;
        color: #ffffff !important;
      }

      html.${SCRIPT_CLASS} a {
        color: #8fc7ff !important;
      }

      html.${SCRIPT_CLASS} a:visited {
        color: #b6a7ff !important;
      }

      html.${SCRIPT_CLASS} input,
      html.${SCRIPT_CLASS} textarea,
      html.${SCRIPT_CLASS} select {
        background: #171d24 !important;
        border: 1px solid #3a4654 !important;
        color: #e7edf4 !important;
        font-size: 14px !important;
      }

      html.${SCRIPT_CLASS} button,
      html.${SCRIPT_CLASS} .side .morelink a,
      html.${SCRIPT_CLASS} .side .morelink .nub {
        background: #243241 !important;
        border-color: #3f5267 !important;
        color: #f1f6fb !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .content {
        width: var(--rwm-content-width) !important;
        max-width: ${width}px !important;
        margin-left: var(--rwm-content-left) !important;
        margin-right: var(--rwm-sidebar-width) !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .listing-page .content,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .content,
      html.${SCRIPT_CLASS}.rwm-wide .search-page .content {
        padding-right: 0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .side {
        width: 286px !important;
        margin: 10px 10px 0 0 !important;
        background: transparent !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .linklisting {
        max-width: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link {
        margin: 0 0 14px 0 !important;
        padding: 16px 18px 18px 12px !important;
        border: 1px solid rgba(139, 157, 177, 0.24) !important;
        border-radius: 8px !important;
        background: linear-gradient(180deg, #1a2027 0%, #161b21 100%) !important;
        box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22) !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .entry {
        overflow: visible !important;
        margin-left: 8px !important;
        max-width: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link:after {
        content: "";
        display: block;
        clear: both;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .title {
        color: var(--rwm-link) !important;
        font-size: 21px !important;
        line-height: 1.42 !important;
        font-weight: 700 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .title:visited {
        color: var(--rwm-link-visited) !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list {
        color: #aeb8c4 !important;
        font-size: 14px !important;
        line-height: 1.55 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li a,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li span,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline a,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .domain a,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .subreddit {
        font-size: 14px !important;
        color: #b9c8d8 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .rank {
        color: #a9b4c0 !important;
        font-size: 16px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .midcol {
        width: 54px !important;
        margin-right: 10px !important;
        overflow: visible !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .score {
        color: #d9e1ea !important;
        font-size: 16px !important;
        line-height: 1.2 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 30px !important;
        height: 26px !important;
        margin: 6px auto !important;
        background: #26313d !important;
        border: 1px solid #3b4a5b !important;
        border-radius: 6px !important;
        color: #d6e0ea !important;
        text-indent: 0 !important;
        font-size: 0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow:before {
        display: block;
        font-size: 18px;
        font-weight: 900;
        line-height: 1;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.up:before,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.upmod:before {
        content: "^";
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.down:before,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.downmod:before {
        content: "v";
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.upmod {
        background: #4a2d19 !important;
        border-color: #e58c36 !important;
        color: #ffc28a !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.downmod {
        background: #222f4f !important;
        border-color: #6e91ff !important;
        color: #b9c8ff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thumbnail,
      html.${SCRIPT_CLASS}.rwm-wide .thumbnail.self,
      html.${SCRIPT_CLASS}.rwm-wide .thumbnail.default,
      html.${SCRIPT_CLASS}.rwm-wide .thumbnail.nsfw {
        width: 88px !important;
        min-height: 64px !important;
        margin-right: 12px !important;
        background-color: #202833 !important;
        border: 1px solid #354252 !important;
        border-radius: 4px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thumbnail img {
        max-width: 88px !important;
        max-height: 70px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .linkflairlabel,
      html.${SCRIPT_CLASS}.rwm-wide .flair {
        padding: 3px 7px !important;
        border-radius: 4px !important;
        border-color: #4f6680 !important;
        background: #243a50 !important;
        color: #d9efff !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        vertical-align: 2px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .linkflairlabel.rwm-flair-question {
        background: #3a321f !important;
        border-color: #b99143 !important;
        color: #ffe2a2 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .linkflairlabel.rwm-flair-fun {
        background: #273a29 !important;
        border-color: #5ca366 !important;
        color: #c9ffd0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .linkflairlabel.rwm-flair-news {
        background: #24374d !important;
        border-color: #5d9bd7 !important;
        color: #d9eeff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .linkflairlabel.rwm-flair-warning,
      html.${SCRIPT_CLASS}.rwm-wide .thumbnail.nsfw + .entry .linkflairlabel {
        background: #4b202b !important;
        border-color: #c7667a !important;
        color: #ffd3dc !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .commentarea {
        max-width: none !important;
        color: #d7dde3 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comment {
        max-width: none !important;
        font-size: 15px !important;
      }

      html.${SCRIPT_CLASS} .expando,
      html.${SCRIPT_CLASS} .usertext,
      html.${SCRIPT_CLASS} .usertext-body,
      html.${SCRIPT_CLASS} .md {
        color: var(--rwm-text) !important;
      }

      html.${SCRIPT_CLASS} .thing.link .expando,
      html.${SCRIPT_CLASS} .thing.link .usertext-body {
        max-width: min(calc(var(--rwm-content-width) - 170px), 980px) !important;
        margin-top: 12px !important;
        padding: 14px 16px !important;
        border: 1px solid #3a4958 !important;
        border-radius: 8px !important;
        background: #11161c !important;
        color: #dce4ed !important;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.025) !important;
      }

      html.${SCRIPT_CLASS} .thing.link .usertext-body .md,
      html.${SCRIPT_CLASS} .thing.link .expando .md {
        background: transparent !important;
        border: 0 !important;
        color: #dce4ed !important;
        font-size: 15px !important;
        line-height: 1.55 !important;
      }

      html.${SCRIPT_CLASS} .thing.link .usertext-body p,
      html.${SCRIPT_CLASS} .thing.link .expando p {
        margin: 0 0 10px 0 !important;
      }

      html.${SCRIPT_CLASS} .expando-button {
        width: 30px !important;
        height: 30px !important;
        border-radius: 999px !important;
        background: #26313d !important;
        border: 1px solid #45566a !important;
        color: #e6edf5 !important;
        text-indent: 0 !important;
        font-size: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      html.${SCRIPT_CLASS} .expando-button:before {
        content: "+";
        font-size: 20px;
        font-weight: 900;
        line-height: 1;
      }

      html.${SCRIPT_CLASS} .expando-button.expanded:before {
        content: "-";
      }

      html.${SCRIPT_CLASS} .side,
      html.${SCRIPT_CLASS} .side .spacer,
      html.${SCRIPT_CLASS} .sidecontentbox,
      html.${SCRIPT_CLASS} .titlebox,
      html.${SCRIPT_CLASS} .linkinfo {
        background: #151a20 !important;
        color: #d4dce5 !important;
      }

      html.${SCRIPT_CLASS} .side .md,
      html.${SCRIPT_CLASS} .side .usertext-body,
      html.${SCRIPT_CLASS} .titlebox form.toggle,
      html.${SCRIPT_CLASS} .leavemoderator,
      html.${SCRIPT_CLASS} .icon-menu a {
        background: transparent !important;
        color: #c9d3dd !important;
        font-size: 14px !important;
      }

      html.${SCRIPT_CLASS} .side .morelink {
        height: auto !important;
        line-height: 1.3 !important;
        background: none !important;
        border: 0 !important;
      }

      html.${SCRIPT_CLASS} .side .morelink a {
        display: block !important;
        padding: 9px 10px !important;
        border: 1px solid #43566d !important;
        border-radius: 4px !important;
        font-size: 14px !important;
      }

      html.${SCRIPT_CLASS} .side #search input[type="text"] {
        height: 32px !important;
        padding: 5px 8px !important;
        box-sizing: border-box !important;
      }

      html.${SCRIPT_CLASS} .morecomments a,
      html.${SCRIPT_CLASS} .deepthread a,
      html.${SCRIPT_CLASS} .nextprev a {
        background: #243241 !important;
        border: 1px solid #3f5267 !important;
        border-radius: 4px !important;
        color: #f1f6fb !important;
        padding: 5px 8px !important;
        font-size: 14px !important;
      }

      html.${SCRIPT_CLASS} .${MEDIA_CLASS} {
        clear: both;
        margin: 12px 0 6px 0;
        width: min(calc(var(--rwm-content-width) - 170px), ${mediaMaxWidth});
        max-width: ${mediaMaxWidth};
      }

      html.${SCRIPT_CLASS} .${MEDIA_CLASS}[hidden] {
        display: none !important;
      }

      html.${SCRIPT_CLASS} .${MEDIA_CLASS} img,
      html.${SCRIPT_CLASS} .${MEDIA_CLASS} video {
        display: block;
        width: 100%;
        max-width: 100%;
        max-height: ${mediaMaxHeight};
        height: auto;
        object-fit: contain;
        background: #070809;
        border: 1px solid rgba(158, 177, 198, 0.18);
        border-radius: 10px;
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
      }

      html.${SCRIPT_CLASS} .${MEDIA_CLASS}.rwm-gallery {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
        gap: 10px;
        width: min(calc(var(--rwm-content-width) - 170px), 100%);
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
        font-size: 13px;
      }

      html.${SCRIPT_CLASS} .rwm-toggle {
        border: 0;
        border-radius: 4px;
        padding: 6px 9px;
        margin: 7px 0 0 0;
        cursor: pointer;
        background: #2d5d88;
        color: #fff;
        font-size: 13px;
      }

      @media (max-width: 1200px) {
        html.${SCRIPT_CLASS}.rwm-wide .content {
          --rwm-content-width: calc(100vw - 16px);
          width: auto !important;
          max-width: none !important;
          margin: 8px !important;
        }

        html.${SCRIPT_CLASS}.rwm-wide .side {
          display: none !important;
        }

        html.${SCRIPT_CLASS} .${MEDIA_CLASS},
        html.${SCRIPT_CLASS} .${MEDIA_CLASS}.rwm-gallery {
          width: 100%;
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

    GM_registerMenuCommand(`${settings.autoExpandText ? "Disable" : "Enable"} auto text expandos`, () => {
      setSetting("autoExpandText", !settings.autoExpandText);
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

  function decorateFlairs(thing) {
    thing.querySelectorAll(".linkflairlabel").forEach((label) => {
      const text = (label.textContent || label.getAttribute("title") || "").trim().toLowerCase();
      label.classList.remove("rwm-flair-question", "rwm-flair-fun", "rwm-flair-news", "rwm-flair-warning");

      if (/question|help|support|advice/.test(text)) {
        label.classList.add("rwm-flair-question");
      } else if (/humou?r|meme|funny|lol|shitpost/.test(text)) {
        label.classList.add("rwm-flair-fun");
      } else if (/news|article|release|update|announcement/.test(text)) {
        label.classList.add("rwm-flair-news");
      } else if (/nsfw|spoiler|warning|serious/.test(text)) {
        label.classList.add("rwm-flair-warning");
      }
    });
  }

  function autoExpandText(thing) {
    if (!settings.autoExpandText) return;
    if (thing.getAttribute("data-rwm-text-expanded") === "1") return;

    const button = thing.querySelector(
      ".expando-button.collapsed.selftext, .expando-button.collapsed.selftext-muted",
    );
    if (!button) return;

    thing.setAttribute("data-rwm-text-expanded", "1");
    window.setTimeout(() => {
      if (button.isConnected && button.classList.contains("collapsed")) button.click();
    }, 50);
  }

  function prepareThing(thing) {
    if (thing.getAttribute(PROCESSED_ATTR) === "1") return;
    thing.setAttribute(PROCESSED_ATTR, "1");
    decorateFlairs(thing);
    autoExpandText(thing);

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
