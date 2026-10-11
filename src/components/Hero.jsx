import Carousel from './Carousel.jsx';

export default function Hero() {
  return (
    <header className="hero">
      <div className="hero-sun-glow"></div>
      <div className="wrap hero-inner">
        <div>
          <span className="eyebrow hero-eyebrow">Crafted for Odisha's climate</span>
          <h1>Live your weekend, <em>every day.</em></h1>
          <p className="lede">Decks, pergolas, gazebos and farmhouse fittings — engineered for Odisha's sun, salt air and monsoon, and built by a crew who actually show up.</p>
          <div className="hero-ctas">
            <a className="btn btn-primary" href="tel:+918917250407">Call 89172 50407</a>
            <a className="btn btn-ghost" href="https://www.weekend-live.com" target="_blank" rel="noopener">Visit weekend-live.com</a>
          </div>
        </div>
        <div className="hero-sign reveal">
          <img src="/signboard.jpg" alt="Weekend-Live wooden signboard, crafted for Odisha's climate" />
        </div>
        <div className="hero-carousel">
          <Carousel />
        </div>
      </div>
    </header>
  );
}
