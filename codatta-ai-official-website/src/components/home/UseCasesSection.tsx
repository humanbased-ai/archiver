import React from 'react';
import DemoImage from "@/assets/home/demo.jpg";
import DemoImage2 from "@/assets/home/demo-2.png";

const UseCasesSection: React.FC = () => {
  return (
    <section className="bg-black pt-[100px] pb-[120px] rounded-b-[40px]">
      <div className='px-6 min-w-[320px] max-w-[1680px] m-auto lg:px-[80px] xl:px-[120px] mx-auto'>

      <div className="container mx-auto px-4">
        <h2 className="text-[56px] font-bold text-white text-center mb-[80px]">Use Cases</h2>
        <div className="bg-white rounded-[40px] p-[80px] mb-[80px]">
          <img src={DemoImage} className="mb-10" alt="" />
          <img src={DemoImage2} alt="" />
        </div>
        <div className='text-white flex'>
          <div className='flex-1'>
            <div className='mb-10'>

          <h3 className='text-xl font-bold mb-4'>Solution</h3>
          <p className='mb-2'>codatta provided annotated data for behavior recognition and object handling.</p>
          <p>Enabled faster, cost-effective training for robotics AI.</p>
            </div>
          <h3 className='text-xl font-bold mb-4'>Result</h3>
          <p>Published datasets will be accessible globally in early 2025.</p>
          </div>
          <div className='shrink-0 flex items-end'>
            {/* <button className='bg-white text-black px-4 py-2 rounded-full'>View Case Study</button> */}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
};

export default UseCasesSection;
