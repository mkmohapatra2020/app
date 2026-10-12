// Responsive WebP image from /images/<name>-{640,1280}.webp
export default function Img({ name, alt, className = '', sizes = '(max-width: 760px) 100vw, 50vw', eager = false, ...rest }) {
  return (
    <img
      className={className}
      src={`/images/${name}-1280.webp`}
      srcSet={`/images/${name}-640.webp 640w, /images/${name}-1280.webp 1280w`}
      sizes={sizes} alt={alt} width="1280" height="853"
      loading={eager ? 'eager' : 'lazy'} decoding="async" {...rest}
    />
  );
}
