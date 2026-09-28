/* Multi-Tab Engine for LorBrowser (EdgeHTML W10M Compatible) */
function TabManager() {
    this.tabs = [];
    this.activeTabId = null;
    this.containerEl = null;
    this.onTabChangeCallbacks = [];
}

TabManager.prototype.init = function(containerEl) {
    this.containerEl = containerEl;
    this.createNewTab('Nueva pestaña', 'about:speeddial');
};

TabManager.prototype.createNewTab = function(title, url) {
    title = title || 'Nueva pestaña';
    url = url || 'about:speeddial';

    var id = 'tab_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    var iframeEl = null;
    if (url !== 'about:speeddial') {
        iframeEl = document.createElement('iframe');
        iframeEl.className = 'tab-frame';
        iframeEl.id = id;
        iframeEl.setAttribute('allow', 'fullscreen; autoplay; camera; microphone');
        var navUrl = this.buildNavigationUrl(url);
        if (window.remoteLog) window.remoteLog('Creando iframe [' + id + '] -> ' + navUrl);
        iframeEl.src = navUrl;
        this.containerEl.appendChild(iframeEl);
    }

    var tab = {
        id: id,
        title: title,
        url: url,
        isSpeedDial: url === 'about:speeddial',
        iframeEl: iframeEl,
        favicon: '🌐',
        history: [url],
        historyIndex: 0,
        isLoading: false
    };

    this.tabs.push(tab);
    this.switchToTab(id);
    return tab;
};

TabManager.prototype.buildNavigationUrl = function(targetUrl) {
    if (targetUrl.indexOf('about:') === 0 || targetUrl.indexOf('data:') === 0) return targetUrl;
    
    if (window.UWPBridge && window.UWPBridge.isUWP) {
        return targetUrl;
    }

    var activeUA = (window.UAProfiles && window.UAProfiles.getActive()) ? window.UAProfiles.getActive().ua : '';
    var origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
    var proxyUrl = origin + '/proxy?url=' + encodeURIComponent(targetUrl) + '&ua=' + encodeURIComponent(activeUA);
    if (window.remoteLog) window.remoteLog('Ruta Proxy Generada: ' + proxyUrl);
    return proxyUrl;
};

TabManager.prototype.switchToTab = function(tabId) {
    var tab = null;
    for (var i = 0; i < this.tabs.length; i++) {
        if (this.tabs[i].id === tabId) {
            tab = this.tabs[i];
            break;
        }
    }
    if (!tab) return;

    this.activeTabId = tabId;

    var frames = this.containerEl.querySelectorAll('.tab-frame');
    for (var j = 0; j < frames.length; j++) {
        frames[j].classList.remove('active');
    }

    var speedDial = document.getElementById('speed-dial-view');
    if (tab.isSpeedDial) {
        if (speedDial) speedDial.style.display = 'flex';
    } else {
        if (speedDial) speedDial.style.display = 'none';
        if (tab.iframeEl) {
            tab.iframeEl.classList.add('active');
        }
    }

    this.notifyChange(tab);
};

TabManager.prototype.closeTab = function(tabId) {
    if (this.tabs.length <= 1) {
        var tab = this.tabs[0];
        this.navigateTab(tab.id, 'about:speeddial');
        return;
    }

    var index = -1;
    for (var i = 0; i < this.tabs.length; i++) {
        if (this.tabs[i].id === tabId) {
            index = i;
            break;
        }
    }
    if (index === -1) return;

    var tabToClose = this.tabs[index];
    if (tabToClose.iframeEl) {
        tabToClose.iframeEl.remove();
    }

    this.tabs.splice(index, 1);

    if (this.activeTabId === tabId) {
        var nextTab = this.tabs[Math.max(0, index - 1)];
        this.switchToTab(nextTab.id);
    } else {
        this.notifyChange(this.getActiveTab());
    }
};

TabManager.prototype.navigateTab = function(tabId, url) {
    var tab = null;
    for (var i = 0; i < this.tabs.length; i++) {
        if (this.tabs[i].id === tabId) {
            tab = this.tabs[i];
            break;
        }
    }
    if (!tab) return;

    var targetUrl = url.trim();
    if (window.remoteLog) window.remoteLog('Navegando Pestaña [' + tabId + '] a "' + targetUrl + '"');

    if (targetUrl !== 'about:speeddial') {
        if (!/^https?:\/\//i.test(targetUrl) && targetUrl.indexOf('about:') !== 0) {
            if (targetUrl.indexOf('.') !== -1 && targetUrl.indexOf(' ') === -1) {
                targetUrl = 'https://' + targetUrl;
            } else {
                var engine = localStorage.getItem('lor_search_engine') || 'https://www.google.com/search?q=';
                targetUrl = engine + encodeURIComponent(targetUrl);
            }
        }
    }

    tab.url = targetUrl;
    tab.isSpeedDial = targetUrl === 'about:speeddial';

    if (tab.isSpeedDial) {
        if (tab.iframeEl) {
            tab.iframeEl.remove();
            tab.iframeEl = null;
        }
        tab.title = 'Nueva pestaña';
    } else {
        if (!tab.iframeEl) {
            var iframeEl = document.createElement('iframe');
            iframeEl.className = 'tab-frame';
            iframeEl.id = tab.id;
            iframeEl.setAttribute('allow', 'fullscreen; autoplay; camera; microphone');
            this.containerEl.appendChild(iframeEl);
            tab.iframeEl = iframeEl;
        }
        
        try {
            var parsed = new URL(targetUrl);
            tab.title = parsed.hostname.replace('www.', '');
        } catch(e) {
            tab.title = targetUrl;
        }

        var navUrl = this.buildNavigationUrl(targetUrl);
        tab.iframeEl.src = navUrl;
        if (window.remoteLog) window.remoteLog('Cargando iframe.src = ' + navUrl);
    }

    if (this.activeTabId === tabId) {
        this.switchToTab(tabId);
    }
};

TabManager.prototype.getActiveTab = function() {
    for (var i = 0; i < this.tabs.length; i++) {
        if (this.tabs[i].id === this.activeTabId) return this.tabs[i];
    }
    return this.tabs[0];
};

TabManager.prototype.onTabChange = function(cb) {
    this.onTabChangeCallbacks.push(cb);
};

TabManager.prototype.notifyChange = function(activeTab) {
    for (var i = 0; i < this.onTabChangeCallbacks.length; i++) {
        this.onTabChangeCallbacks[i](activeTab, this.tabs);
    }
};

window.TabManager = TabManager;
