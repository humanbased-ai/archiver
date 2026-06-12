import React from 'react';
import Why1Image from '@/assets/home/why-1.svg'
import Why2Image from '@/assets/home/why-2.svg'
import Why3Image from '@/assets/home/why-3.svg'
import Why4Image from '@/assets/home/why-4.svg'
import Why5Image from '@/assets/home/why-5.svg'


interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className='border-l-[3px] border-primary pl-[40px]'>
    <div className='mb-8'>{icon}</div>
    <div className='text-xl font-semibold mb-3'>{title}</div>
    <p className='text-base leading-[28px] line-clamp-3 text-black/50'>{description}</p>
  </div>
  );
};

const WhySection: React.FC = () => {
  return (
    <section className="bg-white pt-[120px] pb-[160px] px-6 min-w-[320px] max-w-[1680px] m-auto lg:px-[80px] xl:px-[120px] mx-auto ">
      <div className="container mx-auto">
        <h2 className="text-[56px] font-bold text-center mb-[80px]">Why Codatta?</h2>
        <div className='grid grid-cols-1 gap-[60px] md:grid-cols-2 lg:grid-cols-3 mb-[80px]'>
          <FeatureCard icon={<img src={Why1Image} alt="" />} title="Real-World Frontier Data Access" description="For advanced AI, use new data sources. Train models on specific data, like IoT or global trends." />
          <FeatureCard icon={<img src={Why2Image} alt="" />} title="Hybrid Labeling: Speed Meets Precision" description="Automate 80% of labeling with AI, then refine with human expertise. Scale efficiently while maintaining 99%+ accuracy across text, images, video, and multimodal data." />
          <FeatureCard icon={<img src={Why3Image} alt="" />} title="RLHF & Fine-Tuning, Tailored to You" description="Custom workflows for reinforcement learning with human feedback (RLHF), fine-tuning, and edge-case handling. We adapt to your model’s unique needs." />
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-[60px] mb-[80px]'>
          <FeatureCard icon={<img src={Why4Image} alt="" />} title="Robust Evaluation & Benchmarking" description="Comb human-AI evaluations to measure performance, reduce bias, and validate real-world readiness." />
          <FeatureCard icon={<img src={Why5Image} alt="" />} title="Synthetic Data, Real Results" description="Generate lifelike synthetic data for sensitive or rare scenarios. Perfect for healthcare, robotics, or filling long-tail gaps." />
        </div>

        <div className='flex gap-[60px]'></div>
      </div>
    </section>
  );
};

export default WhySection;
