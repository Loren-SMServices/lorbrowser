using System;
using System.Diagnostics;
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
        private string currentCustomUA = "Mozilla/5.0 (Linux; Android 14; Mobile; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36";

        public MainPage()
        {
            this.InitializeComponent();
            SetupMobileStatusBar();
            SetupHardwareBackButton();
        }

        private async void SetupMobileStatusBar()
        {
            // Windows 10 Mobile Status Bar integration
            if (ApiInformation.IsTypePresent("Windows.UI.ViewManagement.StatusBar"))
            {
                var statusBar = StatusBar.GetForCurrentView();
                if (statusBar != null)
                {
                    statusBar.BackgroundColor = Colors.Black;
                    statusBar.BackgroundOpacity = 1.0;
                    statusBar.ForegroundColor = Colors.White;
                    await statusBar.ShowAsync();
                }
            }
        }

        private void SetupHardwareBackButton()
        {
            // Register hardware Back button handler on Lumia / Windows 10 Mobile devices
            SystemNavigationManager.GetForCurrentView().BackRequested += OnHardwareBackRequested;
        }

        private async void OnHardwareBackRequested(object sender, BackRequestedEventArgs e)
        {
            e.Handled = true; // Mark handled so app doesn't exit immediately
            try
            {
                // Send notification to JS engine to handle navigation back inside active tab or speed dial
                string script = "if (window.UWPBridge) { window.UWPBridge.handleNativeMessage({ data: JSON.stringify({ action: 'hardwareBackPress' }) }); }";
                await MainWebView.InvokeScriptAsync("eval", new[] { script });
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[LorBrowser Native Back Error]: " + ex.Message);
            }
        }

        private async void MainWebView_ScriptNotify(object sender, NotifyEventArgs e)
        {
            try
            {
                string json = e.Value;
                Debug.WriteLine("[ScriptNotify]: " + json);

                if (json.Contains("SET_USER_AGENT"))
                {
                    // Parse UA payload or string
                    int uaIndex = json.IndexOf("\"userAgent\":\"");
                    if (uaIndex != -1)
                    {
                        int start = uaIndex + 13;
                        int end = json.IndexOf("\"", start);
                        if (end > start)
                        {
                            currentCustomUA = json.Substring(start, end - start);
                            Debug.WriteLine("[Native UA Set]: " + currentCustomUA);
                        }
                    }
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
