import Navbar from "../components/Hero/Navbar";
import Hero from "../components/Hero/Hero";
import Communities from "../components/Hero/Communities";
import HowItWorks from "../components/Hero/HowItWorks";
import CTA from "../components/Hero/CTA";
import Footer from "../components/Footer/Footer";

export default function Home() {
  return (
    <>
      <Navbar />

      <Hero />

      <Communities />

      <HowItWorks />

      <CTA />

      <Footer />
    </>
  );
}