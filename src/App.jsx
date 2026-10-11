import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Intro from './components/Intro.jsx';
import Products from './components/Products.jsx';
import Blueprint from './components/Blueprint.jsx';
import Services from './components/Services.jsx';
import Assurances from './components/Assurances.jsx';
import Crew from './components/Crew.jsx';
import Feedback from './components/Feedback.jsx';
import Footer from './components/Footer.jsx';
import useReveal from './hooks/useReveal.js';

export default function App() {
  useReveal();
  return (
    <>
      <Nav />
      <Hero />
      <Intro />
      <Products />
      <Blueprint />
      <Services />
      <Assurances />
      <Crew />
      <Feedback />
      <Footer />
    </>
  );
}
