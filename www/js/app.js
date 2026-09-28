/* Main Application Controller for LorBrowser with Remote Logging (EdgeHTML W10M Compatible) */
function remoteLog(msg, level) {
    level = level || 'INFO';
    console.log('[RemoteLog ' + level + ']: ' + msg);
    try {
        var origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
        fetch(origin + '/log?msg=' + encodeURIComponent(msg) + '&level=' + encodeURIComponent(level))['catch'](function() {});
    } catch(e) {}
}
window.remoteLog = remoteLog;

// Global error logger for mobile client
window.addEventListener('error', function(e) {
    remoteLog('JS Error: ' + e.message + ' (' + e.filename + ':' + e.lineno + ')', 'ERROR');
});

function LorBrowserApp() {
    this.tabManager = new TabManager();
    this.barPosition = localStorage.getItem('lor_bar_pos') || 'bottom';
}

LorBrowserApp.prototype.init = function() {
    remoteLog('Inicializando LorBrowserApp en el dispositivo...');
    UAProfiles.init();
    UWPBridge.init();

    var viewport = document.getElementById('view-viewport');
    this.tabManager.init(viewport);

    this.applyBarPosition(this.barPosition);
    this.setupEventListeners();
    this.renderSpeedDial();
    this.renderUAOptions();
    this.updateUAIndicator();

    var self = this;
    this.tabManager.onTabChange(function(activeTab, allTabs) {
        self.updateOmnibox(activeTab);
        self.updateTabCountBadge(allTabs.length);
        self.renderTabsGrid(allTabs);
        if (activeTab.url && !activeTab.isSpeedDial) {
            BookmarkManager.addHistory(activeTab.title, activeTab.url);
        }
    });

    var currentUA = UAProfiles.getActive();
    UWPBridge.updateUserAgent(currentUA.ua);

    window.appInstance = this;
    remoteLog('LorBrowser Listo en ' + navigator.userAgent);
};

LorBrowserApp.prototype.setupEventListeners = function() {
    var self = this;
    var omniboxForm = document.getElementById('omnibox-form');
    var urlInput = document.getElementById('url-input');

    var triggerNavigation = function() {
        if (!urlInput) return;
        var query = urlInput.value.trim();
        remoteLog('Omnibox Triggered: "' + query + '"');
        if (query) {
            var activeTab = self.tabManager.getActiveTab();
            self.tabManager.navigateTab(activeTab.id, query);
            urlInput.blur();
        } else {
            remoteLog('Omnibox vacío, ignorado');
        }
    };

    if (omniboxForm) {
        omniboxForm.addEventListener('submit', function(e) {
            e.preventDefault();
            remoteLog('Evento submit recibido en omniboxForm');
            triggerNavigation();
        });
    }

    if (urlInput) {
        urlInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                remoteLog('Evento Keydown Enter (code: ' + e.keyCode + ') en urlInput');
                triggerNavigation();
            }
        });
    }

    var btnBack = document.getElementById('btn-back');
    if (btnBack) btnBack.addEventListener('click', function() {
        remoteLog('Botón Atrás presionado');
        self.handleBackPress();
    });

    var btnForward = document.getElementById('btn-forward');
    if (btnForward) btnForward.addEventListener('click', function() {
        remoteLog('Botón Adelante presionado');
        self.handleForwardPress();
    });

    var btnTabs = document.getElementById('btn-tabs');
    if (btnTabs) btnTabs.addEventListener('click', function() {
        remoteLog('Ver Pestañas presionado');
        self.toggleOverlay('tabs-overlay', true);
    });

    var btnMenu = document.getElementById('btn-menu');
    if (btnMenu) btnMenu.addEventListener('click', function() {
        remoteLog('Menú presionado');
        self.toggleOverlay('menu-overlay', true);
    });

    var btnNewTab = document.getElementById('btn-new-tab');
    if (btnNewTab) btnNewTab.addEventListener('click', function() {
        remoteLog('Nueva Pestaña presionado');
        self.tabManager.createNewTab('Nueva pestaña', 'about:speeddial');
        self.toggleOverlay('tabs-overlay', false);
    });

    var overlayCloseBtns = document.querySelectorAll('.btn-close-overlay');
    for (var i = 0; i < overlayCloseBtns.length; i++) {
        overlayCloseBtns[i].addEventListener('click', function(e) {
            var targetId = e.currentTarget.getAttribute('data-target');
            if (targetId) self.toggleOverlay(targetId, false);
        });
    }

    var uaPill = document.getElementById('ua-status-pill');
    if (uaPill) uaPill.addEventListener('click', function() {
        self.toggleOverlay('ua-overlay', true);
    });

    var btnOpenUA = document.getElementById('btn-open-ua');
    if (btnOpenUA) btnOpenUA.addEventListener('click', function() {
        self.toggleOverlay('menu-overlay', false);
        self.toggleOverlay('ua-overlay', true);
    });

    var toggleBar = document.getElementById('toggle-bar-pos');
    if (toggleBar) toggleBar.addEventListener('click', function() {
        self.barPosition = self.barPosition === 'bottom' ? 'top' : 'bottom';
        localStorage.setItem('lor_bar_pos', self.barPosition);
        self.applyBarPosition(self.barPosition);
        self.showToast('Barra de navegación colocada ' + (self.barPosition === 'bottom' ? 'abajo' : 'arriba'));
    });

    var btnOpenBookmarks = document.getElementById('btn-open-bookmarks');
    if (btnOpenBookmarks) btnOpenBookmarks.addEventListener('click', function() {
        self.toggleOverlay('menu-overlay', false);
        self.renderBookmarksList();
        self.toggleOverlay('bookmarks-overlay', true);
    });

    var btnAddBookmark = document.getElementById('btn-add-bookmark');
    if (btnAddBookmark) btnAddBookmark.addEventListener('click', function() {
        var active = self.tabManager.getActiveTab();
        if (active && !active.isSpeedDial) {
            var added = BookmarkManager.addBookmark(active.title, active.url);
            self.showToast(added ? 'Marcador guardado' : 'Ya está en marcadores');
        } else {
            self.showToast('Abre una página web para guardarla');
        }
    });
};

LorBrowserApp.prototype.updateOmnibox = function(activeTab) {
    var urlInput = document.getElementById('url-input');
    var lockIcon = document.getElementById('security-lock');
    
    if (!urlInput) return;

    if (activeTab.isSpeedDial) {
        urlInput.value = '';
        urlInput.placeholder = 'Buscar o ingresar dirección web...';
        if (lockIcon) lockIcon.className = 'security-indicator';
    } else {
        urlInput.value = activeTab.url;
        if (lockIcon) {
            var isSecure = activeTab.url.indexOf('https://') === 0;
            lockIcon.className = isSecure ? 'security-indicator secure' : 'security-indicator';
        }
    }
};

LorBrowserApp.prototype.updateTabCountBadge = function(count) {
    var badge = document.getElementById('tabs-badge');
    if (badge) badge.textContent = count;
};

LorBrowserApp.prototype.applyBarPosition = function(pos) {
    var app = document.getElementById('app-container');
    if (pos === 'bottom') {
        app.classList.add('bottom-nav-mode');
    } else {
        app.classList.remove('bottom-nav-mode');
    }
};

LorBrowserApp.prototype.toggleOverlay = function(overlayId, show) {
    var el = document.getElementById(overlayId);
    if (el) {
        if (show) el.classList.add('active');
        else el.classList.remove('active');
    }
};

LorBrowserApp.prototype.renderSpeedDial = function() {
    var grid = document.getElementById('speed-dial-grid');
    if (!grid) return;

    var items = BookmarkManager.getSpeedDial();
    var html = '';
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        html += '<div class="dial-tile" onclick="window.appInstance.onSpeedDialClick(\'' + item.url + '\')">' +
            '<div class="tile-icon" style="border-color: ' + item.color + '44; color: ' + item.color + '">' +
                item.icon +
            '</div>' +
            '<span class="tile-label">' + item.title + '</span>' +
        '</div>';
    }
    grid.innerHTML = html;
};

LorBrowserApp.prototype.onSpeedDialClick = function(url) {
    remoteLog('Speed Dial Clic: ' + url);
    var active = this.tabManager.getActiveTab();
    this.tabManager.navigateTab(active.id, url);
};

LorBrowserApp.prototype.renderUAOptions = function() {
    var container = document.getElementById('ua-options-list');
    if (!container) return;

    var active = UAProfiles.getActive();
    var keys = Object.keys(UAProfiles.profiles);
    var html = '';
    for (var i = 0; i < keys.length; i++) {
        var p = UAProfiles.profiles[keys[i]];
        var isSelected = (p.id === active.id) ? 'selected' : '';
        html += '<div class="ua-option-card ' + isSelected + '" onclick="window.appInstance.selectUA(\'' + p.id + '\')">' +
            '<div style="font-size: 24px;">' + p.icon + '</div>' +
            '<div class="ua-info" style="flex: 1;">' +
                '<h4>' + p.name + '</h4>' +
                '<p>' + p.description + '</p>' +
            '</div>' +
            '<span class="ua-badge" style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px; font-size: 11px;">' +
                p.badge +
            '</span>' +
        '</div>';
    }
    container.innerHTML = html;
};

LorBrowserApp.prototype.selectUA = function(key) {
    if (UAProfiles.setActive(key)) {
        var profile = UAProfiles.getActive();
        remoteLog('User-Agent Seleccionado: ' + profile.name);
        UWPBridge.updateUserAgent(profile.ua);
        this.updateUAIndicator();
        this.renderUAOptions();
        this.toggleOverlay('ua-overlay', false);
        this.showToast('User-Agent cambiado a ' + profile.name);

        var active = this.tabManager.getActiveTab();
        if (!active.isSpeedDial) {
            this.tabManager.navigateTab(active.id, active.url);
        }
    }
};

LorBrowserApp.prototype.updateUAIndicator = function() {
    var active = UAProfiles.getActive();
    var label = document.getElementById('ua-active-name');
    if (label) {
        label.textContent = active.icon + ' ' + active.name;
    }
};

LorBrowserApp.prototype.renderTabsGrid = function(allTabs) {
    var grid = document.getElementById('tabs-grid-container');
    if (!grid) return;

    var html = '';
    for (var i = 0; i < allTabs.length; i++) {
        var t = allTabs[i];
        var isActive = (t.id === this.tabManager.activeTabId) ? 'active-tab' : '';
        html += '<div class="tab-card ' + isActive + '">' +
            '<div class="tab-card-header">' +
                '<span class="tab-card-title">' + t.title + '</span>' +
                '<button class="tab-card-close" onclick="event.stopPropagation(); window.appInstance.tabManager.closeTab(\'' + t.id + '\')">✕</button>' +
            '</div>' +
            '<div class="tab-card-preview" onclick="window.appInstance.tabManager.switchToTab(\'' + t.id + '\'); window.appInstance.toggleOverlay(\'tabs-overlay\', false);">' +
                (t.isSpeedDial ? '🚀 Speed Dial' : '🌐 ' + t.title) +
            '</div>' +
        '</div>';
    }
    grid.innerHTML = html;
};

LorBrowserApp.prototype.renderBookmarksList = function() {
    var container = document.getElementById('bookmarks-list-container');
    if (!container) return;

    var list = BookmarkManager.getBookmarks();
    if (list.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 40px;">No tienes marcadores guardados aún.</p>';
        return;
    }

    var html = '';
    for (var i = 0; i < list.length; i++) {
        var b = list[i];
        html += '<div class="ua-option-card" onclick="window.appInstance.onSpeedDialClick(\'' + b.url + '\'); window.appInstance.toggleOverlay(\'bookmarks-overlay\', false);">' +
            '<div style="font-size: 20px;">🔖</div>' +
            '<div class="ua-info" style="flex: 1;">' +
                '<h4>' + b.title + '</h4>' +
                '<p>' + b.url + '</p>' +
            '</div>' +
            '<button class="btn-icon" onclick="event.stopPropagation(); BookmarkManager.removeBookmark(\'' + b.url + '\'); window.appInstance.renderBookmarksList();">🗑️</button>' +
        '</div>';
    }
    container.innerHTML = html;
};

LorBrowserApp.prototype.handleBackPress = function() {
    var active = this.tabManager.getActiveTab();
    if (active.iframeEl && active.iframeEl.contentWindow) {
        try {
            active.iframeEl.contentWindow.history.back();
            return;
        } catch(e) {}
    }
    if (!active.isSpeedDial) {
        this.tabManager.navigateTab(active.id, 'about:speeddial');
    }
};

LorBrowserApp.prototype.handleForwardPress = function() {
    var active = this.tabManager.getActiveTab();
    if (active.iframeEl && active.iframeEl.contentWindow) {
        try {
            active.iframeEl.contentWindow.history.forward();
        } catch(e) {}
    }
};

LorBrowserApp.prototype.showToast = function(message) {
    var toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2500);
};

document.addEventListener('DOMContentLoaded', function() {
    var app = new LorBrowserApp();
    app.init();
});
