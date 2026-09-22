import React, { useState, useEffect } from 'react';

export const DEFAULT_STORE_LOGO = '/icon.svg';

interface BrandLogoProps {
  src?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';
  rounded?: string;
  grayscale?: boolean;
  border?: boolean;
}

const SIZE_MAP: Record<string, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-20 h-20',
  custom: '',
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  src,
  alt = 'Warung Bang Kobra',
  className = '',
  imgClassName = '',
  size = 'md',
  rounded = 'rounded-2xl',
  grayscale = false,
  border = true,
}) => {
  const effectiveSrc = src && src.trim() !== '' ? src : DEFAULT_STORE_LOGO;
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const finalSrc = imgError ? DEFAULT_STORE_LOGO : effectiveSrc;
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      className={`relative shrink-0 overflow-hidden flex items-center justify-center bg-stone-900 ${
        border ? 'border border-stone-800' : ''
      } ${sizeClass} ${rounded} ${className}`}
    >
      <img
        src={finalSrc}
        alt={alt}
        className={`w-full h-full object-contain p-0.5 select-none transition-transform duration-200 ${
          grayscale ? 'filter grayscale contrast-125' : ''
        } ${imgClassName}`}
        onError={() => {
          if (!imgError && effectiveSrc !== DEFAULT_STORE_LOGO) {
            setImgError(true);
          }
        }}
        loading="eager"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
