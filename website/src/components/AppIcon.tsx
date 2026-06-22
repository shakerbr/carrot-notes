export default function AppIcon({
  className = "",
  width = 200,
  height = 200,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  return (
    <>
      <img
        src="/assets/svg/carrot-app-icon/carrot-app-icon-light.svg"
        alt="Carrot Notes"
        className={`app-icon app-icon-light ${className}`.trim()}
        width={width}
        height={height}
      />
      <img
        src="/assets/svg/carrot-app-icon/carrot-app-icon-dark.svg"
        alt="Carrot Notes"
        className={`app-icon app-icon-dark ${className}`.trim()}
        width={width}
        height={height}
      />
    </>
  );
}
