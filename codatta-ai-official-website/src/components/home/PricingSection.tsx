import React from 'react';

type PricingPlanProps = {
  title: string;
  price: string;
  period?: string;
  features: string[];
  ctaText: string;
  popular?: boolean;
};

const PricingPlan: React.FC<PricingPlanProps> = ({ 
  title, 
  price, 
  period, 
  features, 
  ctaText, 
  popular = false 
}) => {

  return (
    <div className={`border-2 ${popular ? 'border-primary' : 'border-gray-200'} bg-white text-black rounded-3xl p-[40px] relative overflow-hidden`}>
      {popular && (
        <div className="absolute top-0 right-0 bg-primary text-white text-xs px-4 py-2 rounded-bl-lg rounded-tr-lg">
          POPULAR
        </div>
      )}
      <h3 className="text-[32px] font-bold mb-8">{title}</h3>
      <div className="mb-5">
        <span className="text-[52px] font-bold">{price}</span>
        {period && <span className={`text-black/50 ml-3 text-[32px]`}>{period}</span>}
      </div>
      <a href="mailto:info@codatta.ai?subject=Subscribe" className={`w-full block bg-black text-center text-white py-3 rounded-lg text-xl mb-8`}>
        {ctaText}
      </a>
      <ul className="text-base flex flex-col gap-5">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <span className="mr-2 text-primary">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

    </div>
  );
};

const PricingSection: React.FC = () => {
  const pricingPlans = [
    {
      title: "Starter",
      price: "$0.10",
      period: "/ label",
      features: [
        "Basic annotation tools",
        "API access",
        "Community support"
      ],
      ctaText: "Subscribe",
      popular: false
    },
    // {
    //   title: "Pro",
    //   price: "$999",
    //   period: "/ month",
    //   features: [
    //     "Advanced annotation tools",
    //     "Priority API access",
    //     "Email support",
    //     "Custom workflows"
    //   ],
    //   ctaText: "Subscribe",
    //   popular: true
    // },
    {
      title: "Enterprise",
      price: "Custom",
      features: [
        "All Pro features",
        "Dedicated support",
        "Custom integrations",
        "SLA guarantees"
      ],
      ctaText: "Contact Us",
      popular: false
    }
  ];

  return (
    <section className="pt-[120px] pb-[160px] px-6 min-w-[320px] max-w-[1680px] m-auto lg:px-[80px] xl:px-[120px] mx-auto">
      <div className="mx-auto">
        <h2 className="text-[56px] font-bold text-center mb-12">Pricing</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:px-[10%]">
          {pricingPlans.map((plan, index) => (
            <PricingPlan
              key={index}
              title={plan.title}
              price={plan.price}
              period={plan.period}
              features={plan.features}
              ctaText={plan.ctaText}
              popular={plan.popular}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
