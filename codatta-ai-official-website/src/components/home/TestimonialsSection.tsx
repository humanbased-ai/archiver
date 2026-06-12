import TestimonialsBackground from "@/assets/home/testimonials-bg.png"
import TestimonialCardBg from "@/assets/home/testimonial-card-bg.png"

export default function TestimonialsSection () {

  return <section className="px-6 min-w-[320px] max-w-[1680px] m-auto lg:px-[80px] xl:px-[120px] mx-auto text-white pb-[160px]">
    <div style={{backgroundImage: `url(${TestimonialsBackground})`, backgroundSize: "cover", backgroundPosition: "center"}} className="rounded-[40px] p-[80px]">
      <h2 className="text-[56px] font-bold mb-10">Trusted By Innovators</h2>
      {/* <button className="bg-white text-black px-4 py-3 rounded-lg w-[200px]">View more</button> */}
      <div className="flex flex-col items-end text-black">
        <div className="p-10 rounded-2xl text-right mb-[60px]" style={{backgroundImage: `url(${TestimonialCardBg})`, backgroundSize: "cover", backgroundPosition: "center"}}>
          <em className="text-[24px] mb-5">“Codatta’s synthetic data tools helped us train models 3x faster.” </em>
          <p className="text-[20px]">AI Lead, Fortune 500 e-commerce Company</p>
        </div>
        <div className="p-10 rounded-2xl text-right" style={{backgroundImage: `url(${TestimonialCardBg})`, backgroundSize: "cover", backgroundPosition: "center"}}>
          <em className="text-[24px] mb-5">“Their RLHF pipeline reduced bias in our model by 40%.”</em>
          <p className="text-[20px]">CTO, Embodied Intelligence AI Startup</p>
        </div>
      </div>
    </div>
  </section>
}