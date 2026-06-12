import HeroSection from '@/components/home/HeroSection'
import WhySection from '@/components/home/WhySection'
import HowItWorksSection from '@/components/home/HowItWorksSection'
import UseCasesSection from '@/components/home/UseCasesSection'
import PricingSection from '@/components/home/PricingSection'
import TestimonialsSection from '@/components/home/TestimonialsSection'
import Footer from '@/components/footer'
import Header from '@/components/header'

// 主页面组件
export default function HomePage() {
  return (
    <div className="lg:pt-[84px]">
      <Header />
      <div className='px-6 min-w-[320px] max-w-[1680px] m-auto lg:px-[80px] xl:px-[120px] mx-auto'>
        <HeroSection />
      </div>
      <WhySection />
      <HowItWorksSection />
      <UseCasesSection />
      <PricingSection />
      <TestimonialsSection />
      <div className="px-6 min-w-[320px] max-w-[1680px] m-auto lg:px-[80px] xl:px-[120px] mx-auto">
        <Footer />
      </div>
    </div>
  )
}