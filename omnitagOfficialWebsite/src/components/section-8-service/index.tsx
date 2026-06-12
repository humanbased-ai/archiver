import { cn } from '@udecode/cn'

import Button from "../button";

export default function Section({ className }: { className?: string }) {
  return (
    <div className={cn(className)}>
      <Mobile />
      <PC />
    </div>
  );
}

function Mobile() {
  const onClick = () => {
    window.open("https://app.codatta.io", "_blank");
  };

  return (
    <div
      className={cn(
        "bg-center bg-cover aspect-[342/480] flex flex-col justify-between p-8 bg-[url(https://static.codatta.io/static/official/service-bg.jpg)] lg:hidden overflow-hidden"
      )}
    >
      <div className="text-white">
        <h2 className="font-extrabold text-[40px] leading-[60px]">
          Immediately Start Service
        </h2>
        <p className="mt-4 text-base tracking-wide">
          Start your free trial now and experience a new era of seamless,
          data-driven success.
        </p>
      </div>
      <div>
        <Button isLight={true} hasArrow={true} onClick={onClick}>
          Start Contribution
        </Button>
      </div>
    </div>
  );
}
function PC() {
  const onClick = () => {
    window.open("https://app.codatta.io", "_blank");
  };

  return (
    <div className="bg-center bg-cover aspect-[1488/800] bg-[url(https://static.codatta.io/static/official/pc-service-bg-1.jpg)] rounded-[40px] overflow-hidden pt-[100px] hidden lg:flex justify-between mr--[2px] border-solid border-[1px]">
      <div className="px-[100px]">
        <div className="text-white">
          <h2 className="font-bold text-[56px] leading-[68px] tracking-tight">
            Immediately Start Service
          </h2>
          <p className="text-base tracking-wide mt-2">
            Start your free trial now and experience a new era of seamless,
            data-driven success.
          </p>
        </div>
        <div className="mt-[64px]">
          <Button isLight={true} hasArrow={true} onClick={onClick}>
            Start Contribution
          </Button>
        </div>
      </div>
      <div className="aspect-[216/175]">
        <img
          src="https://static.codatta.io/static/official/pc-service-bg-2.jpg"
          className="rounded-tl-[40px]"
        />
      </div>
    </div>
  );
}
