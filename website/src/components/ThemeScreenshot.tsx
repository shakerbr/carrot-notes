"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

export default function ThemeScreenshot({
  lightSrc,
  darkSrc,
  alt,
  className = "",
}: {
  lightSrc: string;
  darkSrc: string;
  alt: string;
  className?: string;
}) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(readTheme());

    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <img
      src={theme === "dark" ? darkSrc : lightSrc}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
}
