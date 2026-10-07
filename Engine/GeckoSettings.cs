using System;
using Windows.Storage;

namespace LorBrowser.Engine
{
    public static class GeckoSettings
    {
        /// <summary>
        /// Obtiene el directorio de perfil local dentro de la sandbox UWP (LocalFolder).
        /// Esto garantiza que no se requiera la capacidad restringida broadFileSystemAccess.
        /// </summary>
        public static string ProfilePath => ApplicationData.Current.LocalFolder.Path;

        /// <summary>
        /// Flag para forzar el modo intérprete (No-JIT) y evitar requerir codeGeneration / Interop Unlock.
        /// </summary>
        public static bool ForceInterpreterMode { get; set; } = true;

        /// <summary>
        /// User-Agent por defecto para Gecko
        /// </summary>
        public static string DefaultUserAgent { get; set; } = "Mozilla/5.0 (Android 14; Mobile; rv:126.0) Gecko/126.0 Firefox/126.0";
    }
}
