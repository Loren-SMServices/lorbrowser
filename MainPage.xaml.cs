using System;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using Windows.Data.Json;
using Windows.Foundation;
using Windows.Foundation.Metadata;
using Windows.UI;
using Windows.UI.Core;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Navigation;
using Windows.UI.ViewManagement;

namespace LorBrowser
{
    public sealed partial class MainPage : Page
    {
        // Cambia el User-Agent de las peticiones HTTP del WebView (y sus iframes) para todo el proceso
        [DllImport("urlmon.dll", CharSet = CharSet.Ansi)]
        private static extern int UrlMkSetSessionOption(int dwOption, string pBuffer, int dwBufferLength, int dwReserved);
        private const int URLMON_OPTION_USERAGENT = 0x10000001;

        private string currentCustomUA = "Mozilla/5.0 (Linux; Android 14; Mobile; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36";

        // Lo actualiza el JS (NAV_STATE). Si es false, el botón Atrás físico cierra/suspende la app
        private bool webCanGoBack = false;

        public MainPage()
        {
            this.InitializeComponent();
            ApplyUserAgent(currentCustomUA);
            SetupMobileStatusBar();
            SetupHardwareBackButton();
            InitializeGeckoEngine();
        }

        private void InitializeGeckoEngine()
        {
            try
            {
                bool initialized = Engine.GeckoBridge.InitializeEngine();
                Debug.WriteLine("[MainPage] Gecko Engine Status: " + (initialized ? "Active" : "Fallback to WebView"));
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[MainPage] Gecko Init Exception: " + ex.Message);
            }
        }

        private void ApplyUserAgent(string ua)
        {
            try
            {
                int hr = UrlMkSetSessionOption(URLMON_OPTION_USERAGENT, ua, ua.Length, 0);
                Engine.GeckoBridge.SetUserAgent(ua);
                Debug.WriteLine("[Native UA Set] hr=" + hr + " ua=" + ua);
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[UA Error]: " + ex.Message);
            }
        }

        private async void SetupMobileStatusBar()
        {
            try
            {
                if (!ApiInformation.IsTypePresent("Windows.UI.ViewManagement.StatusBar")) return;

                Type statusBarType = Type.GetType("Windows.UI.ViewManagement.StatusBar, Windows, ContentType=WindowsRuntime");
                if (statusBarType == null) return;

                TypeInfo ti = statusBarType.GetTypeInfo();
                MethodInfo getForCurrentView = ti.GetDeclaredMethod("GetForCurrentView");
                if (getForCurrentView == null) return;

                object statusBar = getForCurrentView.Invoke(null, null);
                if (statusBar == null) return;

                PropertyInfo bg = ti.GetDeclaredProperty("BackgroundColor");
                PropertyInfo bgOpacity = ti.GetDeclaredProperty("BackgroundOpacity");
                PropertyInfo fg = ti.GetDeclaredProperty("ForegroundColor");
                if (bg != null) bg.SetValue(statusBar, (Color?)Colors.Black);
                if (bgOpacity != null) bgOpacity.SetValue(statusBar, 1.0);
                if (fg != null) fg.SetValue(statusBar, (Color?)Colors.White);

                MethodInfo showAsync = ti.GetDeclaredMethod("ShowAsync");
                IAsyncAction op = showAsync != null ? showAsync.Invoke(statusBar, null) as IAsyncAction : null;
                if (op != null) await op;
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[StatusBar Error]: " + ex.Message);
            }
        }

        private void SetupHardwareBackButton()
        {
            SystemNavigationManager.GetForCurrentView().BackRequested += OnHardwareBackRequested;
        }

        private async void OnHardwareBackRequested(object sender, BackRequestedEventArgs e)
        {
            // En la Speed Dial con una sola pestaña no se marca Handled: el sistema cierra la app
            if (!webCanGoBack) return;

            e.Handled = true;
            try
            {
                string script = "if (window.UWPBridge && window.UWPBridge.handleNativeMessage) { window.UWPBridge.handleNativeMessage({ data: JSON.stringify({ action: 'hardwareBackPress' }) }); }";
                await MainWebView.InvokeScriptAsync("eval", new[] { script });
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[LorBrowser Native Back Error]: " + ex.Message);
            }
        }

        private void MainWebView_ScriptNotify(object sender, NotifyEventArgs e)
        {
            try
            {
                Debug.WriteLine("[ScriptNotify]: " + e.Value);

                JsonObject msg;
                if (!JsonObject.TryParse(e.Value, out msg)) return;

                string action = msg.GetNamedString("action", "");
                JsonObject data = msg.GetNamedObject("data", new JsonObject());

                switch (action)
                {
                    case "SET_USER_AGENT":
                        string ua = data.GetNamedString("userAgent", "");
                        if (!string.IsNullOrEmpty(ua))
                        {
                            currentCustomUA = ua;
                            ApplyUserAgent(ua);
                        }
                        break;

                    case "NAV_STATE":
                        webCanGoBack = data.GetNamedBoolean("canGoBack", false);
                        break;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[ScriptNotify Error]: " + ex.Message);
            }
        }

        private void MainWebView_NavigationCompleted(WebView sender, WebViewNavigationCompletedEventArgs args)
        {
            Debug.WriteLine("[LorBrowser Navigation Complete]: " + args.Uri);
        }
    }
}
