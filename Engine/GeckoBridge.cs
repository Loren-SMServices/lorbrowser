using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using Windows.Storage;

namespace LorBrowser.Engine
{
    public static class GeckoBridge
    {
        private const string GECKO_DLL = "gecko_capi.dll";

        private static bool isInitialized = false;

        #region Native C ABI Imports (from gecko-w10m gecko_capi)

        [DllImport(GECKO_DLL, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern int gecko_init(string profilePath, string appPath);

        [DllImport(GECKO_DLL, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern void gecko_set_pref_bool(string prefName, bool value);

        [DllImport(GECKO_DLL, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern void gecko_set_pref_string(string prefName, string value);

        [DllImport(GECKO_DLL, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern void gecko_navigate(IntPtr handle, string url);

        [DllImport(GECKO_DLL, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern void gecko_shutdown();

        #endregion

        /// <summary>
        /// Inicializa el motor Gecko en modo seguro (Opción B: No-JIT, sandbox UWP).
        /// </summary>
        public static bool InitializeEngine()
        {
            if (isInitialized) return true;

            try
            {
                string profilePath = GeckoSettings.ProfilePath;
                string appPath = Windows.ApplicationModel.Package.Current.InstalledLocation.Path;

                Debug.WriteLine($"[GeckoBridge] Inicializando motor Gecko en: {profilePath}");

                // Si se fuerza el modo Intérprete (No JIT), desactivamos SpiderMonkey JIT
                if (GeckoSettings.ForceInterpreterMode)
                {
                    Debug.WriteLine("[GeckoBridge] Modo Intérprete activado (Sin JIT / No requiere Interop Unlock)");
                    gecko_set_pref_bool("javascript.options.jit.chrome", false);
                    gecko_set_pref_bool("javascript.options.jit.content", false);
                    gecko_set_pref_bool("javascript.options.baselinejit", false);
                    gecko_set_pref_bool("javascript.options.ion", false);
                    gecko_set_pref_bool("javascript.options.native_regexp", false);
                }

                // Configurar User-Agent por defecto
                gecko_set_pref_string("general.useragent.override", GeckoSettings.DefaultUserAgent);

                int hr = gecko_init(profilePath, appPath);
                isInitialized = (hr == 0);

                Debug.WriteLine($"[GeckoBridge] Resultado inicialización Gecko hr={hr}, isInitialized={isInitialized}");
                return isInitialized;
            }
            catch (DllNotFoundException ex)
            {
                Debug.WriteLine($"[GeckoBridge Error]: gecko_capi.dll no encontrada. Se usará el WebView de respaldo. {ex.Message}");
                return false;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[GeckoBridge Exception]: {ex.Message}");
                return false;
            }
        }

        public static void SetUserAgent(string userAgent)
        {
            if (!isInitialized) return;
            try
            {
                gecko_set_pref_string("general.useragent.override", userAgent);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[GeckoBridge SetUA Error]: {ex.Message}");
            }
        }

        public static void Shutdown()
        {
            if (!isInitialized) return;
            try
            {
                gecko_shutdown();
                isInitialized = false;
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[GeckoBridge Shutdown Error]: {ex.Message}");
            }
        }
    }
}
