import AboutSection from '../components/home/AboutSection'
import ComplexStats from '../components/home/ComplexStats'
import ExternalLinksSection from '../components/home/ExternalLinksSection'
import HeroSection from '../components/home/HeroSection'
import HomeFooter from '../components/home/HomeFooter'
import HomeHeader from '../components/home/HomeHeader'
import LivingSection from '../components/home/LivingSection'
import LocationSection from '../components/home/LocationSection'
import NewsSection from '../components/home/NewsSection'
import ResidentServiceSection from '../components/home/ResidentServiceSection'
import useHomeScrollReveal from '../components/home/useHomeScrollReveal'
import './HomePage.css'

export default function HomePage() {
  useHomeScrollReveal()

  return (
    <div className="public-home">
      <a className="home-skip-link" href="#home-main">본문으로 바로가기</a>
      <HomeHeader />
      <main id="home-main">
        <HeroSection />
        <ComplexStats />
        <AboutSection />
        <LivingSection />
        <LocationSection />
        <NewsSection />
        <ResidentServiceSection />
        <ExternalLinksSection />
      </main>
      <HomeFooter />
    </div>
  )
}
