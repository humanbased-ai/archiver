import { Fragment } from "react/jsx-runtime";
import img from "@/assets/robotics/achievements.jpg";

const data: { num: string; des: string }[] = [
  { num: "10,000", des: "Over 10,000 foundational datasets collected and validated." },
  { num: "20", des: "Enabled training of over 20 robotics AI agents." },
  { num: "60,000", des: "Engaged 60,000+ contributors globally." },
];

export default function Page() {
  return (
    <div className="page">
      <div
        className="mt-20 rounded-3xl bg-black bg-contain bg-right bg-no-repeat p-6 text-white lg:p-[60px] lg:text-[#999999]"
        style={{ backgroundImage: `url(${img})` }}
      >
        <h2 className="text-3xl font-extrabold text-white lg:text-[56px] lg:leading-[68px] lg:tracking-tight">
          Key Achievements
        </h2>
        <p className="mt-2 text-base tracking-wide lg:font-medium">
          Anyone! From beginners to professionals, anyone can help innovate robotics.
        </p>
        <ul className="mt-[153px] text-base font-semibold lg:mt-[228px] lg:flex lg:items-center lg:justify-between lg:gap-[50px]">
          {data.map((item, index) => (
            <Fragment key={item.des + index}>
              <li className="text-white">
                <div className="hidden text-[40px] font-bold leading-[48px] lg:block">{item.num}</div>
                <div className="lg:mt-4 lg:font-medium lg:text-[#999999]">{item.des}</div>
              </li>
              {index !== data.length - 1 && (
                <li className="my-6 h-[2px] bg-white opacity-40 lg:h-[80px] lg:w-[2px]"></li>
              )}
            </Fragment>
          ))}
        </ul>
      </div>
    </div>
  );
}
