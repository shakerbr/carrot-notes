export default function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('carrot-notes-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
