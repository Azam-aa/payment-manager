import React, { useState, useEffect } from 'react';
import { photoService } from '../services/photoService';

interface ProfilePhotoProps {
  photoPath: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#14b8a6', // teal
];

function getDeterministicBg(name: string): string {
  if (!name) return '#64748b';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

export const ProfilePhoto: React.FC<ProfilePhotoProps> = ({
  photoPath,
  name,
  size = 'md',
  className = '',
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setHasError(false);

    if (photoPath) {
      photoService
        .getDisplayUri(photoPath)
        .then((uri) => {
          if (isMounted) {
            if (uri) {
              setImageUri(uri);
            } else {
              setHasError(true);
            }
          }
        })
        .catch(() => {
          if (isMounted) setHasError(true);
        });
    } else {
      setImageUri(null);
    }

    return () => {
      isMounted = false;
    };
  }, [photoPath]);

  // Size dimensions
  const sizeClasses = {
    sm: 'w-10 h-10 text-base',
    md: 'w-16 h-16 text-2xl', // 64px
    lg: 'w-24 h-24 text-4xl',
    xl: 'w-32 h-32 text-5xl',
  }[size];

  const firstLetter = (name.trim()[0] || '?').toUpperCase();
  const bg = getDeterministicBg(name);

  if (imageUri && !hasError) {
    return (
      <div
        className={`relative rounded-full overflow-hidden shrink-0 shadow-md border-2 border-white/80 bg-slate-200 ${sizeClasses} ${className}`}
      >
        <img
          src={imageUri}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  return (
    <div
      style={{ backgroundColor: bg }}
      className={`rounded-full shrink-0 flex items-center justify-center font-bold text-white shadow-md border-2 border-white/80 uppercase ${sizeClasses} ${className}`}
    >
      <span>{firstLetter}</span>
    </div>
  );
};
