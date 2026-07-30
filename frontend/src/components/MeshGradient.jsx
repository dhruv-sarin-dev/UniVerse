/* Pure CSS Mesh Gradient — no JS animation overhead */
export default function MeshGradient() {
  return (
    <div className="mesh-gradient-container" aria-hidden="true">
      <div className="mesh-blob mesh-blob-1" />
      <div className="mesh-blob mesh-blob-2" />
      <div className="mesh-blob mesh-blob-3" />
    </div>
  );
}
