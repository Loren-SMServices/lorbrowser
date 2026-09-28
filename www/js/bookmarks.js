/* Bookmarks, SpeedDial, and Search Engine Manager (EdgeHTML Compatible) */
var BookmarkManager = {
    defaultSpeedDial: [
        { title: 'Google', url: 'https://www.google.com', icon: '🔍', color: '#4285F4' },
        { title: 'YouTube', url: 'https://m.youtube.com', icon: '▶️', color: '#FF0000' },
        { title: 'Wikipedia', url: 'https://es.m.wikipedia.org', icon: '🌐', color: '#636466' },
        { title: 'Reddit', url: 'https://m.reddit.com', icon: '🤖', color: '#FF4500' },
        { title: 'Bing', url: 'https://www.bing.com', icon: '🔎', color: '#00838F' },
        { title: 'GitHub', url: 'https://github.com', icon: '🐙', color: '#24292e' },
        { title: 'X / Twitter', url: 'https://mobile.x.com', icon: '🐦', color: '#1DA1F2' },
        { title: 'Noticias', url: 'https://news.google.com', icon: '📰', color: '#1A73E8' }
    ],

    searchEngines: [
        { id: 'google', name: 'Google', queryUrl: 'https://www.google.com/search?q=' },
        { id: 'bing', name: 'Bing', queryUrl: 'https://www.bing.com/search?q=' },
        { id: 'duckduckgo', name: 'DuckDuckGo', queryUrl: 'https://html.duckduckgo.com/html/?q=' },
        { id: 'brave', name: 'Brave Search', queryUrl: 'https://search.brave.com/search?q=' },
        { id: 'ecosia', name: 'Ecosia', queryUrl: 'https://www.ecosia.org/search?q=' }
    ],

    getSpeedDial: function() {
        var saved = localStorage.getItem('lor_speed_dial');
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        return this.defaultSpeedDial;
    },

    saveSpeedDial: function(list) {
        localStorage.setItem('lor_speed_dial', JSON.stringify(list));
    },

    addSpeedDialItem: function(title, url, icon) {
        icon = icon || '🔗';
        var list = this.getSpeedDial();
        list.push({ title: title, url: url, icon: icon, color: '#0078d4' });
        this.saveSpeedDial(list);
    },

    getHistory: function() {
        var saved = localStorage.getItem('lor_history');
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        return [];
    },

    addHistory: function(title, url) {
        if (!url || url.indexOf('about:') === 0) return;
        var list = this.getHistory();
        var newList = [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].url !== url) newList.push(list[i]);
        }
        newList.unshift({
            title: title || url,
            url: url,
            timestamp: new Date().toISOString()
        });
        if (newList.length > 100) newList = newList.slice(0, 100);
        localStorage.setItem('lor_history', JSON.stringify(newList));
    },

    clearHistory: function() {
        localStorage.removeItem('lor_history');
    },

    getBookmarks: function() {
        var saved = localStorage.getItem('lor_bookmarks');
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        return [];
    },

    addBookmark: function(title, url) {
        var list = this.getBookmarks();
        for (var i = 0; i < list.length; i++) {
            if (list[i].url === url) return false;
        }
        list.push({ title: title || url, url: url, addedAt: new Date().toISOString() });
        localStorage.setItem('lor_bookmarks', JSON.stringify(list));
        return true;
    },

    removeBookmark: function(url) {
        var list = this.getBookmarks();
        var newList = [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].url !== url) newList.push(list[i]);
        }
        localStorage.setItem('lor_bookmarks', JSON.stringify(newList));
    }
};

window.BookmarkManager = BookmarkManager;
