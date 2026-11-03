import Image from "next/image";

type RemoteImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
};

export function RemoteImage({ src, alt, className, sizes }: RemoteImageProps) {
  if (!src.trim()) return null;
  if (!/^https?:\/\//i.test(src)) {
    // Local previews use blob URLs, which the image optimizer cannot fetch.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />;
  }

  return <Image src={src} alt={alt} fill sizes={sizes} className={className} />;
}
