interface UploadPlaceholderCardProps {
  onClick: () => void;
}

export function UploadPlaceholderCard({ onClick }: UploadPlaceholderCardProps) {
  return (
    <div className="upload-placeholder-card" onClick={onClick}>
      <div className="placeholder-content">
        <div className="placeholder-icon">+</div>
        <div className="placeholder-text">Add Sound</div>
      </div>
    </div>
  );
}
