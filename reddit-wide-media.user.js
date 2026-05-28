// ==UserScript==
// @name         Reddit Wide Media
// @namespace    local.reddit.wide-media
// @version      0.3.45
// @description  Force old Reddit, widen the layout, and lazily expand large inline media for ultrawide browsing.
// @match        https://reddit.com/*
// @match        https://www.reddit.com/*
// @match        https://old.reddit.com/*
// @match        https://np.reddit.com/*
// @homepageURL  https://github.com/PhadeDev/reddit-wide-media-userscript
// @supportURL   https://github.com/PhadeDev/reddit-wide-media-userscript/issues
// @downloadURL  https://raw.githubusercontent.com/PhadeDev/reddit-wide-media-userscript/main/reddit-wide-media-v2.user.js
// @updateURL    https://raw.githubusercontent.com/PhadeDev/reddit-wide-media-userscript/main/reddit-wide-media-v2.user.js
// @require      https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js
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
  let userHeaderGlobalListenersReady = false;

  const defaults = {
    redirect: true,
    wideMode: true,
    contentWidth: "1920",
    mediaMode: "large",
    autoMedia: true,
    autoExpandText: true,
    commentsModal: true,
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
        --rwm-subreddit-accent: #45a3ff;
        --rwm-subreddit-accent-soft: rgba(69, 163, 255, 0.16);
        max-width: 100vw !important;
        overflow-x: hidden !important;
      }

      html.${SCRIPT_CLASS} body {
        min-width: 0 !important;
        max-width: 100vw !important;
        overflow-x: hidden !important;
        background: #101214 !important;
        color: #d7dde3 !important;
        font-size: 15px !important;
        line-height: 1.45 !important;
      }

      html.${SCRIPT_CLASS} #header {
        min-width: 0 !important;
        max-width: 100vw !important;
        overflow-x: clip !important;
        background: #171b20 !important;
        border-bottom: 1px solid #303842 !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area {
        display: flex !important;
        align-items: center !important;
        height: auto !important;
        min-height: 42px !important;
        background: #11151a !important;
        border-bottom: 1px solid #303842 !important;
        line-height: 1 !important;
        overflow: visible !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .width-clip {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        width: 100% !important;
        height: auto !important;
        padding: 5px 10px !important;
        box-sizing: border-box !important;
        overflow: visible !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .redesign-beta-optin,
      html.${SCRIPT_CLASS} #sr-header-area .redesign-beta-optin-link,
      html.${SCRIPT_CLASS} #sr-header-area .sr-list,
      html.${SCRIPT_CLASS} #sr-more-link {
        display: none !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .srdrop:not(.drop-choices),
      html.${SCRIPT_CLASS} #sr-header-area .dropdown.srdrop:not(.drop-choices) {
        display: inline-flex !important;
        align-items: center !important;
        height: 32px !important;
        min-width: 168px !important;
        margin: 0 !important;
        padding: 0 9px !important;
        border: 1px solid #40566c !important;
        border-radius: 8px !important;
        background: #1d2b38 !important;
        color: #dce7f3 !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        text-decoration: none !important;
        text-transform: none !important;
        box-sizing: border-box !important;
        cursor: pointer !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .srdrop:not(.drop-choices) .selected,
      html.${SCRIPT_CLASS} #sr-header-area .dropdown.srdrop:not(.drop-choices) .selected {
        display: inline-flex !important;
        align-items: center !important;
        width: 100% !important;
        gap: 7px !important;
        color: #dce7f3 !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        background: transparent !important;
        text-transform: none !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .srdrop:not(.drop-choices) .selected:before,
      html.${SCRIPT_CLASS} #sr-header-area .dropdown.srdrop:not(.drop-choices) .selected:before {
        content: "" !important;
        display: inline-block !important;
        width: 16px !important;
        height: 16px !important;
        background: currentColor !important;
        -webkit-mask: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 5h7l2 2h7v12H4V5Zm2 4v8h12V9h-5.8l-2-2H6v2Z'/%3E%3C/svg%3E") !important;
        mask: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 5h7l2 2h7v12H4V5Zm2 4v8h12V9h-5.8l-2-2H6v2Z'/%3E%3C/svg%3E") !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .srdrop:not(.drop-choices) .selected:after,
      html.${SCRIPT_CLASS} #sr-header-area .dropdown.srdrop:not(.drop-choices) .selected:after {
        content: "▼" !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 18px !important;
        height: 18px !important;
        margin-left: auto !important;
        border: 0 !important;
        background: transparent !important;
        -webkit-mask: none !important;
        mask: none !important;
        color: currentColor !important;
        font-size: 13px !important;
        line-height: 1 !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .drop-choices.srdrop,
      html.${SCRIPT_CLASS} .drop-choices.srdrop {
        z-index: 10001 !important;
        min-width: 240px !important;
        max-height: min(70vh, 520px) !important;
        margin-top: 7px !important;
        padding: 7px !important;
        border: 1px solid #42576c !important;
        border-radius: 9px !important;
        background: #111820 !important;
        box-shadow: 0 14px 32px rgba(0, 0, 0, 0.42) !important;
        overflow: auto !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .drop-choices.srdrop .rwm-sr-search-wrap,
      html.${SCRIPT_CLASS} .drop-choices.srdrop .rwm-sr-search-wrap {
        position: sticky !important;
        top: 0 !important;
        z-index: 1 !important;
        display: block !important;
        margin: 0 0 7px !important;
        padding: 0 0 7px !important;
        border-bottom: 1px solid #2a3a49 !important;
        background: #111820 !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .drop-choices.srdrop .rwm-sr-search,
      html.${SCRIPT_CLASS} .drop-choices.srdrop .rwm-sr-search {
        display: block !important;
        box-sizing: border-box !important;
        width: 100% !important;
        height: 32px !important;
        margin: 0 !important;
        padding: 0 10px !important;
        border: 1px solid #40566c !important;
        border-radius: 7px !important;
        background: #19222c !important;
        color: #e8f0f8 !important;
        font-size: 13px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        outline: none !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .drop-choices.srdrop .rwm-sr-search::placeholder,
      html.${SCRIPT_CLASS} .drop-choices.srdrop .rwm-sr-search::placeholder {
        color: #8da0b4 !important;
        opacity: 1 !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .drop-choices.srdrop .rwm-sr-search:focus,
      html.${SCRIPT_CLASS} .drop-choices.srdrop .rwm-sr-search:focus {
        border-color: #6fa6d6 !important;
        box-shadow: 0 0 0 2px rgba(69, 163, 255, 0.22) !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .drop-choices.srdrop a.choice,
      html.${SCRIPT_CLASS} .drop-choices.srdrop a.choice {
        display: flex !important;
        align-items: center !important;
        min-height: 30px !important;
        padding: 0 9px !important;
        border: 1px solid #304253 !important;
        border-radius: 7px !important;
        background: #1c2631 !important;
        color: #dce7f3 !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .drop-choices.srdrop a.choice + a.choice,
      html.${SCRIPT_CLASS} .drop-choices.srdrop a.choice + a.choice {
        margin-top: 5px !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .drop-choices.srdrop a.choice:hover,
      html.${SCRIPT_CLASS} #sr-header-area .drop-choices.srdrop a.choice:focus-visible,
      html.${SCRIPT_CLASS} .drop-choices.srdrop a.choice:hover,
      html.${SCRIPT_CLASS} .drop-choices.srdrop a.choice:focus-visible {
        background: #26394c !important;
        border-color: #5d7a99 !important;
        color: #ffffff !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .rwm-sr-nav {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        margin-left: auto !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .rwm-sr-nav a {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 30px !important;
        padding: 0 11px !important;
        border: 1px solid #35485a !important;
        border-radius: 8px !important;
        background: #1c2631 !important;
        color: #dce7f3 !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        text-decoration: none !important;
        text-transform: none !important;
        box-sizing: border-box !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .rwm-sr-nav a.rwm-active {
        border-color: #5b86ad !important;
        background: #254767 !important;
        color: #ffffff !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .rwm-sr-nav a.rwm-sr-manage {
        border-color: #5d507a !important;
        background: #342d49 !important;
        color: #eadfff !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area .rwm-sr-nav a:hover,
      html.${SCRIPT_CLASS} #sr-header-area .rwm-sr-nav a:focus-visible {
        filter: saturate(1.2) brightness(1.12) !important;
        box-shadow: 0 0 14px rgba(70, 162, 255, 0.28), 0 1px 0 rgba(255, 255, 255, 0.05) inset !important;
      }

      html.${SCRIPT_CLASS} #sr-header-area a,
      html.${SCRIPT_CLASS} #sr-more-link,
      html.${SCRIPT_CLASS} #header-bottom-left a,
      html.${SCRIPT_CLASS} #header-bottom-right a {
        color: #d2dae4 !important;
        font-size: 15px !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-left {
        position: relative !important;
        min-height: 78px !important;
        background: #18202a !important;
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        padding: 12px 0 10px 14px !important;
        box-sizing: border-box !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-left #header-img,
      html.${SCRIPT_CLASS} #header-bottom-left .redditname:not(.pagename) {
        display: none !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        top: 36px !important;
        background: #17202a !important;
        border-radius: 0 0 0 4px !important;
        color: #cbd5df !important;
        padding: 8px 12px !important;
        font-size: 16px !important;
        line-height: 1 !important;
        min-height: 54px !important;
        overflow: visible !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right > * {
        align-self: center !important;
        top: auto !important;
        bottom: auto !important;
        transform: none !important;
        vertical-align: middle !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .user,
      html.${SCRIPT_CLASS} #header-bottom-right .user a,
      html.${SCRIPT_CLASS} #header-bottom-right .userkarma,
      html.${SCRIPT_CLASS} #header-bottom-right .pref-lang,
      html.${SCRIPT_CLASS} #header-bottom-right .logout {
        font-size: 16px !important;
        line-height: 1 !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .separator {
        display: none !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .user,
      html.${SCRIPT_CLASS} #header-bottom-right #mail,
      html.${SCRIPT_CLASS} #header-bottom-right .mail,
      html.${SCRIPT_CLASS} #header-bottom-right .pref-lang,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/prefs"],
      html.${SCRIPT_CLASS} #header-bottom-right .logout,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/logout"] {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-sizing: border-box !important;
        height: 38px !important;
        min-height: 38px !important;
        max-height: 38px !important;
        margin: 0 !important;
        padding: 0 10px !important;
        border: 1px solid #3d4d5e !important;
        border-radius: 8px !important;
        background: #202a35 !important;
        color: #dce7f3 !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        text-decoration: none !important;
        white-space: nowrap !important;
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right > .user,
      html.${SCRIPT_CLASS} #header-bottom-right > #mail,
      html.${SCRIPT_CLASS} #header-bottom-right > .mail,
      html.${SCRIPT_CLASS} #header-bottom-right > .pref-lang,
      html.${SCRIPT_CLASS} #header-bottom-right > a[href*="/prefs"],
      html.${SCRIPT_CLASS} #header-bottom-right > .logout,
      html.${SCRIPT_CLASS} #header-bottom-right > a[href*="/logout"],
      html.${SCRIPT_CLASS} #header-bottom-right > #modmail,
      html.${SCRIPT_CLASS} #header-bottom-right > .modmail,
      html.${SCRIPT_CLASS} #header-bottom-right > .chat,
      html.${SCRIPT_CLASS} #header-bottom-right > .chat-link,
      html.${SCRIPT_CLASS} #header-bottom-right > a[href*="/chat"],
      html.${SCRIPT_CLASS} #header-bottom-right > a[href*="chat.reddit.com"],
      html.${SCRIPT_CLASS} #header-bottom-right > a[href*="/notifications"],
      html.${SCRIPT_CLASS} #header-bottom-right > a[href*="/message/"] {
        height: 38px !important;
        min-height: 38px !important;
        max-height: 38px !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        line-height: 1 !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .user {
        position: relative !important;
        gap: 7px !important;
        min-width: 168px !important;
        border-color: #4d6c8f !important;
        background: #20384f !important;
        color: #e5f3ff !important;
        cursor: pointer !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .user a {
        display: inline-flex !important;
        align-items: center !important;
        height: 100% !important;
        color: inherit !important;
        font-weight: 900 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .userkarma {
        display: inline-flex !important;
        align-items: center !important;
        height: 100% !important;
        color: #9fb4c9 !important;
        font-weight: 800 !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .user .rwm-user-chevron {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 0 0 auto !important;
        width: 18px !important;
        height: 18px !important;
        margin-left: auto !important;
        border: 0 !important;
        background: transparent !important;
        -webkit-mask: none !important;
        mask: none !important;
        color: currentColor !important;
        font-size: 13px !important;
        line-height: 1 !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .user.rwm-user-menu-open {
        border-color: #73afe4 !important;
        background: #28496c !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .rwm-user-menu {
        position: absolute !important;
        top: calc(100% + 8px) !important;
        left: 0 !important;
        z-index: 10000 !important;
        display: none !important;
        min-width: 178px !important;
        padding: 7px !important;
        border: 1px solid #42576c !important;
        border-radius: 9px !important;
        background: #111820 !important;
        box-shadow: 0 14px 32px rgba(0, 0, 0, 0.42) !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .user.rwm-user-menu-open .rwm-user-menu {
        display: grid !important;
        gap: 5px !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .rwm-user-menu a {
        display: flex !important;
        align-items: center !important;
        min-height: 30px !important;
        padding: 0 9px !important;
        border: 1px solid #304253 !important;
        border-radius: 7px !important;
        background: #1c2631 !important;
        color: #dce7f3 !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .rwm-user-menu a:hover,
      html.${SCRIPT_CLASS} #header-bottom-right .rwm-user-menu a:focus-visible {
        background: #26394c !important;
        border-color: #5d7a99 !important;
        color: #ffffff !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right #mail,
      html.${SCRIPT_CLASS} #header-bottom-right .mail,
      html.${SCRIPT_CLASS} #header-bottom-right .pref-lang,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/prefs"],
      html.${SCRIPT_CLASS} #header-bottom-right .logout,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/logout"] {
        vertical-align: middle !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right #mail,
      html.${SCRIPT_CLASS} #header-bottom-right .mail {
        min-width: 112px !important;
        padding: 0 12px !important;
        background: #f4bd52 !important;
        border-color: #ffd989 !important;
        color: #14100a !important;
        font-size: 15px !important;
        overflow: visible !important;
        text-indent: 0 !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right #mail.nohavemail,
      html.${SCRIPT_CLASS} #header-bottom-right #mail.havemail,
      html.${SCRIPT_CLASS} #header-bottom-right .mail.nohavemail,
      html.${SCRIPT_CLASS} #header-bottom-right .mail.havemail {
        background-image: none !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right #mail:before,
      html.${SCRIPT_CLASS} #header-bottom-right .mail:before {
        content: "" !important;
        display: inline-block !important;
        flex: 0 0 auto !important;
        width: 22px !important;
        height: 22px !important;
        margin-right: 8px !important;
        background: currentColor !important;
        -webkit-mask: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3 5h18v14H3V5Zm2.4 2 6.6 5.1L18.6 7H5.4ZM5 9.1V17h14V9.1l-7 5.4-7-5.4Z'/%3E%3C/svg%3E") !important;
        mask: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3 5h18v14H3V5Zm2.4 2 6.6 5.1L18.6 7H5.4ZM5 9.1V17h14V9.1l-7 5.4-7-5.4Z'/%3E%3C/svg%3E") !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right #mail {
        font-size: 17px;
        font-weight: 900;
        line-height: 1;
      }

      html.${SCRIPT_CLASS} #header-bottom-right #mail.havemail,
      html.${SCRIPT_CLASS} #header-bottom-right .mail.havemail {
        background: #f4bd52 !important;
        border-color: #ffd989 !important;
        color: #14100a !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right #mail + .message-count,
      html.${SCRIPT_CLASS} #header-bottom-right .message-count,
      html.${SCRIPT_CLASS} #header-bottom-right .havemail + .message-count {
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 0 !important;
        height: 18px !important;
        padding: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        color: #f4bd52 !important;
        font-size: 12px !important;
        font-weight: 900 !important;
        text-shadow: none !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right #mail + .message-count:before,
      html.${SCRIPT_CLASS} #header-bottom-right .message-count:before,
      html.${SCRIPT_CLASS} #header-bottom-right .havemail + .message-count:before {
        content: "(";
      }

      html.${SCRIPT_CLASS} #header-bottom-right #mail + .message-count:after,
      html.${SCRIPT_CLASS} #header-bottom-right .message-count:after,
      html.${SCRIPT_CLASS} #header-bottom-right .havemail + .message-count:after {
        content: ")";
      }

      html.${SCRIPT_CLASS} #header-bottom-right .pref-lang,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/prefs"] {
        border-color: #665a86 !important;
        background: #352d4a !important;
        color: #dfd6ff !important;
        transform: none !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .logout,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/logout"] {
        border-color: #6b4650 !important;
        background: #3c2229 !important;
        color: #ffdce4 !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right #modmail,
      html.${SCRIPT_CLASS} #header-bottom-right .modmail,
      html.${SCRIPT_CLASS} #header-bottom-right .chat,
      html.${SCRIPT_CLASS} #header-bottom-right .chat-link,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/chat"],
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="chat.reddit.com"],
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/notifications"],
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/message/"] {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-sizing: border-box !important;
        width: 38px !important;
        height: 38px !important;
        min-width: 38px !important;
        min-height: 38px !important;
        max-height: 38px !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 1px solid #42576c !important;
        border-radius: 8px !important;
        background: #1d2b38 !important;
        color: #dce7f3 !important;
        background-image: none !important;
        overflow: hidden !important;
        text-indent: -9999px !important;
        font-size: 0 !important;
        transform: none !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right #modmail:before,
      html.${SCRIPT_CLASS} #header-bottom-right .modmail:before,
      html.${SCRIPT_CLASS} #header-bottom-right .chat:before,
      html.${SCRIPT_CLASS} #header-bottom-right .chat-link:before,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/chat"]:before,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="chat.reddit.com"]:before,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/notifications"]:before,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/message/"]:before {
        content: "" !important;
        display: block !important;
        width: 20px !important;
        height: 20px !important;
        background: currentColor !important;
        -webkit-mask: center / contain no-repeat !important;
        mask: center / contain no-repeat !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right #modmail:before,
      html.${SCRIPT_CLASS} #header-bottom-right .modmail:before,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/notifications"]:before {
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 22a2.7 2.7 0 0 0 2.6-2h-5.2A2.7 2.7 0 0 0 12 22Zm7-6v-5a7 7 0 0 0-14 0v5l-2 2v1h18v-1l-2-2Zm-2 1H7v-6a5 5 0 0 1 10 0v6Z'/%3E%3C/svg%3E") !important;
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 22a2.7 2.7 0 0 0 2.6-2h-5.2A2.7 2.7 0 0 0 12 22Zm7-6v-5a7 7 0 0 0-14 0v5l-2 2v1h18v-1l-2-2Zm-2 1H7v-6a5 5 0 0 1 10 0v6Z'/%3E%3C/svg%3E") !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right .chat:before,
      html.${SCRIPT_CLASS} #header-bottom-right .chat-link:before,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/chat"]:before,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="chat.reddit.com"]:before,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/message/"]:before {
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 4h16v11H8.4L4 19.2V4Zm2 2v8.5l1.6-1.5H18V6H6Z'/%3E%3C/svg%3E") !important;
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 4h16v11H8.4L4 19.2V4Zm2 2v8.5l1.6-1.5H18V6H6Z'/%3E%3C/svg%3E") !important;
      }

      html.${SCRIPT_CLASS} #header-bottom-right #modmail:hover,
      html.${SCRIPT_CLASS} #header-bottom-right .modmail:hover,
      html.${SCRIPT_CLASS} #header-bottom-right .chat:hover,
      html.${SCRIPT_CLASS} #header-bottom-right .chat-link:hover,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/chat"]:hover,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="chat.reddit.com"]:hover,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/notifications"]:hover,
      html.${SCRIPT_CLASS} #header-bottom-right a[href*="/message/"]:hover {
        background: #26394c !important;
        border-color: #5d7a99 !important;
        color: #ffffff !important;
      }

      html.${SCRIPT_CLASS} .tabmenu {
        position: absolute !important;
        left: 50% !important;
        bottom: 14px !important;
        transform: translateX(-50%) !important;
        margin: 0 !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
      }

      html.${SCRIPT_CLASS} .tabmenu li a,
      html.${SCRIPT_CLASS} .tabmenu li.selected a {
        padding: 12px 17px !important;
        background: #26313d !important;
        border: 1px solid #3b4856 !important;
        color: #dce7f3 !important;
        font-size: 17px !important;
        font-weight: 700 !important;
        line-height: 1.2 !important;
      }

      html.${SCRIPT_CLASS} .tabmenu li.selected a {
        background: #3b638a !important;
        color: #ffffff !important;
      }

      html.${SCRIPT_CLASS} .pagename {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 36px !important;
        padding: 0 11px !important;
        border: 1px solid #4d6c8f !important;
        border-radius: 7px !important;
        background: #20384f !important;
        color: #e5f3ff !important;
        font-size: 20px !important;
        line-height: 1 !important;
        font-weight: 800 !important;
        letter-spacing: 0 !important;
        text-decoration: none !important;
        text-transform: uppercase !important;
      }

      html.${SCRIPT_CLASS} .pagename a {
        color: inherit !important;
        font-size: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS} a {
        color: #8fc7ff !important;
      }

      html.${SCRIPT_CLASS} a:visited {
        color: #b6a7ff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline a.subreddit,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline a.subreddit:link,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline a.subreddit:visited,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline a.subreddit:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline a.subreddit:focus-visible {
        color: #14100a !important;
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

      html.${SCRIPT_CLASS} :is(
        button,
        .tabmenu li a,
        #header-bottom-right .user,
        #header-bottom-right #mail,
        #header-bottom-right .mail,
        #header-bottom-right .pref-lang,
        #header-bottom-right a[href*="/prefs"],
        #header-bottom-right .logout,
        #header-bottom-right a[href*="/logout"],
        #header-bottom-right #modmail,
        #header-bottom-right .modmail,
        #header-bottom-right .chat,
        #header-bottom-right .chat-link,
        #header-bottom-right a[href*="/chat"],
        #header-bottom-right a[href*="chat.reddit.com"],
        #header-bottom-right a[href*="/notifications"],
        .thing.link .flat-list.buttons li a,
        .thing.link .flat-list.buttons li span.option,
        .thing.link .flat-list.buttons li form.toggle button,
        .thing.link .arrow,
        .comments-page .thing.comment .flat-list a,
        .comments-page .thing.comment .flat-list span,
        .comments-page .thing.comment .arrow,
        .usertext.cloneable .usertext-buttons input,
        .usertext.cloneable .usertext-buttons button,
        .usertext.cloneable .usertext-buttons a
      ):hover,
      html.${SCRIPT_CLASS} :is(
        button,
        .tabmenu li a,
        #header-bottom-right .user,
        #header-bottom-right #mail,
        #header-bottom-right .mail,
        #header-bottom-right .pref-lang,
        #header-bottom-right a[href*="/prefs"],
        #header-bottom-right .logout,
        #header-bottom-right a[href*="/logout"],
        #header-bottom-right #modmail,
        #header-bottom-right .modmail,
        #header-bottom-right .chat,
        #header-bottom-right .chat-link,
        #header-bottom-right a[href*="/chat"],
        #header-bottom-right a[href*="chat.reddit.com"],
        #header-bottom-right a[href*="/notifications"],
        .thing.link .flat-list.buttons li a,
        .thing.link .flat-list.buttons li span.option,
        .thing.link .flat-list.buttons li form.toggle button,
        .thing.link .arrow,
        .comments-page .thing.comment .flat-list a,
        .comments-page .thing.comment .flat-list span,
        .comments-page .thing.comment .arrow,
        .usertext.cloneable .usertext-buttons input,
        .usertext.cloneable .usertext-buttons button,
        .usertext.cloneable .usertext-buttons a
      ):focus-visible {
        filter: saturate(1.25) brightness(1.12) !important;
        box-shadow: 0 0 16px rgba(70, 162, 255, 0.34), 0 1px 0 rgba(255, 255, 255, 0.05) inset !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .content {
        width: var(--rwm-content-width) !important;
        max-width: ${width}px !important;
        margin-left: var(--rwm-content-left) !important;
        margin-right: var(--rwm-sidebar-width) !important;
        box-sizing: border-box !important;
        overflow-x: clip !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .listing-page .content,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .content,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .content,
      html.${SCRIPT_CLASS}.rwm-wide .search-page .content {
        margin-top: 10px !important;
        padding-right: 0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .side {
        width: 286px !important;
        margin: 10px 10px 0 0 !important;
        background: transparent !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide :is(.listing-chooser, .listing-chooser-collapsed, .grippy, #listing-chooser, #listing-chooser-collapsed) {
        display: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .side,
      html.${SCRIPT_CLASS}.rwm-wide .side * {
        background-image: none !important;
        text-shadow: none !important;
        box-shadow: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .linklisting {
        max-width: none !important;
        overflow-x: clip !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link {
        display: flow-root !important;
        min-height: 0 !important;
        height: auto !important;
        margin: 0 0 14px 0 !important;
        padding: 16px 18px 18px 12px !important;
        border: 1px solid color-mix(in srgb, var(--rwm-subreddit-accent), #344252 76%) !important;
        border-radius: 8px !important;
        background:
          linear-gradient(90deg, var(--rwm-subreddit-accent-soft) 0, rgba(26, 32, 39, 0) 74px),
          linear-gradient(180deg, #1a2027 0%, #161b21 100%) !important;
        box-shadow:
          0 0 0 1px color-mix(in srgb, var(--rwm-subreddit-accent), transparent 86%) inset,
          0 0 22px color-mix(in srgb, var(--rwm-subreddit-accent), transparent 84%),
          0 10px 26px rgba(0, 0, 0, 0.22) !important;
      }

      html.${SCRIPT_CLASS}:not(.rwm-has-subreddit-accent) .thing.link {
        border-color: rgba(139, 157, 177, 0.24) !important;
        background: linear-gradient(180deg, #1a2027 0%, #161b21 100%) !important;
        box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22) !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-nsfw-post {
        position: relative !important;
        border-color: rgba(224, 85, 102, 0.58) !important;
        background:
          linear-gradient(90deg, rgba(120, 28, 38, 0.32) 0, rgba(26, 32, 39, 0) 96px),
          linear-gradient(180deg, #21171b 0%, #171316 100%) !important;
        box-shadow:
          0 0 0 1px rgba(224, 85, 102, 0.24) inset,
          0 0 24px rgba(224, 85, 102, 0.16),
          0 10px 26px rgba(0, 0, 0, 0.24) !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-nsfw-post:before {
        content: "NSFW" !important;
        position: absolute !important;
        top: 12px !important;
        right: 14px !important;
        z-index: 3 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 26px !important;
        padding: 0 10px !important;
        border: 1px solid rgba(255, 151, 166, 0.64) !important;
        border-radius: 999px !important;
        background: rgba(79, 20, 29, 0.88) !important;
        color: #ffd7dd !important;
        font-size: 12px !important;
        font-weight: 900 !important;
        letter-spacing: 0.08em !important;
        line-height: 1 !important;
        pointer-events: none !important;
        text-transform: uppercase !important;
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.24) !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link.hidden {
        display: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .entry {
        overflow: visible !important;
        margin-left: 8px !important;
        max-width: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link:after {
        content: none !important;
        display: none !important;
        clear: none !important;
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

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 6px !important;
        margin-top: 3px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .author,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .live-timestamp,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline time {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 21px !important;
        padding: 2px 7px !important;
        border: 1px solid #3b4b5d !important;
        border-radius: 7px !important;
        background: #1d2630 !important;
        color: #cbd7e3 !important;
        font-size: 13px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .author {
        border-color: #476a8d !important;
        background: #20384f !important;
        color: #d8edff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .domain,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .domain a {
        display: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 7px !important;
        margin-top: 8px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li {
        display: inline-flex !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li a,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li span.option,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li form.toggle button,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline a,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .subreddit {
        font-size: 14px !important;
        color: #b9c8d8 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li a,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li span.option,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li form.toggle button {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 28px !important;
        padding: 5px 10px !important;
        border: 1px solid #3a4b5d !important;
        border-radius: 7px !important;
        background: #202934 !important;
        color: #d6e1ec !important;
        font-size: 13px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        text-decoration: none !important;
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset !important;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li a:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li span.option:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li form.toggle button:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li a:focus-visible,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li form.toggle button:focus-visible {
        background: #2a3948 !important;
        border-color: #5d7a99 !important;
        color: #ffffff !important;
        transform: translateY(-1px);
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.first a.comments {
        background: #244263 !important;
        border-color: #4d86bd !important;
        color: #e5f3ff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.first a.comments:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.first a.comments:focus-visible {
        background: #2f5680 !important;
        border-color: #73afe4 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-unsave-button a,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-unsave-button span.option,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-unsave-button form.toggle button {
        background: #173d2a !important;
        border-color: #3fa86d !important;
        color: #dbffe9 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-unsave-button a:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-unsave-button span.option:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-unsave-button form.toggle button:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-unsave-button a:focus-visible,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-unsave-button form.toggle button:focus-visible {
        background: #1f5639 !important;
        border-color: #66d992 !important;
        color: #ffffff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-share-button a,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-share-button span.option,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-share-button form.toggle button {
        background: #253146 !important;
        border-color: #506a9d !important;
        color: #dce8ff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-save-button a,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-save-button span.option,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-save-button form.toggle button {
        background: #2c3340 !important;
        border-color: #657588 !important;
        color: #e1e9f3 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-hide-button a,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-hide-button span.option,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-hide-button form.toggle button {
        background: #332e22 !important;
        border-color: #8e7441 !important;
        color: #ffe7b2 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-report-button a,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-report-button span.option,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-report-button form.toggle button {
        background: #3a2228 !important;
        border-color: #a45666 !important;
        color: #ffdbe3 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-crosspost-button a,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-crosspost-button span.option,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li.rwm-crosspost-button form.toggle button {
        background: #2d2842 !important;
        border-color: #6f60ad !important;
        color: #e9e1ff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li:is(.rwm-share-button, .rwm-save-button, .rwm-hide-button, .rwm-report-button, .rwm-crosspost-button, .rwm-unsave-button) a:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li:is(.rwm-share-button, .rwm-save-button, .rwm-hide-button, .rwm-report-button, .rwm-crosspost-button, .rwm-unsave-button) span.option:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li:is(.rwm-share-button, .rwm-save-button, .rwm-hide-button, .rwm-report-button, .rwm-crosspost-button, .rwm-unsave-button) form.toggle button:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li:is(.rwm-share-button, .rwm-save-button, .rwm-hide-button, .rwm-report-button, .rwm-crosspost-button, .rwm-unsave-button) a:focus-visible,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons li:is(.rwm-share-button, .rwm-save-button, .rwm-hide-button, .rwm-report-button, .rwm-crosspost-button, .rwm-unsave-button) form.toggle button:focus-visible {
        box-shadow: 0 0 16px color-mix(in srgb, currentColor, transparent 58%), 0 1px 0 rgba(255, 255, 255, 0.05) inset !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons form.toggle,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons form.toggle span {
        display: inline-flex !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .flat-list.buttons form.toggle input[type="checkbox"] {
        display: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .subreddit {
        display: inline-flex !important;
        align-items: center !important;
        align-self: center !important;
        position: relative !important;
        top: 0 !important;
        transform: translateY(4px) !important;
        min-height: 21px !important;
        padding: 2px 8px !important;
        border: 1px solid #476a8d !important;
        border-radius: 7px !important;
        background: #f4bd52 !important;
        color: #14100a !important;
        font-size: 13px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        text-decoration: none !important;
        vertical-align: middle !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .subreddit:visited,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .subreddit:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .subreddit:focus-visible {
        color: #14100a !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .fancy-toggle-button.subscribe-button,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .subscribe-button,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .RESshortcut,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .RESshortcutside,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .RESDashboardToggle {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 22px !important;
        height: 22px !important;
        margin: 0 2px !important;
        padding: 0 !important;
        border: 1px solid #4d86bd !important;
        border-radius: 6px !important;
        background: #244263 !important;
        color: #e5f3ff !important;
        line-height: 1 !important;
        overflow: hidden !important;
        vertical-align: middle !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .fancy-toggle-button.subscribe-button .option,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .subscribe-button .option,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .RESshortcut,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .RESshortcutside,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .RESDashboardToggle {
        color: transparent !important;
        font-size: 0 !important;
        text-indent: 0 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .fancy-toggle-button.subscribe-button .option:not(.active),
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .subscribe-button .option:not(.active) {
        display: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .fancy-toggle-button.subscribe-button .option.active,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .subscribe-button .option.active {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        height: 100% !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .fancy-toggle-button.subscribe-button .option.active:before,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .subscribe-button .option.active:before,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .RESshortcut:before,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .RESshortcutside:before,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .RESDashboardToggle:before {
        content: "+";
        color: #e5f3ff !important;
        font-size: 20px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .fancy-toggle-button.subscribe-button .remove.active:before,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .subscribe-button .remove.active:before {
        content: "-";
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .fancy-toggle-button.subscribe-button:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .subscribe-button:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .RESshortcut:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .RESshortcutside:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .tagline .RESDashboardToggle:hover {
        background: #2f5680 !important;
        border-color: #73afe4 !important;
        color: #ffffff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .rank {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 34px !important;
        height: 28px !important;
        margin: 0 10px 0 0 !important;
        border: 1px solid #344658 !important;
        border-radius: 999px !important;
        background: #17212b !important;
        color: #c9d6e3 !important;
        font-size: 14px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        text-align: center !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.link .rank {
        display: none !important;
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

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .score.dislikes,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .score.likes {
        display: none !important;
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
        overflow: hidden !important;
        text-indent: -9999px !important;
        font-size: 0 !important;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.up:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.up:focus-visible {
        background: #1f3b2a !important;
        border-color: #46b36a !important;
        color: #9df0b8 !important;
        transform: translateY(-1px);
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.down:hover,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.down:focus-visible {
        background: #4a2026 !important;
        border-color: #d16072 !important;
        color: #ffb7c2 !important;
        transform: translateY(1px);
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow:before {
        display: block;
        content: "";
        width: 18px;
        height: 18px;
        background: currentColor;
        -webkit-mask: center / contain no-repeat;
        mask: center / contain no-repeat;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.up:before,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.upmod:before {
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4 4 14h5v6h6v-6h5z'/%3E%3C/svg%3E");
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4 4 14h5v6h6v-6h5z'/%3E%3C/svg%3E");
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.down:before,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.downmod:before {
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 20 4 10h5V4h6v6h5z'/%3E%3C/svg%3E");
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 20 4 10h5V4h6v6h5z'/%3E%3C/svg%3E");
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.upmod {
        background: #1f3b2a !important;
        border-color: #46b36a !important;
        color: #9df0b8 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link .arrow.downmod {
        background: #4a2026 !important;
        border-color: #d16072 !important;
        color: #ffb7c2 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thumbnail,
      html.${SCRIPT_CLASS}.rwm-wide .thumbnail.self,
      html.${SCRIPT_CLASS}.rwm-wide .thumbnail.default,
      html.${SCRIPT_CLASS}.rwm-wide .thumbnail.nsfw {
        position: relative !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 88px !important;
        min-height: 64px !important;
        margin-right: 12px !important;
        background-color: #202833 !important;
        background-image: none !important;
        border: 1px solid #354252 !important;
        border-radius: 4px !important;
        overflow: hidden !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-nsfw-post .thumbnail,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-nsfw-post .thumbnail.nsfw {
        background-color: #202833 !important;
        border-color: #d75a6d !important;
        color: #ffd7dd !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-nsfw-post .thumbnail img {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        object-fit: cover !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-nsfw-post .thumbnail.nsfw:not(.rwm-has-thumb):before,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-nsfw-post .thumbnail.nsfw:not(.rwm-has-thumb):after {
        content: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-nsfw-post .rwm-flair-nsfw,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-nsfw-post .nsfw-stamp {
        display: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thumbnail img {
        max-width: 88px !important;
        max-height: 70px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link:not(.rwm-youtube) .thumbnail.default:before {
        content: "";
        width: 30px;
        height: 30px;
        background: #9acbff;
        -webkit-mask: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3ZM5 5h6v2H7v10h10v-4h2v6H5V5Z'/%3E%3C/svg%3E");
        mask: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3ZM5 5h6v2H7v10h10v-4h2v6H5V5Z'/%3E%3C/svg%3E");
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link:not(.rwm-youtube) .thumbnail.default:after {
        content: "link";
        position: absolute;
        left: 0;
        right: 0;
        bottom: 6px;
        color: #b7d8ff;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.08em;
        line-height: 1;
        text-align: center;
        text-transform: uppercase;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-youtube .thumbnail,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-youtube .thumbnail.default,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-youtube .thumbnail.self {
        position: relative !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: linear-gradient(135deg, #331014 0%, #5b141b 100%) !important;
        border-color: #9f303b !important;
        color: #fff !important;
        overflow: hidden !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-youtube .thumbnail:before {
        content: "";
        width: 46px;
        height: 32px;
        border-radius: 8px;
        background: #ff0033;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.28);
      }

      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-youtube .thumbnail:after {
        content: "";
        position: absolute;
        width: 0;
        height: 0;
        border-top: 9px solid transparent;
        border-bottom: 9px solid transparent;
        border-left: 15px solid #fff;
        transform: translateX(2px);
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
      html.${SCRIPT_CLASS}.rwm-wide .thumbnail.nsfw + .entry .linkflairlabel,
      html.${SCRIPT_CLASS}.rwm-wide .thing.link.rwm-nsfw-post .linkflairlabel {
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

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .commentarea {
        padding: 16px 22px 24px !important;
        background: #101214 !important;
        color: #d7dde3 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .commentarea > .panestack-title,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .commentarea > .usertext,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .commentarea > .usertext .usertext-edit,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .commentarea > .usertext .bottom-area,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .commentarea > .usertext .usertext-buttons,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .commentarea > .usertext .help-toggle,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .commentarea > .usertext .markhelp {
        background: #101214 !important;
        color: #d7dde3 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .sitetable.nestedlisting {
        max-width: 1280px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .panestack-title,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .menuarea {
        max-width: 1280px !important;
        margin: 0 0 14px 0 !important;
        padding: 12px 14px !important;
        border: 1px solid #2f3d4a !important;
        border-radius: 8px !important;
        background: #151b22 !important;
        color: #cdd7e2 !important;
        font-size: 15px !important;
        font-weight: 800 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .panestack-title .title {
        color: #dfe8f2 !important;
        font-size: 15px !important;
        font-weight: 900 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .menuarea {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 8px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .menuarea .dropdown-title,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .menuarea .toggle a,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .menuarea .toggle-button,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .menuarea .reddit-infobar {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 28px !important;
        padding: 5px 10px !important;
        border: 1px solid #40546a !important;
        border-radius: 7px !important;
        background: #202a35 !important;
        color: #e3edf8 !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable,
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-edit {
        max-width: 1280px !important;
        margin-bottom: 12px !important;
        color: #d7dde3 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable textarea {
        box-sizing: border-box !important;
        width: min(100%, 780px) !important;
        min-height: 110px !important;
        padding: 10px 12px !important;
        border: 1px solid #3b4b5d !important;
        border-radius: 8px !important;
        background: #11161c !important;
        color: #dce4ed !important;
        font-size: 15px !important;
        line-height: 1.5 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
        align-items: center !important;
        margin-top: 8px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons input[type="submit"],
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons input[type="button"],
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons input[value="save"],
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons input[value="Save"],
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons input[value="cancel"],
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons input[value="Cancel"],
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons button,
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons a.save,
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons a.cancel {
        appearance: none !important;
        -moz-appearance: none !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: auto !important;
        height: auto !important;
        min-height: 28px !important;
        margin: 0 !important;
        padding: 5px 10px !important;
        border: 1px solid #40546a !important;
        border-radius: 7px !important;
        background: #202a35 !important;
        color: #e3edf8 !important;
        cursor: pointer !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        text-decoration: none !important;
        vertical-align: middle !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons input[type="submit"],
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons input[value="save"],
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons input[value="Save"],
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons .save {
        background: #244263 !important;
        border-color: #4d86bd !important;
        color: #e5f3ff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons input[type="button"],
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons input[value="cancel"],
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons input[value="Cancel"],
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons .cancel {
        background: #1b232c !important;
        border-color: #344252 !important;
        color: #c4ced9 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons input:hover,
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons input:focus-visible,
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons button:hover,
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons button:focus-visible,
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons a:hover,
      html.${SCRIPT_CLASS}.rwm-wide .usertext.cloneable .usertext-buttons a:focus-visible {
        background: #2a3948 !important;
        border-color: #5d7a99 !important;
        color: #ffffff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment {
        --rwm-rail: #3a536a;
        position: relative !important;
        max-width: 1280px !important;
        margin: 10px 0 !important;
        padding: 12px 14px 12px 72px !important;
        border: 1px solid #2c3a47 !important;
        border-radius: 8px !important;
        background: linear-gradient(180deg, #171e26 0%, #141a21 100%) !important;
        color: #d7dde3 !important;
        font-size: 15px !important;
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.16) !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment.collapsed {
        opacity: 0.72 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .child {
        margin: 12px 0 0 30px !important;
        border-left: 0 !important;
        padding: 0 0 0 8px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .child .sitetable,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .child .thing,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .child:before {
        border-left: 0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment.rwm-depth-capped {
        margin-left: -38px !important;
        max-width: calc(100% + 38px) !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment.rwm-depth-0 { --rwm-rail: #46a2ff; border-color: color-mix(in srgb, #46a2ff, #2c3a47 74%) !important; }
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment.rwm-depth-1 { --rwm-rail: #56d68c; border-color: color-mix(in srgb, #56d68c, #2c3a47 74%) !important; }
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment.rwm-depth-2 { --rwm-rail: #f0c64f; border-color: color-mix(in srgb, #f0c64f, #2c3a47 74%) !important; }
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment.rwm-depth-3 { --rwm-rail: #ef8a4c; border-color: color-mix(in srgb, #ef8a4c, #2c3a47 74%) !important; }
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment.rwm-depth-4 { --rwm-rail: #e86fa2; border-color: color-mix(in srgb, #e86fa2, #2c3a47 74%) !important; }
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment.rwm-depth-5 { --rwm-rail: #a98cff; border-color: color-mix(in srgb, #a98cff, #2c3a47 74%) !important; }
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment.rwm-depth-6 { --rwm-rail: #63d5d7; border-color: color-mix(in srgb, #63d5d7, #2c3a47 74%) !important; }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .rwm-comment-rail {
        position: absolute;
        inset: 8px auto 8px 0;
        width: 10px !important;
        border: 1px solid color-mix(in srgb, var(--rwm-rail), #ffffff 18%) !important;
        border-radius: 999px !important;
        background: linear-gradient(180deg, color-mix(in srgb, var(--rwm-rail), #ffffff 16%), var(--rwm-rail)) !important;
        cursor: pointer !important;
        opacity: 0.95 !important;
        padding: 0 !important;
        transition: opacity 120ms ease, filter 120ms ease, transform 120ms ease, box-shadow 120ms ease;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .rwm-comment-rail:hover,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .rwm-comment-rail:focus-visible {
        opacity: 1;
        filter: saturate(1.35) brightness(1.2);
        transform: scaleX(1.25);
        box-shadow: 0 0 18px color-mix(in srgb, var(--rwm-rail), transparent 42%);
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment.rwm-collapsed-branch > .child {
        display: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment.rwm-collapsed-branch > .entry .rwm-collapse-note {
        display: inline-flex !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .rwm-collapse-note {
        display: none !important;
        align-items: center !important;
        min-height: 25px !important;
        margin-top: 9px !important;
        padding: 4px 8px !important;
        border: 1px solid color-mix(in srgb, var(--rwm-rail), #ffffff 18%) !important;
        border-radius: 7px !important;
        background: color-mix(in srgb, var(--rwm-rail), #11161c 72%) !important;
        color: #f3f7fb !important;
        font-size: 12px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .entry {
        position: relative !important;
        overflow: visible !important;
        padding-left: 22px !important;
        margin-left: 0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .midcol {
        position: absolute !important;
        left: 18px !important;
        top: 14px !important;
        width: 30px !important;
        margin: 0 !important;
        overflow: visible !important;
        z-index: 5 !important;
        pointer-events: auto !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .arrow {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 24px !important;
        height: 22px !important;
        margin: 3px auto !important;
        border: 1px solid #3b4a5b !important;
        border-radius: 6px !important;
        background: #222c37 !important;
        color: #d6e0ea !important;
        overflow: hidden !important;
        text-indent: -9999px !important;
        font-size: 0 !important;
        cursor: pointer !important;
        pointer-events: auto !important;
        position: relative !important;
        z-index: 6 !important;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .arrow.up:hover,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .arrow.up:focus-visible {
        background: #1f3b2a !important;
        border-color: #46b36a !important;
        color: #9df0b8 !important;
        transform: translateY(-1px);
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .arrow.down:hover,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .arrow.down:focus-visible {
        background: #4a2026 !important;
        border-color: #d16072 !important;
        color: #ffb7c2 !important;
        transform: translateY(1px);
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .arrow:before {
        content: "";
        display: block;
        width: 14px;
        height: 14px;
        background: currentColor;
        -webkit-mask: center / contain no-repeat;
        mask: center / contain no-repeat;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .arrow.up:before,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .arrow.upmod:before {
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4 4 14h5v6h6v-6h5z'/%3E%3C/svg%3E");
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4 4 14h5v6h6v-6h5z'/%3E%3C/svg%3E");
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .arrow.down:before,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .arrow.downmod:before {
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 20 4 10h5V4h6v6h5z'/%3E%3C/svg%3E");
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 20 4 10h5V4h6v6h5z'/%3E%3C/svg%3E");
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .arrow.upmod {
        background: #1f3b2a !important;
        border-color: #46b36a !important;
        color: #9df0b8 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .arrow.downmod {
        background: #4a2026 !important;
        border-color: #d16072 !important;
        color: #ffb7c2 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .score {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 21px !important;
        padding: 2px 7px !important;
        border: 1px solid #415266 !important;
        border-radius: 7px !important;
        background: #202934 !important;
        color: #dce6f0 !important;
        font-size: 13px !important;
        line-height: 1 !important;
        font-weight: 800 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .score.dislikes,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .score.likes {
        display: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .md {
        background: transparent !important;
        color: #dce4ed !important;
        font-size: 15px !important;
        line-height: 1.55 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .tagline {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 6px !important;
        margin-bottom: 7px !important;
        color: #aab7c5 !important;
        font-size: 13px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .tagline .expand,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .tagline .numchildren {
        display: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .author {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 22px !important;
        padding: 2px 8px !important;
        border: 1px solid #476a8d !important;
        border-radius: 7px !important;
        background: #20384f !important;
        color: #d8edff !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .author.submitter {
        border-color: #6f9ed0 !important;
        background: #244c76 !important;
        color: #edf7ff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .userattrs,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment time,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .live-timestamp {
        font-size: 13px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment time,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .live-timestamp {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 21px !important;
        padding: 2px 7px !important;
        border: 1px solid #3b4b5d !important;
        border-radius: 7px !important;
        background: #1d2630 !important;
        color: #b8c4d0 !important;
        line-height: 1 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .userattrs {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 21px !important;
        padding: 2px 6px !important;
        border: 1px solid #4c5f72 !important;
        border-radius: 7px !important;
        background: #212c37 !important;
        color: #d3dee8 !important;
        line-height: 1 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .tagline .RESUserTagImage,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .tagline .voteWeight,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .tagline .userattrs:empty,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .tagline span:empty {
        display: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
        margin-top: 9px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li {
        display: inline-flex !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list a,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list span {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 25px !important;
        padding: 4px 8px !important;
        border: 1px solid #334455 !important;
        border-radius: 7px !important;
        background: #202934 !important;
        color: #d6e1ec !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list a:hover {
        background: #2a3948 !important;
        border-color: #5d7a99 !important;
        color: #ffffff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li.rwm-permalink-button a,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li.rwm-permalink-button span {
        background: #253146 !important;
        border-color: #506a9d !important;
        color: #dce8ff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li.rwm-embed-button a,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li.rwm-embed-button span {
        background: #2c3340 !important;
        border-color: #657588 !important;
        color: #e1e9f3 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li.rwm-save-button a,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li.rwm-save-button span {
        background: #2c3340 !important;
        border-color: #657588 !important;
        color: #e1e9f3 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li.rwm-unsave-button a,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li.rwm-unsave-button span {
        background: #173d2a !important;
        border-color: #3fa86d !important;
        color: #dbffe9 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li.rwm-parent-button a,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li.rwm-parent-button span {
        background: #332e22 !important;
        border-color: #8e7441 !important;
        color: #ffe7b2 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li.rwm-report-button a,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li.rwm-report-button span {
        background: #3a2228 !important;
        border-color: #a45666 !important;
        color: #ffdbe3 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li.rwm-reply-button a,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li.rwm-reply-button span {
        background: #2d2842 !important;
        border-color: #6f60ad !important;
        color: #e9e1ff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li:is(.rwm-permalink-button, .rwm-embed-button, .rwm-save-button, .rwm-unsave-button, .rwm-parent-button, .rwm-report-button, .rwm-reply-button) a:hover,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li:is(.rwm-permalink-button, .rwm-embed-button, .rwm-save-button, .rwm-unsave-button, .rwm-parent-button, .rwm-report-button, .rwm-reply-button) span:hover,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list li:is(.rwm-permalink-button, .rwm-embed-button, .rwm-save-button, .rwm-unsave-button, .rwm-parent-button, .rwm-report-button, .rwm-reply-button) a:focus-visible {
        box-shadow: 0 0 16px color-mix(in srgb, currentColor, transparent 58%), 0 1px 0 rgba(255, 255, 255, 0.05) inset !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .expand {
        color: #7fb8f0 !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .content,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .content,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .content {
        max-width: min(calc(100vw - 64px), 1720px) !important;
        margin-left: 30px !important;
        margin-right: 30px !important;
        color: #d7dde3 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .content > .spacer,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .content > .spacer,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .content > .spacer {
        background: transparent !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .menuarea,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .menuarea,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .menuarea {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
        align-items: center !important;
        margin: 10px 0 14px !important;
        padding: 12px 14px !important;
        border: 1px solid #2f3d4a !important;
        border-radius: 8px !important;
        background: #151b22 !important;
        color: #cdd7e2 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .menuarea a,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .menuarea a,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .menuarea a {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 28px !important;
        padding: 5px 10px !important;
        border: 1px solid #40546a !important;
        border-radius: 7px !important;
        background: #202a35 !important;
        color: #e3edf8 !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .menuarea a.choice,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .menuarea a.active,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .menuarea a.choice,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .menuarea a.active,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .menuarea a.choice,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .menuarea a.active {
        background: #244263 !important;
        border-color: #4d86bd !important;
        color: #e5f3ff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message {
        display: flow-root !important;
        max-width: none !important;
        min-height: 0 !important;
        margin: 10px 0 14px !important;
        padding: 12px 14px 12px 52px !important;
        border: 1px solid #2f3d4a !important;
        border-radius: 8px !important;
        background: linear-gradient(180deg, #171e26 0%, #141a21 100%) !important;
        color: #d7dde3 !important;
        font-size: 15px !important;
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.16) !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message.new,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message.new,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message.new {
        border-color: #4d86bd !important;
        background: linear-gradient(180deg, #1b2834 0%, #17202a 100%) !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .midcol,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .midcol,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .midcol {
        width: 34px !important;
        margin-left: -42px !important;
        margin-right: 10px !important;
        overflow: visible !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .entry,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .entry,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .entry {
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        overflow: visible !important;
        color: #d7dde3 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .thing,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .comment,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .noncollapsed,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .usertext,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .usertext-body,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .md,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .thing,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .comment,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .noncollapsed,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .usertext,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .usertext-body,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .md,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .thing,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .comment,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .noncollapsed,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .usertext,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .usertext-body,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .md {
        border: 0 !important;
        background: transparent !important;
        color: #dce4ed !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .subject,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .parent,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .subject,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .parent,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .subject,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .parent {
        color: #8fc7ff !important;
        font-size: 16px !important;
        font-weight: 800 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .tagline,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .tagline,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .tagline {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 6px !important;
        margin: 4px 0 7px !important;
        color: #aab7c5 !important;
        font-size: 13px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .tagline a,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .tagline .author,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .tagline a,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .tagline .author,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .tagline a,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .tagline .author {
        color: #8fc7ff !important;
        font-weight: 800 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .md,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .usertext-body,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .md,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .usertext-body,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .md,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .usertext-body {
        margin: 7px 0 !important;
        padding: 0 !important;
        background: transparent !important;
        color: #dce4ed !important;
        font-size: 15px !important;
        line-height: 1.55 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .md p,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .md p,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .md p {
        color: #dce4ed !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .flat-list,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .flat-list,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .flat-list {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 5px !important;
        margin-top: 8px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .flat-list li,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .flat-list li,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .flat-list li {
        display: inline-flex !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .flat-list a,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .flat-list span,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .flat-list a,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .flat-list span,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .flat-list a,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .flat-list span {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 23px !important;
        padding: 3px 7px !important;
        border: 1px solid #334455 !important;
        border-radius: 6px !important;
        background: #202934 !important;
        color: #d6e1ec !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .flat-list form.toggle,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .flat-list form.toggle,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .flat-list form.toggle {
        display: inline-flex !important;
        align-items: center !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .flat-list form.toggle .option:not(.active),
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .flat-list form.toggle .option:not(.active),
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .flat-list form.toggle .option:not(.active),
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list form.toggle .option:not(.active),
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .flat-list form.toggle .option:not(.active) {
        display: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .flat-list form.toggle .option.active,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .flat-list form.toggle .option.active,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .flat-list form.toggle .option.active,
      html.${SCRIPT_CLASS}.rwm-wide .comments-page .thing.comment .flat-list form.toggle .option.active,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .flat-list form.toggle .option.active {
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .flat-list a:hover,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .flat-list a:hover,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .flat-list a:hover {
        background: #2a3948 !important;
        border-color: #5d7a99 !important;
        color: #ffffff !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .arrow,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .arrow,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .arrow {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 24px !important;
        height: 22px !important;
        margin: 3px auto !important;
        border: 1px solid #3b4a5b !important;
        border-radius: 6px !important;
        background: #222c37 !important;
        color: #d6e0ea !important;
        background-image: none !important;
        overflow: hidden !important;
        text-indent: -9999px !important;
        font-size: 0 !important;
        cursor: pointer !important;
        pointer-events: auto !important;
        position: relative !important;
        z-index: 6 !important;
        filter: none !important;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .arrow:before,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .arrow:before,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .arrow:before {
        content: "";
        display: block;
        width: 14px;
        height: 14px;
        background: currentColor;
        -webkit-mask: center / contain no-repeat;
        mask: center / contain no-repeat;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .arrow.up:before,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .arrow.upmod:before,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .arrow.up:before,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .arrow.upmod:before,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .arrow.up:before,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .arrow.upmod:before {
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4 4 14h5v6h6v-6h5z'/%3E%3C/svg%3E");
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4 4 14h5v6h6v-6h5z'/%3E%3C/svg%3E");
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .arrow.down:before,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .arrow.downmod:before,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .arrow.down:before,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .arrow.downmod:before,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .arrow.down:before,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .arrow.downmod:before {
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 20 4 10h5V4h6v6h5z'/%3E%3C/svg%3E");
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 20 4 10h5V4h6v6h5z'/%3E%3C/svg%3E");
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .arrow.up:hover,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .arrow.up:focus-visible,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .arrow.up:hover,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .arrow.up:focus-visible,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .arrow.up:hover,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .arrow.up:focus-visible {
        background: #1f3b2a !important;
        border-color: #46b36a !important;
        color: #9df0b8 !important;
        transform: translateY(-1px);
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .arrow.down:hover,
      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .arrow.down:focus-visible,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .arrow.down:hover,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .arrow.down:focus-visible,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .arrow.down:hover,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .arrow.down:focus-visible {
        background: #4a2026 !important;
        border-color: #d16072 !important;
        color: #ffb7c2 !important;
        transform: translateY(1px);
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .arrow.upmod,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .arrow.upmod,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .arrow.upmod {
        background: #1f3b2a !important;
        border-color: #46b36a !important;
        color: #9df0b8 !important;
      }

      html.${SCRIPT_CLASS}.rwm-wide .message-page .message .arrow.downmod,
      html.${SCRIPT_CLASS}.rwm-wide .messages-page .message .arrow.downmod,
      html.${SCRIPT_CLASS}.rwm-wide body[class*="message"] .message .arrow.downmod {
        background: #4a2026 !important;
        border-color: #d16072 !important;
        color: #ffb7c2 !important;
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

      html.${SCRIPT_CLASS} .thing.link .entry > .expando:empty,
      html.${SCRIPT_CLASS} .thing.link .entry > .media-preview:empty,
      html.${SCRIPT_CLASS} .thing.link .entry > .media-preview-content:empty,
      html.${SCRIPT_CLASS} .thing.link .entry > .reddit-video-player-root:empty {
        display: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        min-height: 0 !important;
        height: 0 !important;
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

      html.${SCRIPT_CLASS} .thing.link.rwm-has-own-media .expando-button,
      html.${SCRIPT_CLASS} .thing.link.rwm-has-own-media .expando-button.collapsed,
      html.${SCRIPT_CLASS} .thing.link.rwm-has-own-media .expando-button.video,
      html.${SCRIPT_CLASS} .thing.link.rwm-has-own-media .expando-button.image,
      html.${SCRIPT_CLASS} .thing.link.rwm-has-own-media .entry > .expando:not(.${MEDIA_CLASS}):not(.rwm-preserve-expando),
      html.${SCRIPT_CLASS} .thing.link.rwm-has-own-media .entry > .media-preview,
      html.${SCRIPT_CLASS} .thing.link.rwm-has-own-media .entry > .media-preview-content,
      html.${SCRIPT_CLASS} .thing.link.rwm-has-own-media .entry > .reddit-video-player-root {
        display: none !important;
      }

      html.${SCRIPT_CLASS} .thing.link.rwm-has-own-media .rwm-preserve-expando > :not(.usertext-body):not(.usertext):not(:has(.usertext-body)) {
        display: none !important;
      }


      html.${SCRIPT_CLASS} .expando-button:before {
        content: "";
        width: 16px;
        height: 16px;
        background: currentColor;
        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M12 5v14M5 12h14'/%3E%3C/svg%3E") center / contain no-repeat;
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M12 5v14M5 12h14'/%3E%3C/svg%3E") center / contain no-repeat;
      }

      html.${SCRIPT_CLASS} .expando-button.expanded:before {
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M5 12h14'/%3E%3C/svg%3E");
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M5 12h14'/%3E%3C/svg%3E");
      }

      html.${SCRIPT_CLASS} .side,
      html.${SCRIPT_CLASS} .side .spacer,
      html.${SCRIPT_CLASS} .sidecontentbox,
      html.${SCRIPT_CLASS} .titlebox,
      html.${SCRIPT_CLASS} .linkinfo,
      html.${SCRIPT_CLASS} .side .sidebox,
      html.${SCRIPT_CLASS} .side .sidebox .spacer,
      html.${SCRIPT_CLASS} .side .md-container,
      html.${SCRIPT_CLASS} .side .title,
      html.${SCRIPT_CLASS} .side .redditname,
      html.${SCRIPT_CLASS} .side .account-activity-box,
      html.${SCRIPT_CLASS} .side .subscribers,
      html.${SCRIPT_CLASS} .side .users-online {
        background: #151a20 !important;
        border-color: #303d4b !important;
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

      html.${SCRIPT_CLASS} .side a,
      html.${SCRIPT_CLASS} .side .md a,
      html.${SCRIPT_CLASS} .side .titlebox a,
      html.${SCRIPT_CLASS} .sidecontentbox a {
        color: #8fc7ff !important;
      }

      html.${SCRIPT_CLASS} .side .md h1,
      html.${SCRIPT_CLASS} .side .md h2,
      html.${SCRIPT_CLASS} .side .md h3,
      html.${SCRIPT_CLASS} .side .md h4,
      html.${SCRIPT_CLASS} .side .md h5,
      html.${SCRIPT_CLASS} .side .md h6 {
        color: #dce8f5 !important;
        font-weight: 900 !important;
      }

      html.${SCRIPT_CLASS} .side .md blockquote,
      html.${SCRIPT_CLASS} .side .md table,
      html.${SCRIPT_CLASS} .side .md pre {
        background: #11161c !important;
        border-color: #344252 !important;
        color: #d4dce5 !important;
      }

      html.${SCRIPT_CLASS} .side .md hr {
        border-color: #3a4654 !important;
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
        background: #243241 !important;
        color: #f1f6fb !important;
        font-size: 14px !important;
      }

      html.${SCRIPT_CLASS} .side .md a[href],
      html.${SCRIPT_CLASS} .side .md p > a:only-child,
      html.${SCRIPT_CLASS} .side .md li > a:only-child {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        max-width: 100% !important;
        min-height: 28px !important;
        margin: 2px 0 !important;
        padding: 5px 8px !important;
        border: 1px solid #334455 !important;
        border-radius: 6px !important;
        background: #202934 !important;
        color: #d6e1ec !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        line-height: 1.25 !important;
        text-align: center !important;
        text-decoration: none !important;
        box-sizing: border-box !important;
      }

      html.${SCRIPT_CLASS} .side .md a[href]:hover {
        background: #2a3948 !important;
        border-color: #5d7a99 !important;
        color: #ffffff !important;
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

      html.${SCRIPT_CLASS}.rwm-subreddits-page .side {
        display: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content {
        max-width: min(1680px, calc(100vw - 80px)) !important;
        margin: 0 auto !important;
        padding: 18px 22px 60px !important;
        box-sizing: border-box !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content > h1,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content > .spacer > h1 {
        color: #e3edf7 !important;
        font-size: 22px !important;
        font-weight: 900 !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit-search,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content #sr-autocomplete-area,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .searchpane,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .search-result-listing,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .raisedbox {
        background: #171d24 !important;
        border: 1px solid #334252 !important;
        border-radius: 8px !important;
        color: #d7dde3 !important;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22) !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit-search,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .searchpane {
        margin: 0 0 12px !important;
        padding: 18px 22px !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit-search input[type="text"],
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .searchpane input[type="text"] {
        min-width: min(520px, 70vw) !important;
        height: 36px !important;
        padding: 7px 11px !important;
        border-radius: 6px !important;
        background: #111820 !important;
        border-color: #43566d !important;
        color: #e7edf4 !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .infobar {
        margin: 12px 0 !important;
        padding: 10px 14px !important;
        border: 1px solid #6e5a22 !important;
        border-radius: 7px !important;
        background: #352c17 !important;
        color: #f7df9e !important;
        font-size: 14px !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .infobar a,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .infobar button,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .infobar .option,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .infobar .subscribe-button,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .infobar input[type="button"],
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .infobar input[type="submit"] {
        appearance: none !important;
        display: inline-flex !important;
        align-items: center !important;
        min-height: 24px !important;
        padding: 2px 8px !important;
        border: 1px solid #80692b !important;
        border-radius: 5px !important;
        background: #221b0f !important;
        color: #ffe3a2 !important;
        font-size: 13px !important;
        font-weight: 850 !important;
        line-height: 1 !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto !important;
        grid-template-areas:
          "title action"
          "meta action" !important;
        align-items: center !important;
        gap: 4px 14px !important;
        max-width: 1040px !important;
        min-height: 68px !important;
        margin: 8px 0 !important;
        padding: 10px 14px !important;
        border: 1px solid #334252 !important;
        border-radius: 8px !important;
        background: #171d24 !important;
        color: #d7dde3 !important;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18) !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit > * {
        min-width: 0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .fancy-toggle-button,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .subscribe-button {
        grid-area: action !important;
        align-self: center !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 54px !important;
        height: 30px !important;
        margin: 0 !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .fancy-toggle-button .option,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .subscribe-button .option,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .report {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 30px !important;
        padding: 0 11px !important;
        border: 1px solid #3f5267 !important;
        border-radius: 6px !important;
        background: #243241 !important;
        color: #f1f6fb !important;
        font-size: 13px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        text-decoration: none !important;
        box-sizing: border-box !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .fancy-toggle-button .add,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .subscribe-button .add {
        background: #1e5a34 !important;
        border-color: #58d58d !important;
        color: #eafff2 !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .fancy-toggle-button .remove,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .subscribe-button .remove {
        background: #5b2a35 !important;
        border-color: #e17386 !important;
        color: #ffecef !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .fancy-toggle-button .option:not(.active),
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .subscribe-button .option:not(.active) {
        display: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .fancy-toggle-button .option:hover,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .subscribe-button .option:hover,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .report:hover,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .rwm-subreddit-tools button:hover {
        box-shadow: 0 0 16px color-mix(in srgb, currentColor, transparent 58%), 0 1px 0 rgba(255, 255, 255, 0.05) inset !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit a.title,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .title a,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit > a[href^="/r/"] {
        grid-area: title !important;
        color: #8fc7ff !important;
        font-size: 16px !important;
        font-weight: 850 !important;
        text-decoration: none !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .usertext-body,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .md,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .description {
        display: none !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .tagline,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .age,
      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .users {
        grid-area: meta !important;
        color: #9da8b5 !important;
        font-size: 12px !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .subreddit .report {
        grid-column: 1 !important;
        justify-self: start !important;
        margin-top: 2px !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .rwm-subreddit-tools {
        display: flex !important;
        align-items: center !important;
        flex-wrap: wrap !important;
        gap: 9px !important;
        max-width: 1040px !important;
        margin: 0 0 10px !important;
        padding: 12px !important;
        border: 1px solid #334252 !important;
        border-radius: 8px !important;
        background: #171d24 !important;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18) !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .rwm-subreddit-tools button {
        min-height: 36px !important;
        padding: 0 13px !important;
        border-radius: 7px !important;
        font-weight: 850 !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .rwm-subreddit-tools .rwm-export-subs {
        background: #203f5f !important;
        border-color: #6aa8e6 !important;
        color: #e9f5ff !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .rwm-subreddit-tools .rwm-import-subs {
        background: #49346b !important;
        border-color: #a885e6 !important;
        color: #f3ebff !important;
      }

      html.${SCRIPT_CLASS}.rwm-subreddits-page body > .content .rwm-subreddit-status {
        color: #b8c4d0 !important;
        font-size: 13px !important;
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
      html.${SCRIPT_CLASS} .${MEDIA_CLASS} video,
      html.${SCRIPT_CLASS} .${MEDIA_CLASS} iframe {
        display: block;
        width: 100%;
        max-width: 100%;
        max-height: ${mediaMaxHeight};
        object-fit: contain;
        background: #070809;
        border: 1px solid rgba(158, 177, 198, 0.18);
        border-radius: 10px;
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
      }

      html.${SCRIPT_CLASS} .thing.link.rwm-nsfw-post .${MEDIA_CLASS} {
        position: relative;
      }

      html.${SCRIPT_CLASS} .thing.link.rwm-nsfw-post .${MEDIA_CLASS} img,
      html.${SCRIPT_CLASS} .thing.link.rwm-nsfw-post .${MEDIA_CLASS} video,
      html.${SCRIPT_CLASS} .thing.link.rwm-nsfw-post .${MEDIA_CLASS} iframe {
        filter: blur(18px) brightness(0.64) saturate(0.8);
        transition: filter 140ms ease;
      }

      html.${SCRIPT_CLASS} .thing.link.rwm-nsfw-post .${MEDIA_CLASS}:before {
        content: "NSFW";
        position: absolute;
        left: 50%;
        top: 50%;
        z-index: 2;
        transform: translate(-50%, -50%);
        padding: 8px 12px;
        border: 1px solid rgba(255, 177, 188, 0.6);
        border-radius: 8px;
        background: rgba(47, 13, 18, 0.86);
        color: #ffd9de;
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 0.08em;
        pointer-events: none;
      }

      html.${SCRIPT_CLASS} .thing.link.rwm-nsfw-post:hover .${MEDIA_CLASS} img,
      html.${SCRIPT_CLASS} .thing.link.rwm-nsfw-post:hover .${MEDIA_CLASS} video,
      html.${SCRIPT_CLASS} .thing.link.rwm-nsfw-post:hover .${MEDIA_CLASS} iframe,
      html.${SCRIPT_CLASS} .thing.link.rwm-nsfw-post:focus-within .${MEDIA_CLASS} img,
      html.${SCRIPT_CLASS} .thing.link.rwm-nsfw-post:focus-within .${MEDIA_CLASS} video,
      html.${SCRIPT_CLASS} .thing.link.rwm-nsfw-post:focus-within .${MEDIA_CLASS} iframe {
        filter: none;
      }

      html.${SCRIPT_CLASS} .thing.link.rwm-nsfw-post:hover .${MEDIA_CLASS}:before,
      html.${SCRIPT_CLASS} .thing.link.rwm-nsfw-post:focus-within .${MEDIA_CLASS}:before {
        opacity: 0;
      }

      html.${SCRIPT_CLASS} .${MEDIA_CLASS} img,
      html.${SCRIPT_CLASS} .${MEDIA_CLASS} video {
        height: auto;
      }

      html.${SCRIPT_CLASS} .${MEDIA_CLASS} iframe {
        aspect-ratio: 16 / 9;
        height: auto;
        min-height: 360px;
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

      html.${SCRIPT_CLASS} #rwm-media-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 26px;
        background: rgba(4, 7, 10, 0.86);
        backdrop-filter: blur(8px);
      }

      html.${SCRIPT_CLASS} #rwm-media-overlay.rwm-open {
        display: flex;
      }

      html.${SCRIPT_CLASS} .rwm-media-shell {
        position: relative;
        display: grid;
        grid-template-rows: minmax(0, 1fr) auto;
        gap: 12px;
        width: min(96vw, 1800px);
        height: min(94vh, 1200px);
      }

      html.${SCRIPT_CLASS} .rwm-media-stage {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 0;
        min-height: 0;
        border: 1px solid #32465b;
        border-radius: 8px;
        background: #080b0f;
        box-shadow: 0 24px 90px rgba(0, 0, 0, 0.5);
        overflow: hidden;
      }

      html.${SCRIPT_CLASS} .rwm-media-stage img {
        display: block;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      html.${SCRIPT_CLASS} .rwm-media-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }

      html.${SCRIPT_CLASS} .rwm-media-bar button,
      html.${SCRIPT_CLASS} .rwm-media-close {
        min-height: 36px;
        border: 1px solid #3f5570;
        border-radius: 6px;
        background: #1a2430;
        color: #e2ebf5;
        font: 800 13px/1 system-ui, sans-serif;
        cursor: pointer;
      }

      html.${SCRIPT_CLASS} .rwm-media-bar button {
        min-width: 44px;
        padding: 0 14px;
      }

      html.${SCRIPT_CLASS} .rwm-media-close {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 38px;
        padding: 0;
        z-index: 2;
      }

      html.${SCRIPT_CLASS} .rwm-media-count {
        min-width: 74px;
        color: #aebdca;
        text-align: center;
        font: 800 13px/1 system-ui, sans-serif;
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

      html.${SCRIPT_CLASS}.rwm-modal-open {
        overflow: hidden !important;
      }

      html.${SCRIPT_CLASS} #rwm-comments-overlay {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: none;
        background: rgba(3, 6, 10, 0.72);
        backdrop-filter: blur(4px);
      }

      html.${SCRIPT_CLASS} #rwm-comments-overlay.rwm-open {
        display: block;
      }

      html.${SCRIPT_CLASS} .rwm-comments-shell {
        position: absolute;
        inset: 34px 42px;
        display: grid;
        grid-template-rows: auto 1fr;
        overflow: hidden;
        border: 1px solid #3b4b5c;
        border-radius: 10px;
        background: #11161c;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.62);
      }

      html.${SCRIPT_CLASS} .rwm-comments-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 14px;
        border-bottom: 1px solid #2f3d4a;
        background: #171e26;
      }

      html.${SCRIPT_CLASS} .rwm-comments-title {
        min-width: 0;
        overflow: hidden;
        color: #dce8f5;
        font-size: 17px;
        font-weight: 900;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      html.${SCRIPT_CLASS} .rwm-comments-actions {
        display: flex;
        flex: none;
        gap: 8px;
      }

      html.${SCRIPT_CLASS} .rwm-comments-actions a,
      html.${SCRIPT_CLASS} .rwm-comments-actions button {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
        padding: 7px 11px;
        border: 1px solid #40546a;
        border-radius: 7px;
        background: #202a35;
        color: #e3edf8;
        cursor: pointer;
        font-size: 13px;
        font-weight: 900;
        line-height: 1;
        text-decoration: none;
      }

      html.${SCRIPT_CLASS} .rwm-comments-actions a:hover,
      html.${SCRIPT_CLASS} .rwm-comments-actions button:hover {
        background: #2b3948;
        border-color: #6686a8;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body {
        overflow: auto;
        padding: 18px 20px 24px;
        scrollbar-color: #536779 #11161c;
      }

      html.${SCRIPT_CLASS} .rwm-comments-status {
        display: flex;
        min-height: 220px;
        align-items: center;
        justify-content: center;
        color: #aeb8c4;
        font-size: 16px;
        font-weight: 800;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .linklisting {
        margin-bottom: 16px !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .thing.link {
        margin-bottom: 14px !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .commentarea {
        max-width: none !important;
        color: #d7dde3 !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .sitetable.nestedlisting {
        max-width: 1280px !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .panestack-title,
      html.${SCRIPT_CLASS} .rwm-comments-body .menuarea {
        max-width: 1280px !important;
        margin: 0 0 14px 0 !important;
        padding: 12px 14px !important;
        border: 1px solid #2f3d4a !important;
        border-radius: 8px !important;
        background: #151b22 !important;
        color: #cdd7e2 !important;
        font-size: 15px !important;
        font-weight: 800 !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .panestack-title .title {
        color: #dfe8f2 !important;
        font-size: 15px !important;
        font-weight: 900 !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .menuarea {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 8px !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .menuarea .dropdown-title,
      html.${SCRIPT_CLASS} .rwm-comments-body .menuarea .toggle a,
      html.${SCRIPT_CLASS} .rwm-comments-body .menuarea .toggle-button,
      html.${SCRIPT_CLASS} .rwm-comments-body .menuarea .reddit-infobar {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 28px !important;
        padding: 5px 10px !important;
        border: 1px solid #40546a !important;
        border-radius: 7px !important;
        background: #202a35 !important;
        color: #e3edf8 !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment {
        --rwm-rail: #3a536a;
        position: relative !important;
        max-width: 1280px !important;
        margin: 10px 0 10px 0 !important;
        padding: 12px 14px 12px 72px !important;
        border: 1px solid #2c3a47 !important;
        border-radius: 8px !important;
        background: linear-gradient(180deg, #171e26 0%, #141a21 100%) !important;
        color: #d7dde3 !important;
        font-size: 15px !important;
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.16) !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment.collapsed {
        opacity: 0.72 !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .child {
        margin: 12px 0 0 30px !important;
        border-left: 0 !important;
        padding: 0 0 0 18px !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .child .sitetable,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .child .thing,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .child:before {
        border-left: 0 !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment.rwm-depth-capped {
        margin-left: -48px !important;
        max-width: calc(100% + 48px) !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment.rwm-depth-0 { --rwm-rail: #46a2ff; border-color: color-mix(in srgb, #46a2ff, #2c3a47 74%) !important; }
      html.${SCRIPT_CLASS} .rwm-comments-body .comment.rwm-depth-1 { --rwm-rail: #56d68c; border-color: color-mix(in srgb, #56d68c, #2c3a47 74%) !important; }
      html.${SCRIPT_CLASS} .rwm-comments-body .comment.rwm-depth-2 { --rwm-rail: #f0c64f; border-color: color-mix(in srgb, #f0c64f, #2c3a47 74%) !important; }
      html.${SCRIPT_CLASS} .rwm-comments-body .comment.rwm-depth-3 { --rwm-rail: #ef8a4c; border-color: color-mix(in srgb, #ef8a4c, #2c3a47 74%) !important; }
      html.${SCRIPT_CLASS} .rwm-comments-body .comment.rwm-depth-4 { --rwm-rail: #e86fa2; border-color: color-mix(in srgb, #e86fa2, #2c3a47 74%) !important; }
      html.${SCRIPT_CLASS} .rwm-comments-body .comment.rwm-depth-5 { --rwm-rail: #a98cff; border-color: color-mix(in srgb, #a98cff, #2c3a47 74%) !important; }
      html.${SCRIPT_CLASS} .rwm-comments-body .comment.rwm-depth-6 { --rwm-rail: #63d5d7; border-color: color-mix(in srgb, #63d5d7, #2c3a47 74%) !important; }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .rwm-comment-rail {
        position: absolute;
        inset: 8px auto 8px 0;
        width: 10px !important;
        border: 1px solid color-mix(in srgb, var(--rwm-rail), #ffffff 18%) !important;
        border-radius: 999px !important;
        background: linear-gradient(180deg, color-mix(in srgb, var(--rwm-rail), #ffffff 16%), var(--rwm-rail)) !important;
        cursor: pointer !important;
        opacity: 0.95 !important;
        padding: 0 !important;
        transition: opacity 120ms ease, filter 120ms ease, transform 120ms ease, box-shadow 120ms ease;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .rwm-comment-rail:hover,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .rwm-comment-rail:focus-visible {
        opacity: 1;
        filter: saturate(1.35) brightness(1.2);
        transform: scaleX(1.25);
        box-shadow: 0 0 18px color-mix(in srgb, var(--rwm-rail), transparent 42%);
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment.rwm-collapsed-branch > .child {
        display: none !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment.rwm-collapsed-branch > .entry .rwm-collapse-note {
        display: inline-flex !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .rwm-collapse-note {
        display: none !important;
        align-items: center !important;
        min-height: 25px !important;
        margin-top: 9px !important;
        padding: 4px 8px !important;
        border: 1px solid color-mix(in srgb, var(--rwm-rail), #ffffff 18%) !important;
        border-radius: 7px !important;
        background: color-mix(in srgb, var(--rwm-rail), #11161c 72%) !important;
        color: #f3f7fb !important;
        font-size: 12px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .entry {
        position: relative !important;
        overflow: visible !important;
        padding-left: 22px !important;
        margin-left: 0 !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .midcol {
        position: absolute !important;
        left: 18px !important;
        top: 14px !important;
        width: 30px !important;
        margin: 0 !important;
        overflow: visible !important;
        z-index: 5 !important;
        pointer-events: auto !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .arrow {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 24px !important;
        height: 22px !important;
        margin: 3px auto !important;
        border: 1px solid #3b4a5b !important;
        border-radius: 6px !important;
        background: #222c37 !important;
        color: #d6e0ea !important;
        overflow: hidden !important;
        text-indent: -9999px !important;
        font-size: 0 !important;
        cursor: pointer !important;
        pointer-events: auto !important;
        position: relative !important;
        z-index: 6 !important;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .arrow.up:hover,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .arrow.up:focus-visible {
        background: #1f3b2a !important;
        border-color: #46b36a !important;
        color: #9df0b8 !important;
        transform: translateY(-1px);
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .arrow.down:hover,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .arrow.down:focus-visible {
        background: #4a2026 !important;
        border-color: #d16072 !important;
        color: #ffb7c2 !important;
        transform: translateY(1px);
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .arrow:before {
        content: "";
        display: block;
        width: 14px;
        height: 14px;
        background: currentColor;
        -webkit-mask: center / contain no-repeat;
        mask: center / contain no-repeat;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .arrow.up:before,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .arrow.upmod:before {
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4 4 14h5v6h6v-6h5z'/%3E%3C/svg%3E");
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4 4 14h5v6h6v-6h5z'/%3E%3C/svg%3E");
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .arrow.down:before,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .arrow.downmod:before {
        -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 20 4 10h5V4h6v6h5z'/%3E%3C/svg%3E");
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 20 4 10h5V4h6v6h5z'/%3E%3C/svg%3E");
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .arrow.upmod {
        background: #1f3b2a !important;
        border-color: #46b36a !important;
        color: #9df0b8 !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .arrow.downmod {
        background: #4a2026 !important;
        border-color: #d16072 !important;
        color: #ffb7c2 !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .arrow.rwm-vote-pending {
        filter: brightness(1.25) saturate(1.2);
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .arrow.rwm-vote-failed {
        background: #4b2d16 !important;
        border-color: #f0a23a !important;
        color: #ffd08a !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .score {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 21px !important;
        padding: 2px 7px !important;
        border: 1px solid #415266 !important;
        border-radius: 7px !important;
        background: #202934 !important;
        color: #dce6f0 !important;
        font-size: 13px !important;
        line-height: 1 !important;
        font-weight: 800 !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .score.dislikes,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .score.likes {
        display: none !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .md {
        background: transparent !important;
        color: #dce4ed !important;
        font-size: 15px !important;
        line-height: 1.55 !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .tagline {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 6px !important;
        margin-bottom: 7px !important;
        color: #aab7c5 !important;
        font-size: 13px !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .tagline .expand,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .tagline .numchildren {
        display: none !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .author {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 22px !important;
        padding: 2px 8px !important;
        border: 1px solid #476a8d !important;
        border-radius: 7px !important;
        background: #20384f !important;
        color: #d8edff !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .author.submitter {
        border-color: #6f9ed0 !important;
        background: #244c76 !important;
        color: #edf7ff !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .userattrs,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment time,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .live-timestamp {
        font-size: 13px !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment time,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .live-timestamp {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 21px !important;
        padding: 2px 7px !important;
        border: 1px solid #3b4b5d !important;
        border-radius: 7px !important;
        background: #1d2630 !important;
        color: #b8c4d0 !important;
        line-height: 1 !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .userattrs {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 21px !important;
        padding: 2px 6px !important;
        border: 1px solid #4c5f72 !important;
        border-radius: 7px !important;
        background: #212c37 !important;
        color: #d3dee8 !important;
        line-height: 1 !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .tagline .RESUserTagImage,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .tagline .voteWeight,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .tagline .userattrs:empty,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .tagline span:empty {
        display: none !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .flat-list {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
        margin-top: 9px !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .flat-list li {
        display: inline-flex !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .flat-list a,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .flat-list span {
        display: inline-flex !important;
        align-items: center !important;
        min-height: 25px !important;
        padding: 4px 8px !important;
        border: 1px solid #334455 !important;
        border-radius: 7px !important;
        background: #202934 !important;
        color: #d6e1ec !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .flat-list a:hover {
        background: #2a3948 !important;
        border-color: #5d7a99 !important;
        color: #ffffff !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment .expand {
        color: #7fb8f0 !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        text-decoration: none !important;
      }

      html.${SCRIPT_CLASS} .rwm-comments-body .comment textarea,
      html.${SCRIPT_CLASS} .rwm-comments-body .comment .usertext-edit {
        display: none !important;
      }

      @media (max-width: 900px) {
        html.${SCRIPT_CLASS} .rwm-comments-shell {
          inset: 10px;
        }

        html.${SCRIPT_CLASS} .rwm-comments-toolbar {
          align-items: flex-start;
          flex-direction: column;
        }
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

    GM_registerMenuCommand(`${settings.commentsModal ? "Disable" : "Enable"} comments lightbox`, () => {
      setSetting("commentsModal", !settings.commentsModal);
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

  function youtubeIdFromUrl(rawUrl) {
    const url = normalizeUrl(rawUrl);
    if (!url) return "";

    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
      let id = "";

      if (host === "youtu.be") {
        id = parsed.pathname.split("/").filter(Boolean)[0] || "";
      } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
        if (parsed.pathname === "/watch") id = parsed.searchParams.get("v") || "";
        else if (/^\/(?:shorts|embed|live)\//.test(parsed.pathname)) {
          id = parsed.pathname.split("/").filter(Boolean)[1] || "";
        }
      }

      id = id.split(/[?&#]/)[0] || "";
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
    } catch (_) {
      return "";
    }
  }

  function youtubeEmbedUrl(rawUrl) {
    const id = youtubeIdFromUrl(rawUrl);
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
  }

  function youtubeUrlFromThing(thing, postUrl = "") {
    if (youtubeEmbedUrl(postUrl)) return postUrl;

    const candidates = [
      thing.getAttribute("data-url") || "",
      thing.querySelector("a.title")?.href || "",
      ...Array.from(thing.querySelectorAll(".entry .expando a[href], .entry .usertext-body a[href], .entry .md a[href]"))
        .map((link) => link.href || link.getAttribute("href") || ""),
    ];

    return candidates.find((candidate) => youtubeEmbedUrl(candidate)) || "";
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
    const preserved = entry.querySelector(".rwm-preserve-expando");
    if (preserved) entry.insertBefore(container, preserved);
    else entry.appendChild(container);
    return container;
  }

  function normalizeCloneLinks(root, baseUrl) {
    root.querySelectorAll("[href]").forEach((el) => {
      const raw = el.getAttribute("href");
      if (!raw || raw.startsWith("#")) return;
      el.href = new URL(raw, baseUrl).href;
    });

    root.querySelectorAll("[src]").forEach((el) => {
      const raw = el.getAttribute("src");
      if (!raw) return;
      el.src = new URL(raw, baseUrl).href;
    });

    root.querySelectorAll("a").forEach((link) => {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
  }

  function getModhash() {
    return window.reddit?.modhash
      || document.querySelector('input[name="uh"]')?.value
      || document.body?.getAttribute("data-modhash")
      || "";
  }

  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  function isSubredditsPage() {
    return /^\/subreddits\/?/i.test(location.pathname);
  }

  function normalizeSubredditName(value) {
    const raw = String(value || "")
      .trim()
      .replace(/^https?:\/\/(?:old\.|www\.)?reddit\.com\/r\//i, "")
      .replace(/^\/?r\//i, "")
      .replace(/\/.*$/, "");
    if (!/^[A-Za-z0-9_]{2,30}$/.test(raw)) return "";
    return raw;
  }

  function parseSubredditImportPayload(payload) {
    const source = Array.isArray(payload) ? payload : payload?.subreddits;
    if (!Array.isArray(source)) throw new Error("JSON must be an array or an object with a subreddits array.");

    return Array.from(new Set(source.map((item) => {
      if (typeof item === "string") return normalizeSubredditName(item);
      return normalizeSubredditName(item?.display_name || item?.name || item?.display_name_prefixed || item?.url);
    }).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }

  async function fetchSubscribedSubreddits() {
    const subreddits = [];
    let after = "";

    do {
      const url = new URL("/subreddits/mine/subscriber.json", location.origin);
      url.searchParams.set("limit", "100");
      url.searchParams.set("raw_json", "1");
      if (after) url.searchParams.set("after", after);

      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error(`Reddit returned HTTP ${response.status}`);
      const payload = await response.json();
      const listing = payload?.data;

      for (const child of listing?.children || []) {
        const data = child?.data || {};
        const name = normalizeSubredditName(data.display_name || data.display_name_prefixed || data.url);
        if (!name) continue;
        subreddits.push({
          name,
          display_name: data.display_name || name,
          display_name_prefixed: data.display_name_prefixed || `r/${name}`,
          title: data.title || "",
          url: data.url || `/r/${name}/`,
        });
      }

      after = listing?.after || "";
    } while (after);

    const seen = new Set();
    return subreddits
      .filter((subreddit) => {
        const key = subreddit.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function subscribeToSubreddit(name) {
    const body = new URLSearchParams({
      action: "sub",
      sr_name: name,
      api_type: "json",
    });
    const uh = getModhash();
    if (uh) body.set("uh", uh);

    const response = await fetch("/api/subscribe", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json().catch(() => null);
    const errors = payload?.json?.errors || [];
    if (errors.length) throw new Error(errors.map((error) => error?.[1] || error?.[0]).filter(Boolean).join(", "));
  }

  async function exportSubreddits(status) {
    status.textContent = "Exporting subscriptions...";
    const subreddits = await fetchSubscribedSubreddits();
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`reddit-subreddits-${date}.json`, {
      schema: "reddit-wide-media-subreddits-v1",
      exportedAt: new Date().toISOString(),
      source: location.origin,
      count: subreddits.length,
      subreddits,
    });
    status.textContent = `Downloaded ${subreddits.length} subscriptions.`;
  }

  async function importSubreddits(file, status) {
    status.textContent = "Reading import file...";
    const payload = JSON.parse(await file.text());
    const names = parseSubredditImportPayload(payload);
    if (!names.length) {
      status.textContent = "No valid subreddit names found.";
      return;
    }

    const confirmed = window.confirm(`Subscribe this account to ${names.length} subreddits?\n\nThis will run slowly to reduce rate-limit trouble.`);
    if (!confirmed) {
      status.textContent = "Import cancelled.";
      return;
    }

    let ok = 0;
    const failed = [];
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      status.textContent = `Subscribing ${index + 1}/${names.length}: r/${name}`;
      try {
        await subscribeToSubreddit(name);
        ok += 1;
      } catch (error) {
        failed.push(`r/${name}`);
        console.warn("[Reddit Wide Media] subreddit import failed", name, error);
      }
      await sleep(900);
    }

    status.textContent = failed.length
      ? `Import finished: ${ok} subscribed, ${failed.length} failed. Check console for details.`
      : `Import finished: ${ok} subscribed.`;
  }

  function setupSubredditPageTools() {
    if (!isSubredditsPage()) return;
    document.documentElement.classList.add("rwm-subreddits-page");
    if (!document.body) return;

    const content = document.querySelector("body > .content")
      || Array.from(document.querySelectorAll(".content")).find((node) => !node.closest(".side"));
    if (!content) return;

    const existingToolbar = document.querySelector(".rwm-subreddit-tools");
    if (existingToolbar && existingToolbar.parentElement === content) return;

    const toolbar = existingToolbar || document.createElement("div");
    toolbar.className = "rwm-subreddit-tools";

    if (existingToolbar) {
      const infobar = content.querySelector(":scope > .infobar, :scope > .spacer > .infobar");
      if (infobar?.parentElement) infobar.insertAdjacentElement("afterend", toolbar);
      else content.prepend(toolbar);
      return;
    }

    const exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.className = "rwm-export-subs";
    exportButton.textContent = "Download Subreddits";

    const importButton = document.createElement("button");
    importButton.type = "button";
    importButton.className = "rwm-import-subs";
    importButton.textContent = "Import Subreddits";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/json,.json";
    fileInput.hidden = true;

    const status = document.createElement("span");
    status.className = "rwm-subreddit-status";
    status.textContent = "Backup or restore this account's subreddit subscriptions.";

    toolbar.append(exportButton, importButton, fileInput, status);
    const infobar = content.querySelector(":scope > .infobar, :scope > .spacer > .infobar");
    if (infobar?.parentElement) infobar.insertAdjacentElement("afterend", toolbar);
    else content.prepend(toolbar);

    exportButton.addEventListener("click", async () => {
      exportButton.disabled = true;
      try {
        await exportSubreddits(status);
      } catch (error) {
        status.textContent = `Export failed: ${error.message}`;
        console.warn("[Reddit Wide Media] subreddit export failed", error);
      } finally {
        exportButton.disabled = false;
      }
    });

    importButton.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;

      importButton.disabled = true;
      exportButton.disabled = true;
      try {
        await importSubreddits(file, status);
      } catch (error) {
        status.textContent = `Import failed: ${error.message}`;
        console.warn("[Reddit Wide Media] subreddit import failed", error);
      } finally {
        importButton.disabled = false;
        exportButton.disabled = false;
      }
    });
  }

  async function voteFromModal(arrow, dir) {
    const thing = arrow.closest(".thing");
    const id = thing?.getAttribute("data-fullname");
    if (!id) {
      console.warn("[Reddit Wide Media] modal vote missing thing id", arrow);
      return;
    }

    const previousUp = arrow.classList.contains("upmod");
    const previousDown = arrow.classList.contains("downmod");
    const effectiveDir = (dir === 1 && previousUp) || (dir === -1 && previousDown) ? 0 : dir;
    const midcol = arrow.closest(".midcol") || thing;

    midcol.querySelectorAll(".arrow").forEach((node) => {
      node.classList.remove("upmod", "downmod", "rwm-vote-pending", "rwm-vote-failed");
    });
    if (effectiveDir === 1) arrow.classList.add("upmod");
    if (effectiveDir === -1) arrow.classList.add("downmod");
    arrow.classList.add("rwm-vote-pending");

    const body = new URLSearchParams({
      id,
      dir: String(effectiveDir),
      rank: "2",
    });
    const uh = getModhash();
    if (uh) body.set("uh", uh);

    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      arrow.classList.remove("rwm-vote-pending");
    } catch (error) {
      arrow.classList.remove("rwm-vote-pending");
      arrow.classList.add("rwm-vote-failed");
      console.warn("[Reddit Wide Media] modal vote failed", error);
    }
  }

  function enhanceCommentTree(root) {
    const railColors = ["#46a2ff", "#56d68c", "#f0c64f", "#ef8a4c", "#e86fa2", "#a98cff", "#63d5d7"];
    const depthClasses = railColors.map((_, index) => `rwm-depth-${index}`);

    root.querySelectorAll(".comment").forEach((comment) => {
      const parent = comment.parentElement?.closest(".comment");
      const actualDepth = parent ? Number(parent.dataset.rwmDepth || 0) + 1 : 0;
      const displayDepth = actualDepth % railColors.length;
      comment.dataset.rwmDepth = String(actualDepth);
      comment.classList.remove(...depthClasses, "rwm-depth-capped");
      comment.classList.add(`rwm-depth-${displayDepth}`);
      comment.classList.toggle("rwm-depth-capped", actualDepth >= 5);
      comment.style.setProperty("--rwm-rail", railColors[displayDepth]);

      const entry = comment.querySelector(":scope > .entry");
      if (!entry) return;

      entry.querySelectorAll(":scope > .tagline .score.likes, :scope > .tagline .score.dislikes, :scope > .tagline .expand, :scope > .tagline .numchildren").forEach((node) => {
        node.remove();
      });

      if (entry.querySelector(":scope > .rwm-comment-rail")) return;

      const child = comment.querySelector(":scope > .child");
      if (!child) return;

      const rail = document.createElement("div");
      rail.className = "rwm-comment-rail";
      rail.setAttribute("role", "button");
      rail.tabIndex = 0;
      rail.style.setProperty("--rwm-rail", railColors[displayDepth]);
      rail.title = "Collapse replies";
      rail.setAttribute("aria-label", "Collapse replies");

      const note = document.createElement("span");
      note.className = "rwm-collapse-note";
      const hiddenCount = child.querySelectorAll(".comment").length;
      note.textContent = `${hiddenCount} ${hiddenCount === 1 ? "reply" : "replies"} hidden`;
      const buttons = entry.querySelector(":scope > .flat-list.buttons, :scope > ul.flat-list");
      if (buttons) buttons.after(note);
      else entry.appendChild(note);

      rail.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const collapsed = comment.classList.toggle("rwm-collapsed-branch");
        rail.title = collapsed ? "Expand replies" : "Collapse replies";
        rail.setAttribute("aria-label", rail.title);
      });

      rail.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        rail.click();
      });

      entry.prepend(rail);
    });
  }

  function getCommentsOverlay() {
    let overlay = document.getElementById("rwm-comments-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "rwm-comments-overlay";
    overlay.innerHTML = `
      <div class="rwm-comments-shell" role="dialog" aria-modal="true" aria-labelledby="rwm-comments-title">
        <div class="rwm-comments-toolbar">
          <div id="rwm-comments-title" class="rwm-comments-title">Comments</div>
          <div class="rwm-comments-actions">
            <a class="rwm-comments-open" href="#" target="_blank" rel="noopener noreferrer">Open full page</a>
            <button class="rwm-comments-close" type="button">Close</button>
          </div>
        </div>
        <div class="rwm-comments-body">
          <div class="rwm-comments-status">Loading comments...</div>
        </div>
      </div>
    `;

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeCommentsOverlay();
    });

    overlay.querySelector(".rwm-comments-close").addEventListener("click", closeCommentsOverlay);
    overlay.querySelector(".rwm-comments-body").addEventListener("click", (event) => {
      const arrow = event.target.closest(".arrow");
      if (!arrow || !overlay.contains(arrow)) return;
      if (!arrow.closest(".comment")) return;

      const isUp = arrow.classList.contains("up") || arrow.classList.contains("upmod");
      const isDown = arrow.classList.contains("down") || arrow.classList.contains("downmod");
      if (!isUp && !isDown) return;

      event.preventDefault();
      event.stopPropagation();
      voteFromModal(arrow, isUp ? 1 : -1);
    }, true);
    document.body.appendChild(overlay);
    return overlay;
  }

  function closeCommentsOverlay() {
    const overlay = document.getElementById("rwm-comments-overlay");
    if (!overlay) return;
    overlay.classList.remove("rwm-open");
    document.documentElement.classList.remove("rwm-modal-open");
  }

  async function openCommentsOverlay(url, title = "Comments") {
    const overlay = getCommentsOverlay();
    const body = overlay.querySelector(".rwm-comments-body");
    const titleEl = overlay.querySelector(".rwm-comments-title");
    const openLink = overlay.querySelector(".rwm-comments-open");

    titleEl.textContent = title;
    openLink.href = url;
    body.innerHTML = `<div class="rwm-comments-status">Loading comments...</div>`;
    overlay.classList.add("rwm-open");
    document.documentElement.classList.add("rwm-modal-open");

    try {
      const response = await fetch(url, {
        credentials: "include",
        headers: { Accept: "text/html" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const fetchedTitle = doc.querySelector(".thing.link a.title")?.textContent?.trim();
      if (fetchedTitle) titleEl.textContent = fetchedTitle;

      const content = document.createElement("div");
      const commentArea = doc.querySelector(".commentarea")?.cloneNode(true);

      if (commentArea) {
        commentArea.querySelectorAll("script, iframe").forEach((node) => node.remove());
        content.appendChild(commentArea);
      }

      if (!commentArea) throw new Error("No comment content found");

      normalizeCloneLinks(content, url);
      enhanceCommentTree(content);
      body.textContent = "";
      body.appendChild(content);
    } catch (error) {
      body.innerHTML = `
        <div class="rwm-comments-status">
          Could not load comments here. Use Open full page.
        </div>
      `;
      console.warn("[Reddit Wide Media] comment modal failed", error);
    }
  }

  function mediaLinksFromContainer(container) {
    return Array.from(container.querySelectorAll("a.rwm-image-link[href]"))
      .map((link) => ({
        url: link.href,
        alt: link.querySelector("img")?.alt || "",
      }))
      .filter((item) => item.url);
  }

  function closeMediaOverlay() {
    const overlay = document.getElementById("rwm-media-overlay");
    if (!overlay) return;
    overlay.classList.remove("rwm-open");
    document.documentElement.classList.remove("rwm-modal-open");
  }

  function getMediaOverlay() {
    let overlay = document.getElementById("rwm-media-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "rwm-media-overlay";
    overlay.innerHTML = `
      <div class="rwm-media-shell" role="dialog" aria-modal="true" aria-label="Image viewer">
        <button class="rwm-media-close" type="button" aria-label="Close">x</button>
        <div class="rwm-media-stage">
          <img alt="">
        </div>
        <div class="rwm-media-bar">
          <button class="rwm-media-prev" type="button" aria-label="Previous image">Prev</button>
          <span class="rwm-media-count"></span>
          <button class="rwm-media-next" type="button" aria-label="Next image">Next</button>
        </div>
      </div>
    `;

    const move = (direction) => {
      const items = JSON.parse(overlay.dataset.rwmItems || "[]");
      if (items.length < 2) return;
      const current = Number(overlay.dataset.rwmIndex || 0);
      showMediaOverlayItem(overlay, items, (current + direction + items.length) % items.length);
    };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeMediaOverlay();
    });
    overlay.querySelector(".rwm-media-close").addEventListener("click", closeMediaOverlay);
    overlay.querySelector(".rwm-media-prev").addEventListener("click", () => move(-1));
    overlay.querySelector(".rwm-media-next").addEventListener("click", () => move(1));
    document.addEventListener("keydown", (event) => {
      if (!overlay.classList.contains("rwm-open")) return;
      if (event.key === "Escape") closeMediaOverlay();
      else if (event.key === "ArrowLeft") move(-1);
      else if (event.key === "ArrowRight") move(1);
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function showMediaOverlayItem(overlay, items, index) {
    const item = items[index];
    if (!item) return;

    overlay.dataset.rwmItems = JSON.stringify(items);
    overlay.dataset.rwmIndex = String(index);

    const image = overlay.querySelector(".rwm-media-stage img");
    image.src = item.url;
    image.alt = item.alt || "";

    overlay.querySelector(".rwm-media-count").textContent = `${index + 1} / ${items.length}`;
    overlay.querySelector(".rwm-media-prev").hidden = items.length < 2;
    overlay.querySelector(".rwm-media-next").hidden = items.length < 2;
  }

  function openMediaOverlay(container, src) {
    const items = mediaLinksFromContainer(container);
    if (!items.length) return;

    const index = Math.max(0, items.findIndex((item) => item.url === src));
    const overlay = getMediaOverlay();
    showMediaOverlayItem(overlay, items, index);
    overlay.classList.add("rwm-open");
    document.documentElement.classList.add("rwm-modal-open");
  }

  function renderImage(container, src, alt = "") {
    const link = document.createElement("a");
    link.className = "rwm-image-link";
    link.href = src;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      openMediaOverlay(container, src);
    });

    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.src = src;
    img.alt = alt;

    link.appendChild(img);
    container.appendChild(link);
    container.hidden = false;
  }

  function renderVideo(container, item) {
    const src = typeof item === "string" ? item : item.url;
    const hlsUrl = typeof item === "string" ? "" : item.hlsUrl;
    const video = document.createElement("video");
    video.controls = true;
    video.loop = true;
    video.muted = false;
    video.volume = 0.25;
    video.preload = "metadata";

    if (hlsUrl && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
    } else if (hlsUrl && window.Hls?.isSupported()) {
      const hls = new window.Hls({
        capLevelToPlayerSize: true,
        maxBufferLength: 30,
      });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      video._rwmHls = hls;
    } else {
      video.src = src;
    }

    container.appendChild(video);
    container.hidden = false;
  }

  function renderYouTube(container, rawUrl, title = "") {
    const embedUrl = youtubeEmbedUrl(rawUrl);
    if (!embedUrl) return false;

    const iframe = document.createElement("iframe");
    iframe.src = embedUrl;
    iframe.title = title || "YouTube video";
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";

    container.appendChild(iframe);
    container.hidden = false;
    return true;
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
      items.push({
        type: "video",
        url: video.fallback_url.replace(/&amp;/g, "&"),
        hlsUrl: video.hls_url ? video.hls_url.replace(/&amp;/g, "&") : "",
      });
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

  function thumbnailUrlFromPostData(post) {
    if (!post) return "";
    const candidates = [
      post.thumbnail,
      post.preview?.images?.[0]?.source?.url,
      post.preview?.images?.[0]?.resolutions?.at(-1)?.url,
    ];
    const url = candidates.find((candidate) => /^https?:\/\//i.test(candidate || ""));
    return url ? url.replace(/&amp;/g, "&") : "";
  }

  function applyPostThumbnail(thing, post) {
    const src = thumbnailUrlFromPostData(post);
    if (!src) return;

    const thumbnail = thing.querySelector(".thumbnail");
    if (!thumbnail) return;

    thumbnail.classList.add("rwm-has-thumb");
    thumbnail.textContent = "";
    thumbnail.style.removeProperty("background-image");

    const existing = thumbnail.querySelector("img");
    const img = existing || document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.src = src;
    img.alt = post?.title || "";
    if (!existing) thumbnail.appendChild(img);
  }

  async function renderFetchedMedia(thing, container) {
    container.hidden = false;
    container.appendChild(makeStatus("Loading media..."));

    try {
      const post = await fetchPostJson(thing);
      applyPostThumbnail(thing, post);
      const items = mediaItemsFromPostData(post);
      container.textContent = "";

      if (!items.length) {
        container.remove();
        thing.classList.remove("rwm-has-own-media");
        return;
      }

      if (items.length > 1) container.classList.add("rwm-gallery");
      for (const item of items.slice(0, 20)) {
        if (item.type === "video") renderVideo(container, item);
        else renderImage(container, item.url, post?.title || "");
      }
    } catch (error) {
      container.textContent = "";
      container.remove();
      thing.classList.remove("rwm-has-own-media");
      console.warn("[Reddit Wide Media] media load failed", error);
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
      label.classList.remove("rwm-flair-question", "rwm-flair-fun", "rwm-flair-news", "rwm-flair-warning", "rwm-flair-nsfw");

      if (/question|help|support|advice/.test(text)) {
        label.classList.add("rwm-flair-question");
      } else if (/humou?r|meme|funny|lol|shitpost/.test(text)) {
        label.classList.add("rwm-flair-fun");
      } else if (/news|article|release|update|announcement/.test(text)) {
        label.classList.add("rwm-flair-news");
      } else if (/nsfw|spoiler|warning|serious/.test(text)) {
        label.classList.add("rwm-flair-warning");
        if (/^nsfw$|not safe/i.test(text)) label.classList.add("rwm-flair-nsfw");
      }
    });
  }

  function markNsfwPost(thing) {
    const isNsfw = thing.classList.contains("over18")
      || thing.querySelector(".thumbnail.nsfw, .nsfw-stamp")
      || /\bnsfw\b/i.test(thing.getAttribute("data-domain") || "");
    thing.classList.toggle("rwm-nsfw-post", Boolean(isNsfw));
  }

  function shouldPreserveExpando(node) {
    if (!node || node.classList.contains(MEDIA_CLASS)) return false;
    const textRoot = node.querySelector(".usertext-body .md, .usertext-body, .md");
    return Boolean((textRoot?.textContent || "").trim());
  }

  function suppressNativeMediaExpando(thing) {
    thing.classList.add("rwm-has-own-media");
    thing.querySelectorAll(
      ".expando-button:not(.selftext):not(.selftext-muted), .entry > .expando:not(.rwm-media), .entry > .media-preview, .entry > .media-preview-content, .entry > .reddit-video-player-root",
    ).forEach((node) => {
      if (shouldPreserveExpando(node)) {
        node.classList.add("rwm-preserve-expando");
        node.hidden = false;
        node.style.removeProperty("display");
        // Hide native gallery/media children within the preserved expando;
        // keep only the usertext wrapper and its descendants.
        Array.from(node.children).forEach((child) => {
          if (
            !child.classList.contains("usertext-body") &&
            !child.classList.contains("usertext") &&
            !child.querySelector(".usertext-body, .md")
          ) {
            child.hidden = true;
            child.style.setProperty("display", "none", "important");
          }
        });
        return;
      }

      node.hidden = true;
      node.style.setProperty("display", "none", "important");
    });
  }

  function autoExpandText(thing) {
    if (!settings.autoExpandText) return;
    if (thing.getAttribute("data-rwm-text-expanded") === "1") return;

    const clickWhenReady = () => {
      const button = thing.querySelector(
        ".expando-button.collapsed.selftext, .expando-button.collapsed.selftext-muted",
      );
      if (!button) return false;

      thing.setAttribute("data-rwm-text-expanded", "1");
      if (button.isConnected && button.classList.contains("collapsed")) button.click();
      return true;
    };

    if (clickWhenReady()) return;
    [100, 350, 900, 1600].forEach((delay) => {
      window.setTimeout(() => {
        if (thing.getAttribute("data-rwm-text-expanded") !== "1") clickWhenReady();
      }, delay);
    });
  }

  function setupCommentsModal(thing) {
    if (!settings.commentsModal) return;
    const link = thing.querySelector("a.comments");
    if (!link || link.getAttribute("data-rwm-comments-modal") === "1") return;

    link.setAttribute("data-rwm-comments-modal", "1");
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      const title = thing.querySelector("a.title")?.textContent?.trim() || "Comments";
      openCommentsOverlay(link.href, title);
    });
  }

  function prepareThing(thing) {
    if (thing.getAttribute(PROCESSED_ATTR) === "1") return;
    thing.setAttribute(PROCESSED_ATTR, "1");
    markNsfwPost(thing);
    decorateFlairs(thing);
    setupCommentsModal(thing);

    if (hasResMedia(thing)) return;

    const postUrl = getPostUrl(thing);
    const directImage = imageUrlFromPostUrl(postUrl);
    const youtubeUrl = youtubeUrlFromThing(thing, postUrl);
    const youtubeEmbed = youtubeEmbedUrl(youtubeUrl);
    const needsFetch = isRedditGallery(postUrl) || isRedditVideo(postUrl);

    if (!directImage && !youtubeEmbed && !needsFetch) {
      autoExpandText(thing);
      return;
    }

    if (youtubeEmbed) thing.classList.add("rwm-youtube");

    suppressNativeMediaExpando(thing);
    autoExpandText(thing);
    const container = placeMediaContainer(thing);
    const load = () => {
      if (container.getAttribute("data-rwm-loaded") === "1") return;
      container.setAttribute("data-rwm-loaded", "1");
      const title = thing.querySelector("a.title")?.textContent || "";
      if (youtubeEmbed) renderYouTube(container, youtubeUrl, title);
      else if (directImage) renderImage(container, directImage, title);
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
    if (root.matches?.(".thing.link")) prepareThing(root);
    root.querySelectorAll(".thing.link").forEach(prepareThing);
    if (root.matches?.(".comment")) enhanceCommentTree(root.parentElement || document);
    enhanceCommentTree(root);
    refreshActionButtonStates(root);
  }

  function refreshActionButtonStates(root = document) {
    const buttonClassMap = new Map([
      ["comments", "rwm-comments-button"],
      ["share", "rwm-share-button"],
      ["save", "rwm-save-button"],
      ["unsave", "rwm-unsave-button"],
      ["hide", "rwm-hide-button"],
      ["report", "rwm-report-button"],
      ["crosspost", "rwm-crosspost-button"],
      ["permalink", "rwm-permalink-button"],
      ["embed", "rwm-embed-button"],
      ["parent", "rwm-parent-button"],
      ["reply", "rwm-reply-button"],
    ]);
    const buttonClasses = Array.from(buttonClassMap.values());
    const classify = (item) => {
      const visibleLabels = Array.from(item.querySelectorAll("a, button, span.option"))
        .filter((node) => {
          const style = window.getComputedStyle(node);
          return style.display !== "none" && style.visibility !== "hidden";
        })
        .map((node) => (node.innerText || node.textContent || "").trim().toLowerCase())
        .filter(Boolean);
      const label = visibleLabels.join(" ") || (item.innerText || item.textContent || "").trim().toLowerCase();
      item.classList.remove(...buttonClasses);
      for (const [needle, className] of buttonClassMap) {
        if (label === needle || label.startsWith(`${needle} `)) {
          item.classList.add(className);
          break;
        }
      }
    };

    root.querySelectorAll(".thing.link .flat-list.buttons li").forEach(classify);
    root.querySelectorAll(".comments-page .thing.comment .flat-list li, .rwm-comments-body .comment .flat-list li").forEach((item) => {
      classify(item);
    });
  }

  function rewriteMailLabel() {
    const mail = document.querySelector("#header-bottom-right #mail");
    if (!mail) return;

    const countEl = mail.parentElement?.querySelector(".message-count");
    const rawCount = (countEl?.textContent || "").trim();
    const label = rawCount ? `Mail (${rawCount})` : "Mail";
    if (mail.textContent !== label) mail.textContent = label;
    if (countEl) countEl.hidden = true;
  }

  function setupUserHeaderMenu() {
    const header = document.querySelector("#header-bottom-right");
    header?.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && /^\s*\|\s*$/.test(node.textContent || "")) node.textContent = "";
    });

    const user = document.querySelector("#header-bottom-right .user");
    const userLink = user?.querySelector("a[href*='/user/']");
    if (!user || !userLink) return;

    const username = (userLink.textContent || "").trim();
    if (!username) return;

    user.classList.add("rwm-user-pill");
    if (!user.querySelector(".rwm-user-menu")) {
      const encoded = encodeURIComponent(username);
      const chevron = document.createElement("span");
      chevron.className = "rwm-user-chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "▼";
      user.appendChild(chevron);

      const menu = document.createElement("div");
      menu.className = "rwm-user-menu";
      menu.setAttribute("role", "menu");
      menu.innerHTML = [
        ["Profile", `https://old.reddit.com/user/${encoded}/`],
        ["Saved", `https://old.reddit.com/user/${encoded}/saved/`],
        ["Submitted", `https://old.reddit.com/user/${encoded}/submitted/`],
        ["Upvoted", `https://old.reddit.com/user/${encoded}/upvoted/`],
        ["Downvoted", `https://old.reddit.com/user/${encoded}/downvoted/`],
      ].map(([label, href]) => `<a role="menuitem" href="${href}">${label}</a>`).join("");
      user.appendChild(menu);
    }

    userLink.setAttribute("aria-haspopup", "menu");
    userLink.setAttribute("aria-expanded", String(user.classList.contains("rwm-user-menu-open")));
    user.setAttribute("role", "button");
    user.setAttribute("tabindex", "0");

    if (user.dataset.rwmMenuReady !== "1") {
      user.dataset.rwmMenuReady = "1";

      const close = (targetUser = user) => {
        const targetLink = targetUser.querySelector("a[href*='/user/']");
        targetUser.classList.remove("rwm-user-menu-open");
        targetLink?.setAttribute("aria-expanded", "false");
      };

      const openOnlyThisUser = () => {
        document.querySelectorAll("#header-bottom-right .user.rwm-user-menu-open").forEach((openUser) => {
          if (openUser !== user) close(openUser);
        });
      };

      const toggle = (event) => {
        event.preventDefault();
        event.stopPropagation();
        openOnlyThisUser();
        const isOpen = user.classList.toggle("rwm-user-menu-open");
        userLink.setAttribute("aria-expanded", String(isOpen));
      };

      user.addEventListener("click", (event) => {
        if (event.target?.closest?.(".rwm-user-menu")) return;
        toggle(event);
      });

      user.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        toggle(event);
      });
    }

    if (userHeaderGlobalListenersReady) return;
    userHeaderGlobalListenersReady = true;

    const closeAll = () => {
      document.querySelectorAll("#header-bottom-right .user.rwm-user-menu-open").forEach((openUser) => {
        const openLink = openUser.querySelector("a[href*='/user/']");
        openUser.classList.remove("rwm-user-menu-open");
        openLink?.setAttribute("aria-expanded", "false");
      });
    };

    document.addEventListener("click", (event) => {
      if (event.target?.closest?.("#header-bottom-right .user")) return;
      closeAll();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAll();
    });
  }

  function setupSubredditHeaderBar() {
    const header = document.querySelector("#sr-header-area");
    if (!header) return;

    const container = header.querySelector(".width-clip") || header;
    const existing = container.querySelector(".rwm-sr-nav");
    const path = location.pathname.replace(/\/+$/, "").toLowerCase() || "/";
    const links = [
      ["Home", "https://old.reddit.com/", path === "/"],
      ["Popular", "https://old.reddit.com/r/popular/", path === "/r/popular"],
      ["All", "https://old.reddit.com/r/all/", path === "/r/all"],
      ["Subreddits", "https://old.reddit.com/subreddits/", path.startsWith("/subreddits"), "rwm-sr-manage"],
    ];

    const nav = existing || document.createElement("nav");
    nav.className = "rwm-sr-nav";
    nav.setAttribute("aria-label", "Reddit sections");
    const markup = links.map(([label, href, active, extraClass]) => {
      const classes = [active ? "rwm-active" : "", extraClass || ""].filter(Boolean).join(" ");
      return `<a href="${href}"${classes ? ` class="${classes}"` : ""}>${label}</a>`;
    }).join("");
    if (nav.innerHTML !== markup) nav.innerHTML = markup;

    if (!existing) container.appendChild(nav);

    const selected = header.querySelector(".srdrop .selected, .dropdown.srdrop .selected");
    if (selected && /^my subreddits$/i.test((selected.textContent || "").trim())) {
      selected.textContent = "My subreddits";
    }

    setupSubredditDropdownSearch();
  }

  function setupSubredditDropdownSearch() {
    document.querySelectorAll(".drop-choices.srdrop, #sr-header-area .drop-choices, .drop-choices").forEach((dropdown) => {
      const choices = Array.from(dropdown.querySelectorAll("a.choice, a[href*='/r/']"));
      if (!choices.length || dropdown.querySelector(".rwm-sr-search")) return;

      const wrap = document.createElement("div");
      wrap.className = "rwm-sr-search-wrap";

      const input = document.createElement("input");
      input.type = "search";
      input.className = "rwm-sr-search";
      input.placeholder = "Search subreddits";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.setAttribute("aria-label", "Search subreddits");

      const stopDropdownClick = (event) => event.stopPropagation();
      wrap.addEventListener("mousedown", stopDropdownClick);
      wrap.addEventListener("click", stopDropdownClick);
      wrap.addEventListener("keydown", stopDropdownClick);

      input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();
        choices.forEach((choice) => {
          const text = (choice.textContent || "").trim().toLowerCase();
          const hidden = Boolean(query && !text.includes(query));
          choice.hidden = hidden;
          choice.style.setProperty("display", hidden ? "none" : "", hidden ? "important" : "");
        });
      });

      wrap.appendChild(input);
      dropdown.prepend(wrap);
    });
  }

  function getCurrentSubredditName() {
    const match = location.pathname.match(/^\/r\/([^/]+)/i);
    if (!match) return "";
    const name = decodeURIComponent(match[1] || "").trim();
    if (!name || /^(all|popular)$/i.test(name)) return "";
    return name;
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function setupSubredditAccent() {
    const name = getCurrentSubredditName();
    const root = document.documentElement;
    if (!name) {
      root.classList.remove("rwm-has-subreddit-accent");
      root.style.removeProperty("--rwm-subreddit-accent");
      root.style.removeProperty("--rwm-subreddit-accent-soft");
      return;
    }

    const palette = [
      ["#d75f6a", "rgba(215, 95, 106, 0.16)"],
      ["#d8894d", "rgba(216, 137, 77, 0.16)"],
      ["#d2b855", "rgba(210, 184, 85, 0.15)"],
      ["#72bd69", "rgba(114, 189, 105, 0.15)"],
      ["#4fc0a4", "rgba(79, 192, 164, 0.15)"],
      ["#55a8db", "rgba(85, 168, 219, 0.16)"],
      ["#7b95e6", "rgba(123, 149, 230, 0.16)"],
      ["#b07be2", "rgba(176, 123, 226, 0.16)"],
      ["#d477ba", "rgba(212, 119, 186, 0.15)"],
    ];
    const [accent, soft] = palette[hashString(name.toLowerCase()) % palette.length];
    root.classList.add("rwm-has-subreddit-accent");
    root.style.setProperty("--rwm-subreddit-accent", accent);
    root.style.setProperty("--rwm-subreddit-accent-soft", soft);
  }

  function restoreHiddenPostFromUndo(control) {
    const label = (control?.innerText || control?.textContent || control?.getAttribute?.("title") || "").trim().toLowerCase();
    if (!/\b(undo|unhide)\b/.test(label)) return;

    const hiddenPosts = [];
    let node = control.closest(".spacer, .organic-listing, .linklisting, .content") || control.parentElement;

    for (let depth = 0; node && depth < 4; depth += 1, node = node.parentElement) {
      let previous = node.previousElementSibling;
      for (let steps = 0; previous && steps < 6; steps += 1, previous = previous.previousElementSibling) {
        if (previous.matches?.(".thing.link.hidden")) hiddenPosts.push(previous);
        previous.querySelectorAll?.(".thing.link.hidden").forEach((thing) => hiddenPosts.push(thing));
      }
    }

    if (!hiddenPosts.length) return;
    window.setTimeout(() => {
      hiddenPosts.forEach((thing) => {
        thing.classList.remove("hidden");
        thing.style.removeProperty("display");
        scan(thing);
      });
    }, 350);
  }

  function start() {
    document.documentElement.classList.add(SCRIPT_CLASS);
    if (settings.wideMode) document.documentElement.classList.add("rwm-wide");

    setupSubredditAccent();
    addStyles();
    registerMenu();
    rewriteMailLabel();
    setupUserHeaderMenu();
    setupSubredditHeaderBar();
    setupSubredditDropdownSearch();
    setupSubredditPageTools();

    if (document.body) scan();
    else document.addEventListener("DOMContentLoaded", () => {
      rewriteMailLabel();
      setupUserHeaderMenu();
      setupSubredditHeaderBar();
      setupSubredditDropdownSearch();
      setupSubredditPageTools();
      scan();
    }, { once: true });

    const pendingScanRoots = new Set();
    let pendingActionRefresh = false;
    let pendingMailRefresh = false;
    let pendingSubredditHeaderRefresh = false;
    let pendingSubredditToolsRefresh = false;
    let mutationRefreshScheduled = false;

    const flushMutationRefresh = () => {
      mutationRefreshScheduled = false;

      const roots = Array.from(pendingScanRoots);
      pendingScanRoots.clear();
      for (const root of roots) {
        if (root.isConnected) scan(root);
      }

      if (pendingActionRefresh) refreshActionButtonStates();
      if (pendingMailRefresh) {
        rewriteMailLabel();
        setupUserHeaderMenu();
      }
      if (pendingSubredditHeaderRefresh) setupSubredditHeaderBar();
      if (pendingSubredditHeaderRefresh) setupSubredditDropdownSearch();
      if (pendingSubredditToolsRefresh) setupSubredditPageTools();

      pendingActionRefresh = false;
      pendingMailRefresh = false;
      pendingSubredditHeaderRefresh = false;
      pendingSubredditToolsRefresh = false;
    };

    const scheduleMutationRefresh = () => {
      if (mutationRefreshScheduled) return;
      mutationRefreshScheduled = true;
      const schedule = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 50));
      schedule(flushMutationRefresh);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target;
        const targetElement = target?.nodeType === Node.ELEMENT_NODE ? target : target?.parentElement;
        if (targetElement?.closest?.(".flat-list.buttons")) pendingActionRefresh = true;
        if (targetElement?.closest?.("#header-bottom-right")) pendingMailRefresh = true;
        if (targetElement?.closest?.("#sr-header-area")) pendingSubredditHeaderRefresh = true;
        if (targetElement?.closest?.(".drop-choices.srdrop")) pendingSubredditHeaderRefresh = true;
        if (targetElement?.closest?.(".content, .side")) pendingSubredditToolsRefresh = true;

        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          pendingScanRoots.add(node);
          if (node.matches?.("#header-bottom-right, #header-bottom-right *")) pendingMailRefresh = true;
          if (node.matches?.("#sr-header-area, #sr-header-area *")) pendingSubredditHeaderRefresh = true;
          if (node.matches?.(".drop-choices.srdrop, .drop-choices.srdrop *")) pendingSubredditHeaderRefresh = true;
          if (node.matches?.(".flat-list.buttons, .flat-list.buttons *")) pendingActionRefresh = true;
          if (node.matches?.(".content, .content *, .side, .side *")) pendingSubredditToolsRefresh = true;
        }
      }

      scheduleMutationRefresh();
    });

    const observeBody = () => {
      if (!document.body) return;
      observer.observe(document.body, { childList: true, characterData: true, subtree: true });
      rewriteMailLabel();
      setupUserHeaderMenu();
      setupSubredditHeaderBar();
      setupSubredditDropdownSearch();
      setupSubredditPageTools();
      scan();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", observeBody, { once: true });
    } else {
      observeBody();
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCommentsOverlay();
    });

    document.addEventListener("click", (event) => {
      const control = event.target?.closest?.("a, button");
      if (control) restoreHiddenPostFromUndo(control);
    }, true);
  }

  start();
})();
