import { useState, useEffect } from "react";
import { useGetSettings } from "@workspace/api-client-react";

const LOGO_SOURCES = [
  "/app-logo.png",
  "/app-icon.png",
  "/omnisystem-logo.png"
];

const ICON_SOURCES = [
  "/app-icon.png",
  "/app-logo.png",
  "/omnisystem-logo.png"
];

interface LogoProps {
  src?: string;
  className?: string;
  alt?: string;
  fallback?: React.ReactNode;
  style?: React.CSSProperties;
}

export function AppLogo({
  src,
  className = "w-full h-full object-contain",
  alt = "App Logo",
  fallback,
  style,
  ...props
}: LogoProps) {
  const { data: settings } = useGetSettings();
  const systemLogoUrl = settings?.systemLogoUrl;

  const [srcIndex, setSrcIndex] = useState(src ? -1 : 0);
  const [failedAll, setFailedAll] = useState(false);

  useEffect(() => {
    if (systemLogoUrl) {
      setSrcIndex(-2); // -2 represents the custom developer systemLogoUrl
    } else if (src) {
      setSrcIndex(-1);
    } else {
      setSrcIndex(0);
    }
  }, [src, systemLogoUrl]);

  const handleError = () => {
    if (srcIndex === -2) {
      // If developer systemLogoUrl failed, try custom src or LOGO_SOURCES
      if (src) {
        setSrcIndex(-1);
      } else {
        setSrcIndex(0);
      }
    } else if (srcIndex === -1) {
      setSrcIndex(0);
    } else if (srcIndex < LOGO_SOURCES.length - 1) {
      setSrcIndex(srcIndex + 1);
    } else {
      setFailedAll(true);
    }
  };

  if (failedAll) {
    if (fallback) return <>{fallback}</>;
    return (
      <div 
        className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black rounded-xl shadow-inner select-none"
        style={{ fontSize: "1.5rem", ...style }}
      >
        IS
      </div>
    );
  }

  const currentSrc = srcIndex === -2 ? systemLogoUrl : (srcIndex === -1 ? src : LOGO_SOURCES[srcIndex]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
      style={style}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
}

export function AppIcon({
  src,
  className = "w-full h-full object-contain",
  alt = "App Icon",
  fallback,
  style,
  ...props
}: LogoProps) {
  const { data: settings } = useGetSettings();
  const systemLogoUrl = settings?.systemLogoUrl;

  const [srcIndex, setSrcIndex] = useState(src ? -1 : 0);
  const [failedAll, setFailedAll] = useState(false);

  useEffect(() => {
    if (systemLogoUrl) {
      setSrcIndex(-2); // -2 represents the custom developer systemLogoUrl
    } else if (src) {
      setSrcIndex(-1);
    } else {
      setSrcIndex(0);
    }
  }, [src, systemLogoUrl]);

  const handleError = () => {
    if (srcIndex === -2) {
      if (src) {
        setSrcIndex(-1);
      } else {
        setSrcIndex(0);
      }
    } else if (srcIndex === -1) {
      setSrcIndex(0);
    } else if (srcIndex < ICON_SOURCES.length - 1) {
      setSrcIndex(srcIndex + 1);
    } else {
      setFailedAll(true);
    }
  };

  if (failedAll) {
    if (fallback) return <>{fallback}</>;
    return (
      <div 
        className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-bold rounded-full select-none"
        style={{ fontSize: "0.8rem", ...style }}
      >
        IS
      </div>
    );
  }

  const currentSrc = srcIndex === -2 ? systemLogoUrl : (srcIndex === -1 ? src : ICON_SOURCES[srcIndex]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
      style={style}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
}
