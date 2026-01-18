import React, { useState, useEffect } from 'react';
import { imageService } from '../services/imageService';
import { ImagePreviewModal } from './ImagePreviewModal';

interface TimelineImageProps {
    filename: string;
    className?: string;
    useThumbnail?: boolean;
    onClick?: () => void;
}

export const TimelineImage: React.FC<TimelineImageProps> = ({
    filename,
    className = "w-16 h-16",
    useThumbnail = false,
    onClick
}) => {
    const [src, setSrc] = useState<string>('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        imageService.getImageUrl(filename, useThumbnail ? 'thumbnail' : 'original').then(url => {
            if (isMounted) setSrc(url);
        });
        return () => { isMounted = false; };
    }, [filename, useThumbnail]);

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClick) {
            onClick();
        } else {
            // Open Preview
            // If we only have thumbnail, fetch original for preview
            if (useThumbnail) {
                const fullUrl = await imageService.getImageUrl(filename, 'original');
                setPreviewUrl(fullUrl);
            } else {
                setPreviewUrl(src);
            }
        }
    };

    if (!src) return null;

    return (
        <>
            <div
                className={`${className} rounded-lg overflow-hidden border border-stone-200 shrink-0 cursor-pointer`}
                onClick={handleClick}
            >
                <img src={src} alt="img" className="w-full h-full object-cover transition-transform hover:scale-105 duration-500" />
            </div>

            <ImagePreviewModal
                imageUrl={previewUrl}
                onClose={() => setPreviewUrl(null)}
            />
        </>
    );
};
