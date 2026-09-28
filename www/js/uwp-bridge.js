/* LorBrowser - Bi-directional UWP <-> JS Native Bridge (EdgeHTML Compatible) */
var UWPBridge = {
    isUWP: false,

    init: function() {
        if (window.external && typeof window.external.notify === 'function') {
            this.isUWP = true;
            console.log('[UWPBridge] Native UWP ScriptNotify detected');
        } else if (window.chrome && window.chrome.webview) {
            this.isUWP = true;
            console.log('[UWPBridge] WebView2 container detected');
        } else {
            console.log('[UWPBridge] Running in standalone web mode');
        }

        window.addEventListener('message', this.handleNativeMessage.bind(this));
    },

    sendToNative: function(action, payload) {
        payload = payload || {};
        var message = JSON.stringify({ action: action, data: payload });
        if (window.external && typeof window.external.notify === 'function') {
            window.external.notify(message);
        } else if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage(message);
        } else {
            console.log('[UWPBridge Simulated Send]:', action, payload);
        }
    },

    handleNativeMessage: function(event) {
        try {
            var msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (!msg || !msg.action) return;

            switch (msg.action) {
                case 'hardwareBackPress':
                    if (window.appInstance) {
                        window.appInstance.handleBackPress();
                    }
                    break;
                case 'nativeUAUpdated':
                    console.log('[UWPBridge] Native User-Agent set to:', msg.data.ua);
                    break;
                default:
                    console.log('[UWPBridge] Unhandled native action:', msg.action);
            }
        } catch(e) {
            console.error('[UWPBridge] Message parse error:', e);
        }
    },

    updateUserAgent: function(uaString) {
        this.sendToNative('SET_USER_AGENT', { userAgent: uaString });
    },

    setStatusBarColor: function(hexColor) {
        this.sendToNative('SET_STATUS_BAR', { color: hexColor });
    },

    triggerDownload: function(url, filename) {
        this.sendToNative('DOWNLOAD_FILE', { url: url, filename: filename });
    }
};

window.UWPBridge = UWPBridge;
