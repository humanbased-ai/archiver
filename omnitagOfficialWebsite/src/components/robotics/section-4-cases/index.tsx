// import Cases from "./cases";

export default function Page() {
  const handleClick = () => {
    window.location.href = "https://app.codatta.io/app/frontier/ROBSTIC001";
  };

  return (
    <div className="page mb-20 mt-[120px] lg:mb-[120px] lg:mt-[200px]">
      <h2 className="w-1/2 text-3xl font-extrabold lg:w-full lg:text-center lg:text-[56px] lg:leading-[68px] lg:tracking-tight">
        Case Study: RobotX Labs
      </h2>
      <p className="mt-2 text-base tracking-wide lg:text-center lg:tracking-normal">
        Anyone! From beginners to professionals, anyone can help innovate robotics.
      </p>
      <Cases />
      {/* <div className="mt-16 h-[500px] w-full rounded-[40px] bg-white"></div> */}
      <div className="mt-16 lg:flex lg:justify-between">
        <div>
          <h3 className="text-xl font-bold leading-6">Solution</h3>
          <p className="mt-4 text-base">
            codatta provided annotated data for behavior recognition and object handling.
          </p>
          <p className="mt-2 text-base">Enabled faster, cost-effective training for robotics AI.</p>
          <h3 className="mt-10 text-xl font-bold leading-6">Result</h3>
          <p className="mt-4 text-base">Published datasets will be accessible globally in early 2025.</p>
        </div>
        <div className="mt-10 lg:flex lg:flex-col lg:justify-end">
          <button className="cursor-pointer rounded-full bg-white px-6 py-3 text-sm text-black" onClick={handleClick}>
            View the Case Study
          </button>
        </div>
      </div>
    </div>
  );
}

function Cases() {
  const handleClick = () => {
    window.location.href = "https://app.codatta.io/app/frontier/ROBSTIC001";
  };

  return (
    <div className="mt-16 cursor-pointer" onClick={handleClick}>
      <div className="overflow-hidden rounded-2xl bg-white lg:hidden">
        <img src="https://static.codatta.io/static/images/robotics-case-study-m-202501091639.png" className="block" />
      </div>
      <img
        src="https://static.codatta.io/static/images/robotics-case-study-pc-202501091640.png"
        className="hidden lg:block"
      />
    </div>
  );
}
