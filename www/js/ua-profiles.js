/* User-Agent Switcher & Profile Manager for LorBrowser */
var UAProfiles = {
    activeKey: 'chrome_mobile',

    profiles: {
        chrome_mobile: {
            id: 'chrome_mobile',
            name: 'Chrome Mobile (Android 14)',
            badge: 'Android',
            icon: '📱',
            ua: 'Mozilla/5.0 (Linux; Android 14; Mobile; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36',
            description: 'Recommended for modern web apps & video streaming'
        },
        safari_ios: {
            id: 'safari_ios',
            name: 'Safari Mobile (iOS 17.5)',
            badge: 'iPhone',
            icon: '🍎',
            ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/605.1.15',
            description: 'Best compatibility for mobile web layouts'
        },
        chrome_desktop: {
            id: 'chrome_desktop',
            name: 'Chrome Desktop (Windows 11)',
            badge: 'PC / Desktop',
            icon: '💻',
            ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            description: 'Forces full desktop versions of websites'
        },
        firefox_mobile: {
            id: 'firefox_mobile',
            name: 'Firefox Mobile',
            badge: 'Firefox',
            icon: '🦊',
            ua: 'Mozilla/5.0 (Android 14; Mobile; rv:126.0) Gecko/126.0 Firefox/126.0',
            description: 'Alternative mobile engine spoofing'
        },
        w10m_edge: {
            id: 'w10m_edge',
            name: 'Edge Mobile (Windows 10 Mobile Native)',
            badge: 'W10M Native',
            icon: '🟦',
            ua: 'Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; Lumia 950 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Mobile Safari/537.36 Edge/15.15254',
            description: 'Legacy native user-agent'
        }
    },

    init: function() {
        var saved = localStorage.getItem('lor_active_ua');
        if (saved && this.profiles[saved]) {
            this.activeKey = saved;
        }
    },

    getActive: function() {
        return this.profiles[this.activeKey] || this.profiles.chrome_mobile;
    },

    setActive: function(key) {
        if (this.profiles[key]) {
            this.activeKey = key;
            localStorage.setItem('lor_active_ua', key);
            return true;
        }
        return false;
    }
};

window.UAProfiles = UAProfiles;
