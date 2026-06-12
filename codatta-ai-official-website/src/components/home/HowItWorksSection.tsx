import React from 'react';
import StepCardBg from '@/assets/home/step-card-bg.png'
import Step1 from '@/assets/home/step-1.svg'
import Step2 from '@/assets/home/step-2.svg'
import Step3 from '@/assets/home/step-3.svg'
import Step4 from '@/assets/home/step-4.svg'

type StepCardProps = {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  bgTransform?: string;
};
 /* warning: gradient uses a rotation that is not supported by CSS and may not behave as expected */;


const StepCard: React.FC<StepCardProps> = ({ number, title, description, icon, bgTransform }) => {
  return (
    <div className="bg-[#120C2E66] h-[280px] rounded-3xl border border-white/10 overflow-hidden relative" >
      <div style={{backgroundImage: `url(${StepCardBg})`, backgroundSize: '100% 100%', transform: bgTransform}} className="size-full"></div>
      <div className="flex items-start absolute top-0 pt-[60px] px-[48px] gap-9">
        <em className='text-[48px] text-white font-bold -mt-3'>{number}</em>
        <div>
          <div className='mb-6'>{icon}</div>
          <h3 className="text-2xl font-semibold text-white mb-3">{title}</h3>
          <p className="text-white text-base">{description}</p>
        </div>
      </div>
    </div>
  );
};


const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      title: "Integrate in Minutes",
      description: "Specify your AI requirements and objectives for human-centric data collection",
      icon: <img src={Step1} alt="icon1" />,
      bgTransform: "none"
    },
    {
      title: "Customize Workflows",
      description: "Verify data provenance without exposing sources.",
      icon: <img src={Step3} alt="icon2" />,
      bgTransform: "scaleX(-1)"
    },
    {
      title: "Collaborate in Real-Time",
      description: "Track progress, audit labels, and adjust guidelines instantly via our dashboard.",
      icon: <img src={Step2} alt="icon3" />,
      bgTransform: "scaleY(-1)"
    },
    {
      title: "Scale Effortlessly",
      description: "From 1,000 to 10 million samples - our infrastructure grows with you.",
      icon: <img src={Step4} alt="icon4" />,
      bgTransform: "rotate(180deg)"
    }
  ];

  return (
    <section className="bg-black rounded-t-[80px] pt-[120px] pb-[100px]">
      <div className='px-6 min-w-[320px] max-w-[1680px] m-auto w-full lg:px-[80px] xl:px-[120px]'>

        <h2 className="text-[56px] font-bold text-white text-center mb-[80px]">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step, index) => (
            <StepCard
            key={index}
            icon={step.icon}
            number={index + 1}
            title={step.title}
            description={step.description}
            bgTransform={step.bgTransform}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
